import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Bus, Clock3, Coffee, Hotel, Megaphone, Pencil, Wind, CloudSnow, TrainFront } from 'lucide-react';
import { getJourneyResult, JourneyInputError, type JourneyResult, type Verdict } from '@/lib/engine/journey';
import { UNKNOWN_REASON_LABELS } from '@/lib/engine/status';
import { OfficialPill, RiskPill } from '@/components/ui/status-pill';
import { RefreshButton } from '@/components/journey/refresh-button';
import { CommunityIsland } from '@/components/journey/community-island';
import '../journey.css';
import { getStationById } from '@/lib/hokkaido-data';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => typeof v === 'string' ? v : '';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
    const p = await searchParams;
    const a = getStationById(one(p.from)), b = getStationById(one(p.to));
    return { title: a && b ? `${a.name}→${b.name} の運行・気象リスク` : '区間の運行・気象リスク', robots: { index: false } };
}

const clock = (iso: string | null | undefined) => iso
    ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';
const dateLabel = (date: string) => new Intl.DateTimeFormat('ja-JP', { timeZone: 'UTC', month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T00:00:00Z`));

const VERDICT: Record<Verdict, { title: string; tone: string; titleTone: string }> = {
    go: { title: 'いつも通り運行の見込み', tone: 'bg-brand-soft', titleTone: 'text-brand-strong' },
    watch: { title: 'おおむね運行の見込み・天候に注意', tone: 'bg-watch-soft', titleTone: 'text-watch' },
    caution: { title: '天候による運休・遅れに警戒', tone: 'bg-high-soft', titleTone: 'text-high' },
    disrupted: { title: '運休・遅れが出ています', tone: 'bg-stop-soft', titleTone: 'text-stop' },
    unknown: { title: '運行状況を確認できません', tone: 'bg-unknown-soft', titleTone: 'text-ink' },
};

function verdictDetail(r: JourneyResult) {
    const reasons = r.forecast?.current.reasons ?? [];
    switch (r.verdict) {
        case 'disrupted': return `${r.official.disrupted.map(d => d.name + (d.note?.match(/^(札幌近郊|道央|道南)/) ? `（${d.note.match(/^(札幌近郊|道央|道南)/)![1]}）` : '')).join('、')}でJRが運休・30分以上の遅れを発表しています。`;
        case 'caution': return `出発時刻の前後で、${reasons[0] ?? '強い雪・雨・風'}。予定の変更や早めの移動を検討してください。`;
        case 'watch': return reasons[0] && !reasons[0].includes('兆候はありません') ? `${reasons[0]}。出発前にもう一度確認してください。` : 'JRの最新情報を出発前に確認してください。';
        case 'unknown': return UNKNOWN_REASON_LABELS[r.official.reason ?? 'missing'];
        default: return r.official.dayKind === 'later' ? 'JRの運行情報は前日から出ます。気象リスクは低めです。' : 'JRの発表で運休・遅れの情報はなく、気象リスクも低めです。';
    }
}

function Alternatives({ r, open }: { r: JourneyResult; open: boolean }) {
    const buses = r.forecast?.buses;
    const places = r.places.flatMap((p, i) => [p.hotel && { ...p.hotel, kind: 'hotel' as const, station: i ? r.to.name : r.from.name }, p.cafe && { ...p.cafe, kind: 'cafe' as const, station: i ? r.to.name : r.from.name }]).filter(Boolean) as { name: string; detail: string; url: string; kind: 'hotel' | 'cafe'; station: string }[];
    const body = <div className="space-y-4">
        {buses?.available && buses.departures.length > 0 && <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <h3 className="flex items-center gap-2 font-bold"><Bus size={18} className="text-brand" aria-hidden />空港連絡バス（公式時刻表から）</h3>
            <ul className="mt-2 divide-y divide-line">{buses.departures.map(d => <li key={d.departsAt + d.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-lg font-bold tabular">{clock(d.departsAt)} 発 → {clock(d.arrivesAt)} 着<span className="ml-2 text-sm font-normal text-ink-3">約{d.durationMinutes}分</span></span>
                <a href={d.boardingUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1 text-sm font-bold text-brand hover:underline">{d.boarding}のりば<ArrowUpRight size={14} aria-hidden /></a>
            </li>)}</ul>
            <p className="mt-1 text-sm text-ink-3">遅延・満席・運休は反映していません。<a href={buses.url} target="_blank" rel="noopener noreferrer" className="underline">時刻表</a>で確認してください。</p>
        </div>}
        {r.alternatives.length > 0 && <ul className="space-y-3">{r.alternatives.slice(0, 4).map(a => <li key={a.name} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <p className="font-bold">{a.name}<span className="ml-2 text-sm font-normal text-ink-3">{a.time}</span></p>
            <p className="mt-0.5 text-[15px] text-ink-2">{a.details}</p>
            {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand hover:underline">運行・時刻を確認<ArrowUpRight size={14} aria-hidden /></a>}
        </li>)}</ul>}
        {places.length > 0 && <ul className="grid gap-3 sm:grid-cols-2">{places.map(p => <li key={p.url}><a href={p.url} target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card hover:bg-surface-2">
            {p.kind === 'hotel' ? <Hotel size={22} className="shrink-0 text-brand" aria-hidden /> : <Coffee size={22} className="shrink-0 text-brand" aria-hidden />}
            <span><span className="block font-bold">{p.name}</span><span className="block text-sm text-ink-3">{p.station}・{p.detail}</span></span></a></li>)}</ul>}
        {!buses?.available && !r.alternatives.length && !places.length && <p className="text-ink-2">この区間の代替手段はまだ登録していません。</p>}
        <p className="text-sm text-ink-3">大雪・暴風のときはバスや道路も止まることがあります。各社の運行情報を確認してください。</p>
    </div>;
    return <section aria-labelledby="alt-title" className="mt-8">
        {open ? <><h2 id="alt-title" className="mb-3 text-lg font-bold">代わりの移動手段・待つ場所</h2>{body}</>
            : <details className="group rounded-2xl border border-line bg-surface p-4 shadow-card"><summary id="alt-title" className="flex min-h-11 cursor-pointer items-center justify-between font-bold">代わりの移動手段・待つ場所<span className="text-sm font-normal text-ink-3 group-open:hidden">開く</span></summary><div className="mt-3">{body}</div></details>}
    </section>;
}

export default async function JourneyPage({ searchParams }: { searchParams: Promise<Params> }) {
    const p = await searchParams;
    const req = { from: one(p.from), to: one(p.to), date: one(p.date), time: one(p.time) };
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(req.date) && /^\d{2}:\d{2}$/.test(req.time);
    let r: JourneyResult | null = null;
    let error: string | null = null;
    if (!valid) error = '区間と日時を指定してください。';
    else try { r = await getJourneyResult(req); }
    catch (e) { error = e instanceof JourneyInputError ? 'この2駅を結ぶ路線が見つかりませんでした。' : '情報を取得できませんでした。少し時間をおいてお試しください。'; }

    if (!r) return <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-lg font-bold">{error}</p>
        <Link href="/#search" className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-bold text-brand"><ArrowLeft size={18} aria-hidden />区間を選び直す</Link>
    </main>;

    const v = VERDICT[r.verdict];
    const f = r.forecast;
    const showAltFirst = r.verdict === 'disrupted' || r.verdict === 'caution';
    const primary = r.lines.find(l => l.slug !== 'express') ?? r.lines[0];
    const qs = (date: string) => `/journey?from=${r!.from.id}&to=${r!.to.id}&date=${date}&time=${r!.request.time}`;
    return <main id="main" className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-2">
            <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 font-bold text-brand"><ArrowLeft size={18} aria-hidden />全路線</Link>
            <RefreshButton />
        </div>
        <header className="mt-2">
            <p className="text-sm font-bold text-ink-3 tabular">{dateLabel(r.request.date)} {r.request.time} 出発</p>
            <h1 className="mt-0.5 text-3xl font-bold">{r.from.name}<span className="mx-2 text-ink-3">→</span>{r.to.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
                {r.lines.map(l => <Link key={l.slug} href={`/line/${l.slug}`} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-surface px-3 text-sm font-bold text-ink-2 hover:bg-surface-2"><TrainFront size={14} aria-hidden />{l.name}{l.note?.match(/^(札幌近郊|道央|道南)/) ? `（${l.note.match(/^(札幌近郊|道央|道南)/)![1]}）` : ''}</Link>)}
                <Link href="/#search" className="inline-flex min-h-9 items-center gap-1 px-2 text-sm font-bold text-brand hover:underline"><Pencil size={14} aria-hidden />条件を変更</Link>
            </div>
        </header>

        <section aria-labelledby="verdict" className={`mt-5 rounded-2xl p-5 ${v.tone}`}>
            <h2 id="verdict" className={`text-2xl font-bold ${v.titleTone}`}>{v.title}</h2>
            <p className="mt-1.5 text-[17px] text-ink-2">{verdictDetail(r)}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-3">
                <span className="flex items-center gap-1.5">JR発表 <OfficialPill state={r.official.state} />{r.official.publishedAt && <span className="tabular">{clock(r.official.publishedAt)}</span>}</span>
                <span className="flex items-center gap-1.5">{r.request.time}の気象リスク <RiskPill level={r.riskAtTime} /></span>
            </div>
            {r.recovery && <div className="mt-4 rounded-xl bg-surface p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-3"><Clock3 size={16} aria-hidden />再開の見通し</h3>
                {r.recovery.kind === 'official' && r.recovery.earliest
                    ? <p className="mt-1"><span className="text-3xl font-bold tabular">{clock(r.recovery.earliest)}</span> <span className="font-bold">ごろ再開見込み</span><span className="ml-2 rounded bg-surface-2 px-1.5 text-sm">JR発表</span></p>
                    : <p className="mt-1 text-lg font-bold">{r.recovery.label}</p>}
                <p className="mt-1 text-[15px] text-ink-2">{r.recovery.detail}</p>
            </div>}
            {r.official.disrupted.flatMap(d => d.notices.filter(n => !n.areaWide)).slice(0, 3).map(n => <article key={n.title + n.body} className="mt-3 rounded-xl bg-surface p-4">
                <h3 className="flex items-start gap-1.5 font-bold"><Megaphone size={17} className="mt-1 shrink-0 text-ink-3" aria-hidden />{n.title || 'お知らせ'}</h3>
                <p className="mt-1 whitespace-pre-line text-[15px] text-ink-2">{n.body}</p>
            </article>)}
        </section>

        {showAltFirst && <Alternatives r={r} open />}

        {f && <section aria-labelledby="hours-title" className="mt-8">
            <h2 id="hours-title" className="text-lg font-bold">出発前後の気象リスク</h2>
            <ol className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {f.hourly.map(h => { const sel = h.date === r!.request.date && h.time.slice(0, 2) === r!.request.time.slice(0, 2);
                    return <li key={h.date + h.time} className={`flex w-[5.25rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center ${sel ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}>
                        <span className="text-sm font-bold tabular">{h.date !== r!.request.date ? `${Number(h.date.slice(8))}日 ` : ''}{Number(h.time.slice(0, 2))}時</span>
                        <RiskPill level={h.level} />
                        {h.weather && <span className="text-sm leading-tight text-ink-2 tabular"><span className="flex items-center justify-center gap-0.5"><Wind size={13} aria-hidden />{h.weather.windSpeed.toFixed(0)}<small>m/s</small></span>
                            {(h.weather.snowfall ?? 0) > 0 && <span className="flex items-center justify-center gap-0.5"><CloudSnow size={13} aria-hidden />{h.weather.snowfall!.toFixed(1)}<small>cm</small></span>}</span>}
                    </li>; })}
            </ol>
            <h3 className="mt-5 font-bold">ほかの日の同じ時刻</h3>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {f.daily.map(d => <li key={d.date}><Link href={qs(d.date)} aria-current={d.date === r!.request.date ? 'date' : undefined}
                    className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border px-3 py-2 ${d.date === r!.request.date ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-surface-2'}`}>
                    <span className="text-sm font-bold">{dateLabel(d.date)}</span><RiskPill level={d.level} /></Link></li>)}
            </ul>
            <p className="mt-2 text-sm text-ink-3">対象地点: {f.route.points.join('・')}。気象予報からの参考で、運休の確定・運転の保証ではありません。<Link href="/accuracy" className="underline">検証結果</Link></p>
        </section>}

        {!showAltFirst && <Alternatives r={r} open={false} />}

        {primary && primary.slug !== 'express' && <section className="mt-8" aria-label="現地の声">
            <CommunityIsland routeId={primary.slug === 'gakuen-toshi' ? 'jr-hokkaido.sassho' : (f?.route.id ?? primary.slug)} routeName={primary.name}
                officialStatus={r.official.state === 'disrupted' ? 'suspended' : r.official.state === 'no-info' ? 'normal' : 'unknown'}
                departureId={r.from.id} arrivalId={r.to.id} />
        </section>}

        <a href="https://www3.jrhokkaido.co.jp/webunkou/" target="_blank" rel="noopener noreferrer" className="mt-8 flex min-h-13 items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3.5 font-bold text-ink-2 shadow-card hover:bg-surface-2">JR北海道の公式運行情報<ArrowUpRight size={16} aria-hidden /></a>
    </main>;
}
