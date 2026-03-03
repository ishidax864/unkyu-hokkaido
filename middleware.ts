import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

// タイミング攻撃対策: 定数時間で文字列比較（Edge Runtime対応）
function safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        // 長さが違っても定数時間で処理（ダミー比較）
        let result = 1; // not equal
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ a.charCodeAt(i); // dummy op
        }
        return result === 0; // always false
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// =====================
// レート制限設定
// =====================

const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '60', 10);
const MAX_RATE_LIMIT_ENTRIES = 10000; // メモリリーク防止
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
        // メモリ上限超過時は古いエントリを削除
        if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
            const oldest = rateLimitMap.keys().next().value;
            if (oldest) rateLimitMap.delete(oldest);
        }
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
// 使用量カウンター & アラート
// =====================

const USAGE_WINDOW = 5 * 60 * 1000; // 5分ウィンドウ
const ALERT_THRESHOLD_REQUESTS = parseInt(process.env.USAGE_ALERT_REQUESTS || '300', 10); // 5分で300リクエスト
const ALERT_THRESHOLD_UNIQUE_IPS = parseInt(process.env.USAGE_ALERT_UNIQUE_IPS || '50', 10); // 1時間で50ユニークIP

interface UsageWindow {
    requests: number;
    uniqueIPs: Set<string>;
    windowStart: number;
    alertSent: boolean;
}

let currentUsage: UsageWindow = {
    requests: 0,
    uniqueIPs: new Set(),
    windowStart: Date.now(),
    alertSent: false,
};

// 1時間ごとのユニークIP追跡
let hourlyIPs: { ips: Set<string>; hourStart: number; alertSent: boolean } = {
    ips: new Set(),
    hourStart: Date.now(),
    alertSent: false,
};

function trackUsage(ip: string): { nearCapacity: boolean } {
    const now = Date.now();

    // 5分ウィンドウリセット
    if (now - currentUsage.windowStart > USAGE_WINDOW) {
        currentUsage = {
            requests: 0,
            uniqueIPs: new Set(),
            windowStart: now,
            alertSent: false,
        };
    }

    // 1時間ウィンドウリセット
    if (now - hourlyIPs.hourStart > 60 * 60 * 1000) {
        hourlyIPs = { ips: new Set(), hourStart: now, alertSent: false };
    }

    currentUsage.requests++;
    currentUsage.uniqueIPs.add(ip);
    hourlyIPs.ips.add(ip);

    const nearCapacity = currentUsage.requests > ALERT_THRESHOLD_REQUESTS * 0.8;

    // 閾値超過アラート（5分あたりリクエスト数）
    if (currentUsage.requests >= ALERT_THRESHOLD_REQUESTS && !currentUsage.alertSent) {
        currentUsage.alertSent = true;
        logger.warn(`⚠️ USAGE ALERT: ${currentUsage.requests} requests in 5min (threshold: ${ALERT_THRESHOLD_REQUESTS}). Unique IPs: ${currentUsage.uniqueIPs.size}. Consider upgrading to Vercel Pro.`);
    }

    // 閾値超過アラート（1時間あたりユニークIP）
    if (hourlyIPs.ips.size >= ALERT_THRESHOLD_UNIQUE_IPS && !hourlyIPs.alertSent) {
        hourlyIPs.alertSent = true;
        logger.warn(`⚠️ USER GROWTH ALERT: ${hourlyIPs.ips.size} unique users in 1 hour (threshold: ${ALERT_THRESHOLD_UNIQUE_IPS}). Consider upgrading to Vercel Pro.`);
    }

    return { nearCapacity };
}

/** 使用量メトリクスを取得 */
export function getUsageMetrics() {
    return {
        window5min: {
            requests: currentUsage.requests,
            uniqueIPs: currentUsage.uniqueIPs.size,
            thresholdRequests: ALERT_THRESHOLD_REQUESTS,
            alertSent: currentUsage.alertSent,
        },
        hourly: {
            uniqueIPs: hourlyIPs.ips.size,
            thresholdUniqueIPs: ALERT_THRESHOLD_UNIQUE_IPS,
            alertSent: hourlyIPs.alertSent,
        },
    };
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

    // Admin routes protection
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

            const adminUser = process.env.ADMIN_USER;
            const adminPass = process.env.ADMIN_PASSWORD;

            // 環境変数未設定の場合はアクセス拒否
            if (!adminUser || !adminPass) {
                return new NextResponse('Admin credentials not configured', { status: 503 });
            }

            if (!safeCompare(user, adminUser) || !safeCompare(pwd, adminPass)) {
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
        logger.warn(`Suspicious request blocked from ${ip}: ${request.nextUrl.pathname}`);
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

        // 使用量追跡 & アラート
        const { nearCapacity } = trackUsage(ip);
        if (nearCapacity) {
            response.headers.set('X-Usage-Alert', 'near-capacity');
        }

        // レート制限ヘッダーを追加
        response.headers.set('X-RateLimit-Limit', MAX_REQUESTS.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());

        if (limited) {
            logger.warn(`Rate limit exceeded for ${ip}`);
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
