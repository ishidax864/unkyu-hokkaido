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
                        <Link href="/accuracy" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted" aria-label="予測精度について確認する">予測精度について</Link>
                        <Link href="/faq" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted" aria-label="よくある質問を見る">よくある質問</Link>
                        <Link href="/onboarding" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted" aria-label="使い方ガイドを見る">使い方ガイド</Link>
                        <Link href="/terms" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted" aria-label="利用規約を確認する">利用規約</Link>
                        <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted" aria-label="プライバシーポリシーを確認する">プライバシーポリシー</Link>
                        <Link href="/legal-notation" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted" aria-label="特定商取引法に基づく表記を確認する">特定商取引法に基づく表記</Link>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 my-2 text-[11px]">
                        <span className="text-[var(--muted)] opacity-60">路線別:</span>
                        <Link href="/route/jr-hokkaido.chitose" className="hover:text-[var(--primary)] transition-colors">千歳線</Link>
                        <Link href="/route/jr-hokkaido.hakodate-main" className="hover:text-[var(--primary)] transition-colors">函館本線</Link>
                        <Link href="/route/jr-hokkaido.soya-main" className="hover:text-[var(--primary)] transition-colors">宗谷本線</Link>
                        <Link href="/route/jr-hokkaido.sekisho" className="hover:text-[var(--primary)] transition-colors">石勝線</Link>
                        <Link href="/route/jr-hokkaido.muroran-main" className="hover:text-[var(--primary)] transition-colors">室蘭本線</Link>
                    </div>
                    <a href="mailto:info@andr.ltd" className="hover:text-[var(--primary)] transition-colors block mt-2">
                        お問い合わせ: info@andr.ltd
                    </a>
                </div>
                <div className="pt-4">
                    <p className="mb-0.5 text-[11px]">天気データ: Open-Meteo API</p>
                    <p className="mb-1 text-[11px] opacity-60">※本サイトは広告を含みます。提携リンク経由のご利用で当サイトに収益が発生する場合があります。</p>
                    <p className="mb-2 text-[11px] opacity-50">※JR北海道は北海道旅客鉄道株式会社の登録商標です。当サービスはJR北海道とは無関係の第三者サービスです。</p>
                    <p className="font-en text-[11px]">&copy; 2026 運休北海道 - Unkyu Hokkaido AI <span className="opacity-50 ml-1">v7.4</span></p>
                </div>
            </div>
        </footer>
    );
}
