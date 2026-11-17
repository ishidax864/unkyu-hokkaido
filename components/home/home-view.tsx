'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ChevronRight, RefreshCw, Search, Star, TrainFront, X, Info } from 'lucide-react';
import type { Board, BoardLine } from '@/lib/engine/board';
import type { OfficialState } from '@/lib/engine/status';
import type { RiskLevel } from '@/lib/forecast/types';
import { OfficialPill, RiskPill } from '@/components/ui/status-pill';
import { StationPicker } from '@/components/station-picker';
import { useFavorites, type FavoriteRoute } from '@/hooks/useFavorites';
import { linesForJourney } from '@/lib/registry/journey-lines';
import { getStationById } from '@/lib/hokkaido-data';

const REGIONS: BoardLine['region'][] = ['札幌圏', '道央', '道南', '道北', '道東'];
const OFFICIAL_RANK: Record<OfficialState, number> = { 'off-hours': 0, 'no-info': 1, unknown: 2, disrupted: 3 };
const RISK_RANK: Record<RiskLevel, number> = { low: 0, unknown: 1, watch: 2, high: 3, severe: 4 };

const clock = (iso: string | null | undefined) => iso
    ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const peak = (r: BoardLine['risk']['tomorrow']) => r?.peakAt ? `${Number(r.peakAt.slice(0, 2))}時ごろ` : null;
const jstNow = () => {
    const iso = new Date(Date.now() + 9 * 3_600_000).toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};

function worstOfficial(lines: BoardLine[], day: 'today' | 'tomorrow'): OfficialState {
    return lines.reduce<OfficialState>((w, l) => OFFICIAL_RANK[l[day].state] > OFFICIAL_RANK[w] ? l[day].state : w, 'off-hours');
}
function worstRisk(lines: BoardLine[], key: 'laterToday' | 'tomorrow'): RiskLevel {
    return lines.reduce<RiskLevel>((w, l) => { const r = l.risk[key]?.level; return r && RISK_RANK[r] > RISK_RANK[w] ? r : w; }, 'low');
}

/** 明日の欄: 公式の運休予定があれば最優先。無ければ予報(参考)。 */
function TomorrowCell({ line }: { line: BoardLine }) {
    if (line.tomorrow.state === 'disrupted') return <OfficialPill state="disrupted" label="運休予定" />;
    const r = line.risk.tomorrow;
    if (!r) return <OfficialPill state={line.tomorrow.state} />;
    return <span className="flex flex-col items-start gap-0.5"><RiskPill level={r.level} />{peak(r) && <span className="text-sm text-ink-3 tabular">{peak(r)}</span>}</span>;
}

function LineRow({ line }: { line: BoardLine }) {
    const later = line.risk.laterToday;
    return <li>
        <Link href={`/line/${line.slug}`} className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_7.5rem_7.5rem_1rem]">
            <span className="min-w-0">
                <span className="block font-bold leading-snug">{line.name}</span>
                {line.note && <span className="block truncate text-sm text-ink-3">{line.note}</span>}
                {line.warnings.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{line.warnings.slice(0, 2).map(w =>
                    <span key={w.area + w.name} className="rounded bg-stop-soft px-1.5 text-sm font-bold text-stop">{w.name}</span>)}</span>}
            </span>
            {/* スマホ: 右に いま、下に このあと・明日 */}
            <span className="sm:hidden"><OfficialPill state={line.today.state} /></span>
            <span className="col-span-2 flex items-center gap-3 text-sm text-ink-3 sm:hidden">
                <span className="flex items-center gap-1.5">このあと {later ? <RiskPill level={later.level} /> : '—'}</span>
                <span className="flex items-center gap-1.5">明日 <TomorrowCell line={line} /></span>
            </span>
            <span className="hidden sm:block"><OfficialPill state={line.today.state} /></span>
            <span className="hidden sm:flex sm:flex-col sm:items-start sm:gap-0.5">{later ? <><RiskPill level={later.level} />{peak(later) && <span className="text-sm text-ink-3 tabular">{peak(later)}</span>}</> : <span className="text-ink-3">—</span>}</span>
            <span className="hidden sm:block"><TomorrowCell line={line} /></span>
            <ChevronRight size={18} className="hidden text-ink-3 sm:block" aria-hidden />
        </Link>
    </li>;
}

