/**
 * 全路線ボード: 公式状態(今日・明日の営業日) + 気象リスク(いま・このあと・明日)。
 *
 * - 公式と予報は混ぜない。明日に公式の運休予定があればそれを示し、無ければ予報を「参考」として示す。
 * - 予報は risk-core(lib/forecast/core.ts)。現在±1時間だけ気象庁警報・アメダス降雪で上書きする。
 */
import { LINES, type LineDef } from '@/lib/registry/lines';
import { fetchAreaFeeds, type FeedSnapshot } from '@/lib/sources/jr-feed';
import { lineOfficial, type DayOfficial } from './status';
import { fetchWeatherSeriesBatch } from '@/lib/weather';
import { assessWeather, withCurrentWarnings } from '@/lib/forecast/risk';
import { getObservedSnow, withObservedSnow, type ObservedSnow } from '@/lib/forecast/observed-snow';
import { getJourneyWarnings, type WarningSnapshot } from '@/lib/jma-warnings';
import type { PointForecast, RiskAssessment, RiskLevel } from '@/lib/forecast/types';
import { snowLoad, withSnowLoad, type SnowLoad } from '@/lib/forecast/snow-load';

export interface RiskSummary {
    level: RiskLevel;
    /** 最も悪い時刻 (HH:00)。無ければ null */
    peakAt: string | null;
    peakDate: string | null;
    reasons: string[];
    location: string | null;
}

export interface BoardLine {
    slug: string;
    name: string;
    note?: string;
    region: LineDef['region'];
    today: DayOfficial;
    tomorrow: DayOfficial;
    risk: {
        now: RiskSummary | null;
        /** 今日このあと(今から23時まで)の最悪 */
        laterToday: RiskSummary | null;
        /** 明日(6〜23時)の最悪 */
        tomorrow: RiskSummary | null;
    };
    warnings: { name: string; area: string }[];
    /** 積雪が多いところに大雪・風雪の注意報・警報が出ている(今日のこのあと。12時以降は明日にも反映) */
    snowLoad: (SnowLoad & { appliesTomorrow: boolean }) | null;
}

export interface Board {
    generatedAt: string;
    /** 営業日(深夜3時までは前日扱い。JRのフィードと同じ区切り) */
    serviceDate: string;
    tomorrowDate: string;
    lines: BoardLine[];
    sources: {
        jr: { publishedAt: string | null; fetchedAt: string; errors: string[] };
        weather: { fetchedAt: string | null; failedPoints: number; totalPoints: number };
    };
}

const jst = (d: Date) => new Date(d.getTime() + 9 * 3_600_000).toISOString();
export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const serviceDateOf = (now: Date) => {
    const iso = jst(now);
    return +iso.slice(11, 13) < 3 ? addDays(iso.slice(0, 10), -1) : iso.slice(0, 10);
};
const RANK: Record<RiskLevel, number> = { unknown: -1, low: 0, watch: 1, high: 2, severe: 3 };

export function worstOver(points: PointForecast[], expected: number, slots: { date: string; time: string }[]): RiskSummary | null {
    if (!slots.length) return null;
    let worst: (RiskAssessment & { date: string; time: string }) | null = null;
    let unknown = 0;
    for (const s of slots) {
        const r = assessWeather(points, expected, s.date, s.time);
        if (r.level === 'unknown') { unknown++; continue; }
        if (!worst || RANK[r.level] > RANK[worst.level] || (r.level === worst.level && (r.score ?? 0) > (worst.score ?? 0))) worst = { ...r, ...s };
    }
    // 半分以上の時刻が判断できなければ「不明」(欠けた時刻に悪天候が隠れ得る)
    if (!worst || unknown * 2 > slots.length) return { level: 'unknown', peakAt: null, peakDate: null, reasons: ['気象データが揃っていません'], location: null };
    return { level: worst.level, peakAt: worst.level === 'low' ? null : worst.time, peakDate: worst.level === 'low' ? null : worst.date, reasons: worst.reasons, location: worst.location };
}

export const hoursBetween = (date: string, from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => ({ date, time: `${String(from + i).padStart(2, '0')}:00` }));

export interface BoardInputs {
    feeds: FeedSnapshot;
    weather: Map<string, PointForecast | null>;
    weatherFetchedAt: string | null;
    warnings: Map<string, WarningSnapshot>;
    observedSnow: ObservedSnow | null;
}

