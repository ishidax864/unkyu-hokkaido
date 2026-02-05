import Link from 'next/link';
import { Train, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
    return (
        <main className="min-h-screen bg-[var(--background-secondary)]">
            {/* ヘッダー */}
            <header className="bg-[var(--primary)] text-white px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center gap-2">
                    <Train className="w-5 h-5" />
                    <h1 className="text-lg font-bold">運休AI</h1>
                </div>
            </header>

            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <div className="text-8xl mb-4">🚃</div>
                <h1 className="text-4xl font-bold mb-2">404</h1>
                <p className="text-xl text-[var(--muted)] mb-6">ページが見つかりません</p>
                <p className="text-sm text-[var(--muted)] mb-8">
                    お探しのページは移動または削除された可能性があります。
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="btn-primary py-3 px-6 flex items-center justify-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        運休予測を始める
                    </Link>
                    <Link
                        href="/"
                        className="px-6 py-3 border border-[var(--border)] rounded-md hover:bg-white flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        トップへ戻る
                    </Link>
                </div>
            </div>
        </main>
    );
}
