import Link from 'next/link';
import { BrandMark } from '@/components/site-header';

export function SiteFooter() {
    return <footer className="mt-12 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6">
            <div>
                <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 font-bold" aria-label="運休北海道 ホーム"><BrandMark className="size-8" />運休北海道</Link>
                <p className="mt-2 max-w-md text-sm text-ink-3">JR北海道とは独立した非公式サービスです。運行・再開の判断は、必ずJR北海道の公式情報と駅の案内をご確認ください。</p>
                <p className="mt-2 text-sm text-ink-3">運営: 株式会社アンドアール ・ <a href="mailto:info@andr.ltd" className="underline">お問い合わせ</a></p>
            </div>
            <nav aria-label="サイト情報" className="grid grid-cols-2 gap-x-8 text-[15px]">
                <Link href="/accuracy" className="flex min-h-11 items-center text-ink-2 hover:underline">予測について</Link>
                <Link href="/faq" className="flex min-h-11 items-center text-ink-2 hover:underline">使い方・FAQ</Link>
                <Link href="/terms" className="flex min-h-11 items-center text-ink-2 hover:underline">利用規約</Link>
                <Link href="/privacy" className="flex min-h-11 items-center text-ink-2 hover:underline">プライバシー</Link>
                <Link href="/legal-notation" className="flex min-h-11 items-center text-ink-2 hover:underline">特定商取引法の表記</Link>
            </nav>
        </div>
        <p className="border-t border-line py-4 text-center text-sm text-ink-3">© {new Date().getFullYear()} 運休北海道 ・ 気象データ: Open-Meteo / 気象庁</p>
    </footer>;
}
