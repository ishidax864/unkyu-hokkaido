'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // エラーをログ（本番ではSentryなどに送信）
        logger.error('Application error:', error);
    }, [error]);

    return (
        <main className="min-h-screen bg-[var(--background-secondary)] flex items-center justify-center p-4">
            <div className="card p-8 max-w-md text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-[var(--status-suspended)]" />
                </div>
                <h1 className="text-xl font-bold mb-2">エラーが発生しました</h1>
                <p className="text-sm text-[var(--muted)] mb-6">
                    申し訳ございません。予期せぬエラーが発生しました。<br />
                    しばらく時間をおいて再度お試しください。
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        再試行
                    </button>
                    <a
                        href="/"
                        className="px-4 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-[var(--background-secondary)] flex items-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        トップへ
                    </a>
                </div>
                {error.digest && (
                    <p className="mt-4 text-xs text-[var(--muted)]">
                        エラーID: {error.digest}
                    </p>
                )}
            </div>
        </main>
    );
}
