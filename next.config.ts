import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // セキュリティヘッダー（強化版）
    async headers() {
        // Supabase URLを動的に取得
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : '';

        return [
            {
                source: '/(.*)',
                headers: [
                    // XSS対策（レガシーブラウザ用）
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    // クリックジャッキング対策
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    // MIMEスニッフィング対策
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    // DNS Prefetch制御
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    // リファラーポリシー
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    // パーミッションポリシー（厳格化）
                    {
                        key: 'Permissions-Policy',
                        value: [
                            'camera=()',
                            'microphone=()',
                            'geolocation=(self)',
                            'payment=()',
                            'usb=()',
                            'magnetometer=()',
                            'gyroscope=()',
                            'accelerometer=()',
                        ].join(', '),
                    },
                    // Content Security Policy（厳格化）
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            // スクリプト：nonce使用を推奨（将来的に）
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            "img-src 'self' data: https:",
                            // 接続先を明示的に指定
                            supabaseHost
                                ? `connect-src 'self' https://api.open-meteo.com https://${supabaseHost} https://www.google-analytics.com`
                                : "connect-src 'self' https://api.open-meteo.com https://www.google-analytics.com",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                            "object-src 'none'",
                            "upgrade-insecure-requests",
                        ].join('; '),
                    },
                    // HTTPS強制（HSTSプリロード対応）
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                ],
            },
        ];
    },

    // 画像最適化
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },

    // 本番ビルド最適化
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },

    // 出力設定
    output: 'standalone',

    // サーバーサイド外部パッケージ
    serverExternalPackages: ['onnxruntime-node'],

    // 実験的機能
    experimental: {},
};

export default nextConfig;
