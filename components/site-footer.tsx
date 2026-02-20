import Link from 'next/link';

export function SiteFooter() {
    return (
        <footer className="mt-8 text-center pb-8 border-t border-[var(--border)] pt-8">
            <p className="text-xs text-[var(--muted)] mb-4">
                ※本サービスは予測に基づく参考情報です。<br />
                実際の運行状況は必ずJR北海道公式サイトをご確認ください。
            </p>

            <div className="mt-8 text-xs text-[var(--muted)] opacity-80 space-y-2">
                <div>
                    <p>運営: 株式会社アンドアール</p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 my-2">
                        <Link href="/terms" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted" aria-label="利用規約を確認する">利用規約</Link>
                        <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted" aria-label="プライバシーポリシーを確認する">プライバシーポリシー</Link>
                        <Link href="/legal-notation" className="text-[var(--foreground)] font-medium hover:text-[var(--primary)] transition-colors underline decoration-double" aria-label="特定商取引法に基づく表記を確認する">特定商取引法に基づく表記</Link>
                    </div>
                    <a href="mailto:info@andr.ltd" className="hover:text-[var(--primary)] transition-colors block mt-2">
                        お問い合わせ: info@andr.ltd
                    </a>
                </div>
                <div className="pt-4">
                    <p className="mb-0.5 text-[10px]">天気データ: Open-Meteo API</p>
                    <p className="mb-2 text-[10px] opacity-60">※本サイトはアフィリエイト広告（楽天トラベル等）を利用しています</p>
                    <p className="font-en text-[10px]">&copy; 2026 運休北海道 - Unkyu Hokkaido AI <span className="opacity-50 ml-1">v7.4</span></p>
                </div>
            </div>
        </footer>
    );
}
