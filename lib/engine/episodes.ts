/**
 * 運休・大幅な遅れの「事例」を、保存済みの JR フィード(線区ごとの状態コードの時系列)から切り出す。純粋関数。
 *
 * - 状態コード1(運休・30分以上の遅れ・見合わせ)が続いた区間を1事例とする。
 * - 開始・終了の前後の観測間隔が広い(65分超)ときは時刻が不確かなので、継続時間の統計には使わない。
 * - コード2(サービス時間外)や観測の途切れで終わった事例は「打ち切り」(その時点までは続いていた)。
 * - 同じ出来事が複数の線区・エリアに出るので、原因とお知らせの題名・開始時刻が近いものは1件にまとめる。
 */
import { parseAreaFeed, type AreaFeed } from '@/lib/sources/jr-feed';
import { LINES } from '@/lib/registry/lines';
import { JR_AREAS, type JrAreaId, type SenkuKey, type UnitId } from '@/lib/registry/units';

export type CauseKind = 'animal' | 'crossing' | 'person' | 'equipment' | 'snow' | 'rain' | 'wind' | 'quake' | 'track' | 'other';

export const CAUSE_LABELS: Record<CauseKind, string> = {
    animal: '動物（鹿・熊）との衝突', crossing: '踏切の安全確認', person: '人身事故・お客様対応・線路内立ち入り',
    equipment: '車両・信号・設備のトラブル', snow: '雪・吹雪', rain: '大雨', wind: '強風',
    quake: '地震・津波', track: '線路の支障（倒木・盛土など）', other: 'その他',
};

/** お知らせの題名・本文から原因を分類。題名を優先する。 */
export function classifyCause(title: string, body = ''): CauseKind {
    const pick = (t: string): CauseKind | null =>
        /鹿|熊|動物/.test(t) ? 'animal'
        : /地震|津波/.test(t) ? 'quake'
        : /大雪|降雪|吹雪|暴風雪|除雪|雪/.test(t) ? 'snow'
        : /強風|暴風|風/.test(t) ? 'wind'
        : /大雨|降雨|雨|増水|冠水/.test(t) ? 'rain'
        : /踏切/.test(t) ? 'crossing'
        : /人身|線路内.{0,6}(人|立ち入)|お客様|急病|体調/.test(t) ? 'person'
        : /倒木|盛土|土砂|落石|線路.{0,4}(支障|確認)/.test(t) ? 'track'
        : /車両|信号|架線|設備|ポイント|停電|不具合|故障|空転|装置|ビニール/.test(t) ? 'equipment'
        : null;
    return pick(title) ?? pick(body.slice(0, 120)) ?? 'other';
}

export interface Observation { at: number; code: 0 | 1 | 2; title: string; body: string }
export interface Episode {
    unit: UnitId;
    cause: CauseKind;
    title: string;
    /** 最初に運休を観測した時刻 */
    onset: number;
    /** 解消を観測した時刻。打ち切りなら最後に運休を観測した時刻 */
    end: number;
    /** 開始時刻が確か(直前の「情報なし」観測から65分以内) */
    onsetKnown: boolean;
    outcome: 'resumed' | 'off-hours' | 'gap' | 'open';
    /** 終了時刻が確か */
    endKnown: boolean;
}

const MAX_GAP = 65 * 60_000;
const keywordsOf = (unit: UnitId) => {
    const key = unit.split(':')[1] as SenkuKey;
    return key === 'express' ? ['特急'] : [...new Set(LINES.filter(l => l.units.includes(unit)).flatMap(l => l.keywords))];
};