function SavedRouteCard({ fav, board, onRemove }: { fav: FavoriteRoute; board: Board; onRemove: () => void }) {
    const slugs = new Set((linesForJourney(fav.departureId, fav.arrivalId) ?? []).map(l => l.slug));
    const lines = board.lines.filter(l => slugs.has(l.slug));
    const today = lines.length ? worstOfficial(lines, 'today') : 'unknown';
    const tomorrowOfficial = lines.length ? worstOfficial(lines, 'tomorrow') : 'unknown';
    const tomorrowRisk = worstRisk(lines, 'tomorrow');
    const { date, time } = jstNow();
    return <li className="relative rounded-2xl border border-line bg-surface shadow-card">
        <Link href={`/journey?from=${fav.departureId}&to=${fav.arrivalId}&date=${date}&time=${time}`} className="block p-4 pr-12">
            <span className="block text-lg font-bold">{fav.departureName}<span className="mx-1.5 text-ink-3">→</span>{fav.arrivalName}</span>
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-3">
                <span className="flex items-center gap-1.5">いま <OfficialPill state={today} /></span>
                <span className="flex items-center gap-1.5">明日 {tomorrowOfficial === 'disrupted' ? <OfficialPill state="disrupted" label="運休予定" /> : <RiskPill level={tomorrowRisk} />}</span>
            </span>
        </Link>
        <button type="button" onClick={onRemove} aria-label={`${fav.departureName}→${fav.arrivalName}を保存から外す`}
            className="absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-full text-ink-3 hover:bg-surface-2"><X size={18} /></button>
    </li>;
}

function SearchForm({ onSaved }: { onSaved: (from: string, to: string) => void }) {
    const router = useRouter();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [day, setDay] = useState<'today' | 'tomorrow' | 'other'>('today');
    const [otherDate, setOtherDate] = useState('');
    const [time, setTime] = useState('');
    const [save, setSave] = useState(false);
    // 端末の時刻は表示後に入れる(サーバー描画と食い違わないように)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setTime(jstNow().time); }, []);
    const valid = !!getStationById(from) && !!getStationById(to) && from !== to;
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!valid) return;
        const today = jstNow().date;
        const date = day === 'today' ? today : day === 'tomorrow'
            ? new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : otherDate || today;
        if (save) onSaved(from, to);
        router.push(`/journey?from=${from}&to=${to}&date=${date}&time=${time || jstNow().time}`);
    };
    const chip = (key: typeof day, label: string) => <button type="button" aria-pressed={day === key} onClick={() => setDay(key)}
        className={`min-h-11 rounded-full border px-4 font-bold ${day === key ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink-2 hover:bg-surface-2'}`}>{label}</button>;
    return <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5" aria-labelledby="search-title">
        <h2 id="search-title" className="mb-3 flex items-center gap-2 text-lg font-bold"><Search size={20} aria-hidden className="text-brand" />区間で調べる</h2>
        <div className="relative rounded-xl border border-line">
            <StationPicker label="出発" marker="from" value={from} onChange={setFrom} exclude={to} />
            <div className="mx-4 border-t border-line" />
            <StationPicker label="到着" marker="to" value={to} onChange={setTo} exclude={from} />
            <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label="出発と到着を入れ替え"
                className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-ink-2 hover:bg-surface-2"><ArrowUpDown size={18} /></button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
            {chip('today', '今日')}{chip('tomorrow', '明日')}{chip('other', '日付を指定')}
            <label className="ml-auto flex items-center gap-2 text-sm font-bold text-ink-3">出発
                <input type="time" value={time} onChange={e => setTime(e.target.value)} required
                    className="min-h-11 rounded-lg border border-line bg-surface px-3 text-base font-bold text-ink tabular" /></label>
        </div>
        {day === 'other' && <label className="mt-3 flex items-center gap-2 text-sm font-bold text-ink-3">日付
            <input type="date" value={otherDate} onChange={e => setOtherDate(e.target.value)} required
                className="min-h-11 rounded-lg border border-line bg-surface px-3 text-base text-ink" /></label>}
        <label className="mt-3 flex min-h-11 items-center gap-2 text-[15px] text-ink-2">
            <input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} className="size-5 accent-[var(--brand)]" />この区間を「よく使う区間」に保存</label>
        <button type="submit" disabled={!valid}
            className="mt-3 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-lg font-bold text-on-brand hover:bg-brand-strong disabled:opacity-40">
            運行と気象リスクを調べる<ChevronRight size={20} aria-hidden /></button>
    </form>;
}

