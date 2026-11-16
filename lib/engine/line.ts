/**
 * 路線詳細: ボードの1行 + 24時間の時間別リスク + 7日間 + 復旧の見通し(運休中のみ)。
 */
import { LINE_BY_SLUG } from '@/lib/registry/lines';
import { getBoard, worstOver, hoursBetween, addDays, type BoardLine, type RiskSummary } from './board';
import { fetchWeatherSeriesBatch } from '@/lib/weather';
import { assessWeather } from '@/lib/forecast/risk';
import { estimateRecovery, officialRecoveryTime, type RecoveryEstimate } from '@/lib/forecast/recovery';
import type { PointForecast, RiskLevel } from '@/lib/forecast/types';
import type { WeatherForecast } from '@/lib/types';

export interface HourSlot { date: string; time: string; level: RiskLevel; weather: Pick<WeatherForecast, 'weather' | 'windSpeed' | 'windGust' | 'snowfall' | 'precipitation' | 'temperature'> | null }
export interface DaySlot extends RiskSummary { date: string }
export interface LineDetail {
    line: BoardLine;
    generatedAt: string;
    serviceDate: string;
    hourly: HourSlot[];
    daily: DaySlot[];
    recovery: RecoveryEstimate | null;
    weatherAvailable: boolean;
}

const jst = (d: Date) => new Date(d.getTime() + 9 * 3_600_000).toISOString();

/** 「鹿との衝突による列車への影響について」→「鹿との衝突」 */
export function causeFromNotices(titles: string[]): string | null {
    for (const t of titles) {
        const m = t.match(/^(.+?)(?:による|のため|の影響)/);
        if (m && m[1].length <= 20) return m[1];
    }
    return null;
}

export async function getLineDetail(slug: string, now = new Date()): Promise<LineDetail | null> {
    const def = LINE_BY_SLUG.get(slug);
    if (!def) return null;
    const board = await getBoard();
    const line = board.lines.find(l => l.slug === slug)!;
    const series = def.weatherPoints.length ? await fetchWeatherSeriesBatch(def.weatherPoints) : [];
    const points: PointForecast[] = [];
    def.weatherPoints.forEach((p, i) => {
        const s = series[i];
        if (s && !(s instanceof Error)) points.push({ point: { name: p.name, lat: p.lat, lon: p.lon }, hours: s.hours, fetchedAt: s.fetchedAt });
    });
    const expected = def.weatherPoints.length;
    const hourly: HourSlot[] = expected ? Array.from({ length: 24 }, (_, i) => {
        const at = jst(new Date(now.getTime() + i * 3_600_000));
        const date = at.slice(0, 10), time = `${at.slice(11, 13)}:00`;
        const r = assessWeather(points, expected, date, time);
        const w = r.weather;
        return { date, time, level: r.level, weather: w ? { weather: w.weather, windSpeed: w.windSpeed, windGust: w.windGust, snowfall: w.snowfall, precipitation: w.precipitation, temperature: w.temperature } : null };
    }) : [];
    // 1件目は現在。ボードと同じく現在だけ警報・観測の上書きを反映
    if (hourly[0] && line.risk.now) hourly[0].level = line.risk.now.level;
    const daily: DaySlot[] = expected ? Array.from({ length: 7 }, (_, i) => {
        const date = addDays(board.serviceDate, i);
        // 今日は残りの時間だけ(過ぎた時刻を「ピーク」として出さない)
        const today = jst(now).slice(0, 10);
        const from = date === today ? Math.max(6, +jst(now).slice(11, 13)) : 6;
        return { date, ...(worstOver(points, expected, hoursBetween(date, from, 23)) ?? { level: 'unknown' as const, peakAt: null, peakDate: null, reasons: [], location: null }) };
    }) : [];

    let recovery: RecoveryEstimate | null = null;
    if (line.today.state === 'disrupted') {
        const text = line.today.notices.filter(n => !n.areaWide).map(n => `${n.title}\n${n.body}`).join('\n');
        recovery = estimateRecovery({
            disrupted: true, officialText: text, officialExpectedAt: officialRecoveryTime(text, now),
            routeId: def.routeIds[0] ?? slug, cause: 'unknown', incidents: [], startedAt: null, now,
        });
        if (recovery.kind === 'unknown') {
            const cause = causeFromNotices(line.today.notices.map(n => n.title));
            recovery = { ...recovery, label: 'JRから再開見込みの発表はまだありません',
                detail: `${cause ? `原因: ${cause}（JR発表）。` : ''}再開時刻が発表されたらここに表示します。急ぐ場合は代替手段も確認してください。` };
        }
    }
    return { line, generatedAt: board.generatedAt, serviceDate: board.serviceDate, hourly, daily, recovery, weatherAvailable: points.length === expected };
}
