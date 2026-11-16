import Link from 'next/link';
import { TrainFront, ArrowUpRight } from 'lucide-react';

/** 独自のマーク(JR北海道のロゴ・意匠は使わない) */
export function BrandMark({ className = '' }: { className?: string }) {
    return <span aria-hidden className={`grid size-9 place-items-center rounded-xl bg-brand text-on-brand ${className}`}><TrainFront size={20} strokeWidth={2.4} /></span>;
}

export function SiteHeader() {
    return <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="flex min-h-11 items-center gap-2.5" aria-label="運休北海道 ホーム">
                <BrandMark />
                <span className="leading-tight"><span className="block text-lg font-bold">運休北海道</span><span className="block text-[13px] text-ink-3">JR北海道の運行・気象リスク</span></span>
            </Link>
            <nav aria-label="メイン" className="flex items-center gap-1 text-[15px] font-bold">
                <Link href="/accuracy" className="hidden min-h-11 items-center rounded-lg px-3 text-ink-2 hover:bg-surface-2 sm:flex">予測について</Link>
                <a href="https://www3.jrhokkaido.co.jp/webunkou/" target="_blank" rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-1 rounded-lg px-3 text-ink-2 hover:bg-surface-2">JR公式<ArrowUpRight size={15} aria-hidden /></a>
            </nav>
        </div>
    </header>;
}
