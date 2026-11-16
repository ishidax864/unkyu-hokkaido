import { ArrowRightLeft, BedDouble, Coffee, Footprints, Hourglass, RefreshCw, ShieldAlert, Signpost } from 'lucide-react';
import type { Advice, ActionKind } from '@/lib/engine/advice';

const ICON: Record<ActionKind, typeof Coffee> = {
    go: Footprints, 'check-again': RefreshCw, prepare: ShieldAlert, 'wait-here': Hourglass,
    'wait-nearby': Coffee, switch: ArrowRightLeft, stay: BedDouble, decide: Signpost,
};

/** おすすめの行動(待つ / 暖かい場所で待つ / 別の手段 / 泊まる) */
export function AdviceCard({ advice }: { advice: Advice }) {
    const Icon = ICON[advice.action];
    return <section aria-labelledby="advice-title" className="mt-4 flex gap-4 rounded-2xl border-2 border-brand bg-surface p-5 shadow-card">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-on-brand"><Icon size={24} /></span>
        <div className="min-w-0">
            <p className="text-sm font-bold text-brand">おすすめの行動</p>
            <h2 id="advice-title" className="text-xl font-bold leading-snug">{advice.title}</h2>
            <p className="mt-1 text-[16px] leading-relaxed text-ink-2">{advice.message}</p>
        </div>
    </section>;
}
