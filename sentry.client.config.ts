// Sentry Client SDK — 遅延初期化
// 初回描画後にロードして初期バンドルサイズを削減
if (typeof window !== 'undefined') {
    // requestIdleCallback で初回レンダリング後に初期化
    const initSentry = () => {
        import('@sentry/nextjs').then((Sentry) => {
            Sentry.init({
                dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

                // Performance monitoring
                tracesSampleRate: 0.1,

                // Session replay
                replaysSessionSampleRate: 0,
                replaysOnErrorSampleRate: 1.0,

                // Environment
                environment: process.env.NODE_ENV || 'development',

                // Ignore common browser errors
                ignoreErrors: [
                    'ResizeObserver loop limit exceeded',
                    'Non-Error promise rejection captured',
                ],

                // Filter out local/development URLs
                beforeSend(event) {
                    if (event.request?.url?.includes('localhost')) {
                        return null;
                    }
                    return event;
                },
            });
        });
    };

    if ('requestIdleCallback' in window) {
        (window as Window).requestIdleCallback(initSentry, { timeout: 5000 });
    } else {
        setTimeout(initSentry, 3000);
    }
}
