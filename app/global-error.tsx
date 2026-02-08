'use client';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.error('Global runtime error', error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                    <h2 className="text-xl font-bold mb-4">致命的なエラーが発生しました</h2>
                    <p className="mb-4">ご不便をおかけして申し訳ありません。</p>
                    <button
                        onClick={() => reset()}
                        className="px-4 py-2 bg-black text-white rounded"
                    >
                        再読み込み
                    </button>
                </div>
            </body>
        </html>
    );
}
