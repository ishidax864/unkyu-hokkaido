import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Ignore errors from development
    beforeSend(event) {
        if (process.env.NODE_ENV !== 'production') {
            return null;
        }
        return event;
    },

    // Add custom context
    initialScope: {
        tags: {
            runtime: 'node',
        },
    },
});