/** 1線区の時系列(時刻順)から事例を切り出す */
export function episodesOfUnit(unit: UnitId, series: Observation[]): Episode[] {
    const out: Episode[] = [];
    let cur: { onset: number; last: number; onsetKnown: boolean; titles: Map<string, string> } | null = null;
    let prev: Observation | null = null;
    const close = (end: number, outcome: Episode['outcome'], endKnown: boolean) => {
        if (!cur) return;
        // 最も多く出た題名を代表にする
        const [title, body] = [...cur.titles.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? ['', ''];
        out.push({ unit, cause: classifyCause(title, body), title, onset: cur.onset, end, onsetKnown: cur.onsetKnown, outcome, endKnown });
        cur = null;
    };
    for (const o of series) {
        const gap = prev ? o.at - prev.at : Infinity;
        if (cur && gap > MAX_GAP) close(cur.last, 'gap', false);
        if (o.code === 1) {
            if (!cur) cur = { onset: o.at, last: o.at, onsetKnown: !!prev && prev.code === 0 && gap <= MAX_GAP, titles: new Map() };
            cur.last = o.at;
            if (o.title && !cur.titles.has(o.title)) cur.titles.set(o.title, o.body);
        } else if (cur) {
            if (o.code === 0) close(o.at, 'resumed', true);
            else close(cur.last, 'off-hours', false);
        }
        prev = o;
    }
    if (cur) close((cur as { last: number }).last, 'open', false);
    return out;
}

/** 保存行(1取得=1エリア)の列から、線区ごとの時系列を作る */
export function seriesFromLogs(rows: { fetched_at: string; area_id: string; raw_json: unknown }[]): Map<UnitId, Observation[]> {
    const series = new Map<UnitId, Observation[]>();
    for (const r of rows) {
        if (!(r.area_id in JR_AREAS)) continue;
        const feed: AreaFeed | null = parseAreaFeed(r.raw_json, r.area_id as JrAreaId, r.fetched_at);
        if (!feed) continue;
        const published = feed.publishedAt ? Date.parse(feed.publishedAt) : NaN;
        const fetched = Date.parse(r.fetched_at);
        // 深夜の更新停止中(発行が古い)は観測として数えない
        if (!Number.isFinite(published) || fetched - published > 30 * 60_000) continue;
        for (const [key, c] of Object.entries(feed.today.units)) {
            const unit = `${feed.area}:${key}` as UnitId;
            const code = c === 'no-info' ? 0 : c === 'disrupted' ? 1 : c === 'off-hours' ? 2 : null;
            if (code === null) continue;
            const words = keywordsOf(unit);
            const areaCode = JR_AREAS[feed.area].code;
            const inArea = feed.today.notices.filter(n => !n.affectedAreas.length || n.affectedAreas.includes(areaCode));
            const notice = code === 1 ? (inArea.find(n => words.some(w => (n.title + n.body).includes(w))) ?? (inArea.length === 1 ? inArea[0] : undefined)) : undefined;
            if (!series.has(unit)) series.set(unit, []);
            series.get(unit)!.push({ at: published, code, title: notice?.title ?? '', body: notice?.body ?? '' });
        }
    }
    for (const s of series.values()) s.sort((a, b) => a.at - b.at);
    return series;
}

export interface Incident { cause: CauseKind; title: string; onset: number; minutes: number; censored: boolean; units: UnitId[] }

/**
 * 同じ出来事(原因・題名が同じで開始が90分以内)を1件にまとめ、最長の継続時間を採る。
 * 開始時刻が確かなものだけ。再開まで観測できた事例と、運行時間外まで続いた事例(打ち切り)を使う。
 */
export function mergeIncidents(episodes: Episode[]): Incident[] {
    const usable = episodes.filter(e => e.onsetKnown && (e.outcome === 'resumed' || e.outcome === 'off-hours')).sort((a, b) => a.onset - b.onset);
    const incidents: Incident[] = [];
    for (const e of usable) {
        const minutes = Math.round((e.end - e.onset) / 60_000);
        const censored = e.outcome !== 'resumed';
        const same = incidents.find(i => i.cause === e.cause && i.title === e.title && Math.abs(i.onset - e.onset) <= 90 * 60_000);
        if (same) {
            if (minutes > same.minutes || (minutes === same.minutes && censored)) { same.minutes = minutes; same.censored = censored; }
            if (!same.units.includes(e.unit)) same.units.push(e.unit);
        } else incidents.push({ cause: e.cause, title: e.title, onset: e.onset, minutes, censored, units: [e.unit] });
    }
    return incidents;
}

/** 原因ごとの継続時間(分)。resumed = 解消まで観測、censored = その時間までは続いた(運行時間外で打ち切り) */
export interface DurationSet { resumed: number[]; censored: number[] }
export type RecoveryDataset = { all: DurationSet; byCause: Partial<Record<CauseKind, DurationSet>> };

export interface Outlook {
    /** 使った事例数(経過時間より長く続いた事例) */
    n: number;
    pool: 'cause' | 'all';
    /** あと何分で解消したか。打ち切りが多く到達しない場合は null(=長引くことが多い) */
    p25: number | null; median: number | null; p75: number | null;
    /** あと30分・1時間・2時間以内に解消した割合 */
    within: { m30: number; h1: number; h2: number };
}

/** Kaplan–Meier。経過時間 elapsed を超えて続いた事例だけを使い、残り時間の分布を返す。 */
export function kaplanMeier(set: DurationSet, elapsed = 0): Omit<Outlook, 'pool'> | null {
    const subjects = [
        ...set.resumed.filter(m => m > elapsed).map(m => ({ t: m - elapsed, event: true })),
        ...set.censored.filter(m => m > elapsed).map(m => ({ t: m - elapsed, event: false })),
    ].sort((a, b) => a.t - b.t || Number(b.event) - Number(a.event));
    if (!subjects.length) return null;
    let atRisk = subjects.length, s = 1;
    const curve: { t: number; s: number }[] = [];
    for (let i = 0; i < subjects.length;) {
        const t = subjects[i].t;
        let events = 0, removed = 0;
        while (i < subjects.length && subjects[i].t === t) { if (subjects[i].event) events++; removed++; i++; }
        if (events) { s *= 1 - events / atRisk; curve.push({ t, s }); }
        atRisk -= removed;
    }
    const quantile = (q: number) => curve.find(c => c.s <= 1 - q)?.t ?? null;
    const within = (limit: number) => Math.round((1 - (curve.filter(c => c.t <= limit).at(-1)?.s ?? 1)) * 100) / 100;
    return { n: subjects.length, p25: quantile(0.25), median: quantile(0.5), p75: quantile(0.75), within: { m30: within(30), h1: within(60), h2: within(120) } };
}

export const MIN_SAMPLES = 8;

/** 原因別の実績。件数が足りなければ全原因をまとめた実績。それも足りなければ null。 */
export function outlookFor(data: RecoveryDataset, cause: CauseKind | null, elapsedMinutes = 0): Outlook | null {
    const own = cause && cause !== 'other' && data.byCause[cause] ? kaplanMeier(data.byCause[cause]!, elapsedMinutes) : null;
    if (own && own.n >= MIN_SAMPLES) return { ...own, pool: 'cause' };
    // 雪・雨・風・地震・線路の支障は長引きやすい。事例が足りないとき、鹿や設備トラブル中心の全体実績で代用しない。
    if (cause && ['snow', 'rain', 'wind', 'quake', 'track'].includes(cause)) return null;
    const all = kaplanMeier(data.all, elapsedMinutes);
    return all && all.n >= MIN_SAMPLES ? { ...all, pool: 'all' } : null;
}
