import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session replay (optional, be mindful of privacy)
    replaysSessionSampleRate: 0, // Disabled by default
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

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
