import { Clock3 } from 'lucide-react';
import type { RecoveryView } from '@/lib/engine/recovery';

const clock = (iso: string) => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const span = (m: number) => m < 60 ? `${m}分` : m % 60 === 0 ? `${m / 60}時間` : `${Math.floor(m / 60)}時間${m % 60}分`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** 「いつ動くか」: JR発表 > 終日運休 > 過去事例の実績(件数つき) > 不明 */
export function RecoveryPanel({ recovery }: { recovery: RecoveryView }) {
    const r = recovery;
    return <div className="rounded-xl bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-3"><Clock3 size={16} aria-hidden />いつ動く？</h3>
            {r.onsetAt && r.elapsedMinutes != null && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-sm text-ink-2 tabular">{clock(r.onsetAt)}ごろ発生・{span(Math.max(5, Math.round(r.elapsedMinutes / 5) * 5))}経過</span>}
        </div>
        {r.kind === 'official' && r.officialAt
            ? <p className="mt-1"><span className="text-4xl font-bold tabular">{clock(r.officialAt)}</span> <span className="text-lg font-bold">ごろ再開見込み</span><span className="ml-2 rounded bg-brand-soft px-1.5 py-0.5 text-sm font-bold text-brand-strong">JR発表</span></p>
            : r.kind === 'empirical' && r.remaining?.median != null
                ? <p className="mt-1"><span className="text-lg font-bold">あと</span> <span className="text-4xl font-bold tabular">{span(r.remaining.median)}</span> <span className="text-lg font-bold">前後</span><span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-sm font-bold text-ink-2">過去{r.sample?.n}件の実績</span></p>
                : <p className="mt-1 text-xl font-bold">{r.headline}</p>}
        {r.kind === 'empirical' && r.sample && <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {([['30分以内', r.sample.within.m30], ['1時間以内', r.sample.within.h1], ['2時間以内', r.sample.within.h2]] as const).map(([label, v]) => <div key={label} className="rounded-lg bg-surface-2 px-2 py-2">
                <dt className="text-sm text-ink-3">あと{label}</dt><dd className="text-lg font-bold tabular">{pct(v)}</dd></div>)}
        </dl>}
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{r.detail}</p>
        {r.causeLabel && r.kind !== 'empirical' && <p className="mt-1 text-sm text-ink-3">原因（JR発表から分類）: {r.causeLabel}</p>}
    </div>;
}