export function HomeView({ initialBoard }: { initialBoard: Board | null }) {
    const [board, setBoard] = useState(initialBoard);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(!initialBoard);
    const { favorites, isLoaded, addFavorite, removeFavorite } = useFavorites();

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/board', { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
            if (!res.ok) throw new Error(String(res.status));
            setBoard(await res.json()); setFailed(false);
        } catch { setFailed(true); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => {
        const tick = () => { if (document.visibilityState === 'visible') void refresh(); };
        const timer = setInterval(tick, 180_000);
        document.addEventListener('visibilitychange', tick);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
    }, [refresh]);

    const disruptedToday = useMemo(() => board?.lines.filter(l => l.today.state === 'disrupted') ?? [], [board]);
    const unknownToday = board?.lines.filter(l => l.today.state === 'unknown') ?? [];
    const tomorrowAlerts = board?.lines.filter(l => l.tomorrow.state === 'disrupted' || ['high', 'severe'].includes(l.risk.tomorrow?.level ?? '')) ?? [];
    const nightly = unknownToday.some(l => l.today.reason === 'nightly-pause');

    return <main id="main" className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-3">JR発表 <span className="font-bold text-ink-2 tabular">{clock(board?.sources.jr.publishedAt)}</span> 時点
                {board?.sources.weather.fetchedAt && Date.parse(board.generatedAt) - Date.parse(board.sources.weather.fetchedAt) > 45 * 60_000
                    && <span className="ml-2 rounded bg-watch-soft px-1.5 py-0.5 font-bold text-watch">気象予報は {clock(board.sources.weather.fetchedAt)} 時点</span>}
                {board && board.sources.weather.totalPoints > 0 && board.sources.weather.failedPoints === board.sources.weather.totalPoints
                    && <span className="ml-2 rounded bg-unknown-soft px-1.5 py-0.5 font-bold text-unknown">気象予報を取得できません</span>}</p>
            <button type="button" onClick={() => void refresh()} disabled={loading}
                className="flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink-2 hover:bg-surface-2 disabled:opacity-60">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden />{loading ? '更新中' : '更新'}</button>
        </div>

        {/* よく使う区間 */}
        {isLoaded && favorites.length > 0 && board && <section className="mb-6" aria-labelledby="saved-title">
            <h2 id="saved-title" className="mb-3 flex items-center gap-2 text-lg font-bold"><Star size={20} className="text-brand" aria-hidden />よく使う区間</h2>
            <ul className="grid gap-3 sm:grid-cols-2">{favorites.map(f => <SavedRouteCard key={f.id} fav={f} board={board} onRemove={() => removeFavorite(f.id)} />)}</ul>
        </section>}

        {/* 要約 */}
        <section aria-live="polite" className={`rounded-2xl p-5 ${disruptedToday.length ? 'bg-stop-soft' : unknownToday.length ? 'bg-unknown-soft' : 'bg-brand-soft'}`}>
            {failed && !board ? <p className="text-lg font-bold">運行情報を取得できませんでした。<a className="underline" href="https://www3.jrhokkaido.co.jp/webunkou/" target="_blank" rel="noopener noreferrer">JR公式</a>をご確認ください。</p>
                : disruptedToday.length ? <>
                    <h1 className="text-2xl font-bold text-stop">{disruptedToday.length}路線で運休・遅れ</h1>
                    <p className="mt-1 text-ink-2">{disruptedToday.map(l => l.name + (l.note?.startsWith('札幌近郊') || l.note?.startsWith('道央') ? `（${l.note.slice(0, 4)}）` : '')).join('、')}</p>
                </> : unknownToday.length ? <>
                    <h1 className="text-2xl font-bold">{nightly ? '深夜はJRの更新が止まっています' : '一部の公式情報を確認できません'}</h1>
                    <p className="mt-1 text-ink-2">{nightly ? '3〜5時ごろは運行情報が更新されません。始発前にもう一度確認してください。' : 'JR公式の運行情報も確認してください。'}</p>
                </> : <>
                    <h1 className="text-2xl font-bold text-brand-strong">全路線で運休・遅れの情報はありません</h1>
                    <p className="mt-1 text-ink-2">JR北海道の発表で、運休・30分以上の遅れが出ていない状態です。</p>
                </>}
            {tomorrowAlerts.length > 0 && <p className="mt-3 rounded-xl bg-surface/70 px-3 py-2 text-[15px] font-bold text-ink">
                明日（{board && shortDate(board.tomorrowDate)}）: {tomorrowAlerts.map(l => l.name).filter((v, i, a) => a.indexOf(v) === i).join('、')} に注意</p>}
        </section>

        {/* 全路線 */}
        {board && <section className="mt-8" aria-labelledby="board-title">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <h2 id="board-title" className="flex items-center gap-2 text-lg font-bold"><TrainFront size={20} className="text-brand" aria-hidden />全路線の状況</h2>
                <Link href="/accuracy" className="flex min-h-11 items-center gap-1 text-sm text-ink-3 underline-offset-2 hover:underline"><Info size={15} aria-hidden />表示の見方</Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_7.5rem_7.5rem_1rem] gap-x-3 border-b border-line bg-surface-2 px-4 py-2 text-sm font-bold text-ink-3 sm:grid">
                    <span>路線</span><span>いま（JR発表）</span><span>このあと（予報）</span><span>明日 {shortDate(board.tomorrowDate)}</span><span />
                </div>
                {REGIONS.map(region => {
                    const lines = board.lines.filter(l => l.region === region && l.slug !== 'express');
                    if (!lines.length) return null;
                    return <div key={region}>
                        <h3 className="border-b border-line bg-surface-2/60 px-4 py-1.5 text-sm font-bold text-ink-2">{region}</h3>
                        <ul className="divide-y divide-line border-b border-line last:border-b-0">{lines.map(l => <LineRow key={l.slug} line={l} />)}</ul>
                    </div>;
                })}
                <div>
                    <h3 className="border-b border-line bg-surface-2/60 px-4 py-1.5 text-sm font-bold text-ink-2">特急・新幹線</h3>
                    <ul className="divide-y divide-line">{board.lines.filter(l => l.slug === 'express' || l.region === '新幹線').map(l => <LineRow key={l.slug} line={l} />)}</ul>
                </div>
            </div>
            <p className="mt-2 text-sm text-ink-3">「平常」はJRの発表で運休・30分以上の遅れの情報がない状態です。「このあと」「明日」の段階は気象予報からの参考で、運休の確定・運転の保証ではありません。</p>
        </section>}

        <section className="mt-8" id="search">
            <SearchForm onSaved={(from, to) => addFavorite(from, to, getStationById(from)!.name, getStationById(to)!.name)} />
        </section>
    </main>;
}
