import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// =====================
// レート制限設定
// =====================

const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '60', 10);
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

// =====================
// IP取得（プロキシ対応）
// =====================

function getClientIP(request: NextRequest): string {
    // Cloudflare
    const cfIP = request.headers.get('cf-connecting-ip');
    if (cfIP) return cfIP;

    // Vercel / 一般的なプロキシ
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    // X-Real-IP
    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP;

    return 'unknown';
}

// =====================
// レート制限チェック
// =====================

function isRateLimited(key: string): { limited: boolean; remaining: number } {
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record) {
        rateLimitMap.set(key, { count: 1, timestamp: now });
        return { limited: false, remaining: MAX_REQUESTS - 1 };
    }

    if (now - record.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(key, { count: 1, timestamp: now });
        return { limited: false, remaining: MAX_REQUESTS - 1 };
    }

    record.count++;
    const remaining = Math.max(0, MAX_REQUESTS - record.count);

    return { limited: record.count > MAX_REQUESTS, remaining };
}

// =====================
// 定期クリーンアップ
// =====================

if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of rateLimitMap.entries()) {
            if (now - value.timestamp > RATE_LIMIT_WINDOW * 2) {
                rateLimitMap.delete(key);
            }
        }
    }, RATE_LIMIT_WINDOW);
}

// =====================
// 不審なパターン検出
// =====================

const SUSPICIOUS_PATTERNS = [
    /\.\.\//, // パストラバーサル
    /<script/i, // XSS
    /javascript:/i, // XSS
    /\bon\w+=/i, // イベントハンドラ
    /union.*select/i, // SQLインジェクション
    /;.*--/, // SQLコメント
];

function isSuspiciousRequest(request: NextRequest): boolean {
    const url = request.nextUrl.pathname + request.nextUrl.search;

    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(url)) {
            return true;
        }
    }

    return false;
}

// =====================
// メイン処理
// =====================

export function middleware(request: NextRequest) {
    const url = request.nextUrl;

    // 🆕 Admin routes protection
    if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return new NextResponse('Authentication required', {
                status: 401,
                headers: { 'WWW-Authenticate': 'Basic realm="Admin Access"' },
            });
        }

        try {
            const authValue = authHeader.split(' ')[1];
            const [user, pwd] = atob(authValue).split(':');

            const adminUser = process.env.ADMIN_USER || 'admin';
            const adminPass = process.env.ADMIN_PASSWORD || 'unkyu-ai-2026';

            if (user !== adminUser || pwd !== adminPass) {
                return new NextResponse('Unauthorized', {
                    status: 401,
                    headers: { 'WWW-Authenticate': 'Basic realm="Admin Access"' },
                });
            }
        } catch (_e) {
            return new NextResponse('Bad Request', { status: 400 });
        }
    }

    const response = NextResponse.next();
    const ip = getClientIP(request);

    // 不審なリクエストをブロック
    if (isSuspiciousRequest(request)) {
        console.warn(`[SECURITY] Suspicious request blocked from ${ip}: ${request.nextUrl.pathname}`);
        return new NextResponse(
            JSON.stringify({ error: 'Bad Request' }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }

    // APIルートにレート制限を適用
    if (request.nextUrl.pathname.startsWith('/api/')) {
        const { limited, remaining } = isRateLimited(ip);

        // レート制限ヘッダーを追加
        response.headers.set('X-RateLimit-Limit', MAX_REQUESTS.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());

        if (limited) {
            console.warn(`[RATELIMIT] Rate limit exceeded for ${ip}`);
            return new NextResponse(
                JSON.stringify({ error: 'Too many requests. Please try again later.' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': '60',
                        'X-RateLimit-Limit': MAX_REQUESTS.toString(),
                        'X-RateLimit-Remaining': '0',
                    },
                }
            );
        }
    }

    // セキュリティヘッダー
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/api/admin/:path*',
        // 静的ファイル・ヘルスチェック以外に適用
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/health).*)',
    ],
};