/** 入力が揃った状態からボードを組み立てる(純粋関数。テストと再生で使う) */
export function buildBoard(inputs: BoardInputs, now = new Date()): Board {
    const serviceDate = serviceDateOf(now);
    const tomorrowDate = addDays(serviceDate, 1);
    const nowIso = jst(now);
    const calendarDate = nowIso.slice(0, 10);
    const hourNow = +nowIso.slice(11, 13);
    let failedPoints = 0, totalPoints = 0;

    const lines = LINES.map(line => {
        const today = lineOfficial(line, inputs.feeds, serviceDate, now);
        const tomorrow = lineOfficial(line, inputs.feeds, tomorrowDate, now);
        const points = line.weatherPoints.map(p => inputs.weather.get(`${p.lat},${p.lon}`) ?? null);
        totalPoints += points.length;
        failedPoints += points.filter(p => !p).length;
        const available = points.filter((p): p is PointForecast => !!p);
        const expected = line.weatherPoints.length;
        const warnings = inputs.warnings.get(line.slug);
        const load = snowLoad(warnings, inputs.observedSnow, line.weatherPoints.map(p => p.name));
        const appliesTomorrow = hourNow >= 12; // 検証は「前日12〜21時に出ていた注意報」
        const bump = (r: RiskSummary | null, on: boolean) => r && on && r.level !== 'unknown' ? withSnowLoad(r, load) : r;
        let nowRisk: RiskSummary | null = null;
        if (expected) {
            const nowTime = `${String(hourNow).padStart(2, '0')}:00`;
            let r = assessWeather(available, expected, calendarDate, nowTime);
            if (inputs.observedSnow) r = withObservedSnow(r, inputs.observedSnow, now.getTime(), now);
            if (warnings) r = withCurrentWarnings(r, warnings, now.getTime(), now);
            nowRisk = bump({ level: r.level, peakAt: nowTime, peakDate: calendarDate, reasons: r.reasons, location: r.location }, true);
        }
        return {
            slug: line.slug, name: line.name, note: line.note, region: line.region,
            today, tomorrow,
            risk: {
                now: nowRisk,
                laterToday: bump(expected ? worstOver(available, expected, hoursBetween(calendarDate, Math.min(hourNow + 1, 23), 23)) : null, true),
                tomorrow: bump(expected ? worstOver(available, expected, hoursBetween(tomorrowDate, 6, 23)) : null, appliesTomorrow),
            },
            snowLoad: load ? { ...load, appliesTomorrow } : null,
            warnings: (warnings?.alerts ?? []).filter(a => a.severity !== 'advisory').map(a => ({ name: a.name, area: a.area })),
        } satisfies BoardLine;
    });

    const published = Object.values(inputs.feeds.feeds).map(f => f?.publishedAt).filter((x): x is string => !!x).sort();
    return {
        generatedAt: now.toISOString(), serviceDate, tomorrowDate, lines,
        sources: {
            jr: { publishedAt: published[0] ?? null, fetchedAt: inputs.feeds.fetchedAt, errors: Object.entries(inputs.feeds.errors).map(([a, e]) => `${a}: ${e}`) },
            weather: { fetchedAt: inputs.weatherFetchedAt, failedPoints, totalPoints },
        },
    };
}

let cache: { expires: number; value: Promise<Board> } | null = null;

/** 実データでボードを作る。60秒キャッシュ(失敗は保存しない)。 */
export async function getBoard(): Promise<Board> {
    if (cache && cache.expires > Date.now()) return cache.value;
    const value = (async () => {
        const points = LINES.flatMap(l => l.weatherPoints);
        const unique = points.filter((p, i) => points.findIndex(q => q.lat === p.lat && q.lon === p.lon) === i);
        const [feeds, series, observedSnow, warningList] = await Promise.all([
            fetchAreaFeeds(),
            fetchWeatherSeriesBatch(unique),
            getObservedSnow(unique).catch(() => null),
            Promise.all(LINES.map(async l => [l.slug, l.routeIds.length ? await getJourneyWarnings(l.routeIds).catch(() => null) : null] as const)),
        ]);
        const weather = new Map<string, PointForecast | null>();
        let weatherFetchedAt: string | null = null;
        unique.forEach((p, i) => {
            const s = series[i];
            if (s instanceof Error) { weather.set(`${p.lat},${p.lon}`, null); return; }
            weatherFetchedAt = weatherFetchedAt && weatherFetchedAt < s.fetchedAt ? weatherFetchedAt : s.fetchedAt;
            weather.set(`${p.lat},${p.lon}`, { point: { name: p.name, lat: p.lat, lon: p.lon }, hours: s.hours, fetchedAt: s.fetchedAt });
        });
        const warnings = new Map<string, WarningSnapshot>();
        for (const [slug, w] of warningList) if (w) warnings.set(slug, w);
        return buildBoard({ feeds, weather, weatherFetchedAt, warnings, observedSnow });
    })();
    cache = { expires: Date.now() + 60_000, value };
    try { return await value; }
    catch (e) { cache = null; throw e; }
}
