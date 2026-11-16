import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, CloudSnow, Search, Wind, Megaphone } from 'lucide-react';
import { getLineDetail } from '@/lib/engine/line';
import { LINE_BY_SLUG } from '@/lib/registry/lines';
import { OFFICIAL_LABELS, UNKNOWN_REASON_LABELS } from '@/lib/engine/status';
import { OfficialPill, RiskPill } from '@/components/ui/status-pill';
import { RecoveryPanel } from '@/components/recovery-panel';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const line = LINE_BY_SLUG.get((await params).slug);
    return line ? { title: `${line.name}${line.note ? `（${line.note}）` : ''}の運行状況・気象リスク`, description: `${line.name}のJR発表の運行状況、今日・明日・7日間の気象リスク、運休時の復旧の見通し。` } : {};
}

const clock = (iso: string | null | undefined) => iso
    ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';
const dayLabel = (date: string, i: number) => i === 0 ? '今日' : i === 1 ? '明日'
    : new Intl.DateTimeFormat('ja-JP', { timeZone: 'UTC', month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T00:00:00Z`));

export default async function LinePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (!LINE_BY_SLUG.has(slug)) notFound();
    const detail = await getLineDetail(slug).catch(() => null);
    if (!detail) return <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><p className="text-lg font-bold">運行情報を取得できませんでした。</p><a className="underline" href="https://www3.jrhokkaido.co.jp/webunkou/">JR公式の運行情報</a>をご確認ください。</main>;
    const { line, hourly, daily, recovery } = detail;
    const today = line.today;
    const disrupted = today.state === 'disrupted';
    return <main id="main" className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 font-bold text-brand"><ArrowLeft size={18} aria-hidden />全路線</Link>

        <header className="mt-2">
            <p className="text-sm font-bold text-ink-3">{line.region}</p>
            <h1 className="text-3xl font-bold">{line.name}</h1>
            {line.note && <p className="mt-1 text-ink-2">{line.note}</p>}
        </header>

        {/* いま(JR発表) */}
        <section aria-labelledby="now-title" className={`mt-5 rounded-2xl p-5 ${disrupted ? 'bg-stop-soft' : today.state === 'unknown' ? 'bg-unknown-soft' : 'bg-surface shadow-card border border-line'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="now-title" className="text-sm font-bold text-ink-3">いまの運行（JR発表 {clock(today.publishedAt)}）</h2>
                <a href="https://www3.jrhokkaido.co.jp/webunkou/" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1 text-sm font-bold text-ink-2 hover:underline">JR公式<ArrowUpRight size={14} aria-hidden /></a>
            </div>
            <div className="mt-1"><OfficialPill state={today.state} size="lg" /></div>
            <p className="mt-2 text-[17px] font-bold">{today.state === 'unknown' ? UNKNOWN_REASON_LABELS[today.reason ?? 'missing'] : OFFICIAL_LABELS[today.state]}</p>

            {disrupted && recovery && <div className="mt-4"><RecoveryPanel recovery={recovery} /></div>}

            {today.notices.length > 0 && <div className="mt-4 space-y-3">
                {today.notices.map(n => <article key={n.title + n.body} className="rounded-xl bg-surface p-4">
                    <h3 className="flex items-start gap-1.5 font-bold"><Megaphone size={17} className="mt-1 shrink-0 text-ink-3" aria-hidden />{n.title || 'お知らせ'}{n.areaWide && <span className="ml-1 shrink-0 rounded bg-surface-2 px-1.5 text-sm font-normal">エリア全体</span>}</h3>
                    <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{n.body}</p>
                    {n.publishedAt && <p className="mt-1 text-sm text-ink-3">{clock(n.publishedAt)} 現在</p>}
                </article>)}
            </div>}
        </section>

        {/* 明日(JR発表) */}
        <section aria-labelledby="tomorrow-title" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card">
            <h2 id="tomorrow-title" className="font-bold">明日の運行（JR発表）</h2>
            <span className="flex items-center gap-2"><OfficialPill state={line.tomorrow.state} label={line.tomorrow.state === 'disrupted' ? '運休予定あり' : undefined} />
                <span className="text-sm text-ink-3">{line.tomorrow.state === 'unknown' ? UNKNOWN_REASON_LABELS[line.tomorrow.reason ?? 'missing'] : ''}</span></span>
            {line.tomorrow.notices.filter(n => !n.areaWide).map(n => <p key={n.body} className="w-full whitespace-pre-line text-[15px] text-ink-2">{n.title && <b className="block">{n.title}</b>}{n.body}</p>)}
        </section>

        {/* 気象リスク */}
        {hourly.length > 0 && <section aria-labelledby="hourly-title" className="mt-8">
            <h2 id="hourly-title" className="text-lg font-bold">これから24時間の気象リスク</h2>
            <p className="mt-1 text-sm text-ink-3">沿線{line.slug === 'express' ? '' : `（${(LINE_BY_SLUG.get(slug)?.weatherPoints ?? []).map(p => p.name).join('・')}）`}の予報から、過去に運休が起きやすかった条件かを示す参考値です。</p>
            <ol className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" aria-label="時間ごとの気象リスク">
                {hourly.map((h, i) => <li key={h.date + h.time} className={`flex w-[5.25rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center ${i === 0 ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}>
                    <span className="text-sm font-bold tabular">{i === 0 ? 'いま' : `${Number(h.time.slice(0, 2))}時`}</span>
                    <RiskPill level={h.level} />
                    {h.weather && <span className="text-sm leading-tight text-ink-2 tabular"><span className="flex items-center justify-center gap-0.5"><Wind size={13} aria-hidden />{h.weather.windSpeed.toFixed(0)}<small>m/s</small></span>
                        {(h.weather.snowfall ?? 0) > 0 && <span className="flex items-center justify-center gap-0.5"><CloudSnow size={13} aria-hidden />{h.weather.snowfall!.toFixed(1)}<small>cm</small></span>}</span>}
                </li>)}
            </ol>
        </section>}

        {daily.length > 0 && <section aria-labelledby="daily-title" className="mt-6">
            <h2 id="daily-title" className="text-lg font-bold">7日間の見通し</h2>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                {daily.map((d, i) => <li key={d.date} className="grid grid-cols-[4.5rem_auto_1fr] items-center gap-3 px-4 py-3">
                    <span className="font-bold">{dayLabel(d.date, i)}</span>
                    <RiskPill level={d.level} />
                    <span className="min-w-0 truncate text-sm text-ink-3">{d.peakAt ? `${Number(d.peakAt.slice(0, 2))}時ごろ・` : ''}{d.level === 'low' ? '強い雪・雨・風の予報なし' : d.reasons[0] ?? ''}</span>
                </li>)}
            </ul>
            <p className="mt-2 text-sm text-ink-3">前日の予報を使った検証で、運休の捉え方を確かめた指標です。運休の確定・運転の保証ではありません。<Link href="/accuracy" className="underline">検証結果</Link></p>
        </section>}

        {/* 線区ごとの公式状態 */}
        {today.units.length > 1 && <section aria-labelledby="units-title" className="mt-8">
            <h2 id="units-title" className="text-lg font-bold">エリアごとのJR発表</h2>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                {today.units.map(u => <li key={u.unit} className="flex items-center justify-between gap-3 px-4 py-3"><span>{u.areaName}・{u.name}</span><OfficialPill state={u.state} /></li>)}
            </ul>
        </section>}

        <Link href="/#search" className="mt-8 flex min-h-13 items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3.5 font-bold text-brand shadow-card hover:bg-surface-2"><Search size={18} aria-hidden />乗る区間で調べる（代替手段も表示）</Link>
    </main>;
}
