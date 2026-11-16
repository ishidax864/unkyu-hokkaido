import stations from '@/data/jma-amedas-stations.json';
import type { RiskAssessment, WeatherPoint } from './types';

export interface ObservedSnow {
    available: boolean; observedAt: string | null; checkedAt: string;
    points: { point: string; station: string; stationId: string; distanceKm: number; snowfall24hCm: number }[];
    coverage: { available: number; total: number };
    url: string;
}
const base = 'https://www.jma.go.jp/bosai/amedas/';
const url = `${base}#area_type=offices&area_code=016000&format=table1h&elems=snow24h`;
function distance(a: WeatherPoint, b: {lat: number; lon: number}) {
    const rad = Math.PI / 180;
    const x = (a.lon - b.lon) * rad * Math.cos((a.lat + b.lat) / 2 * rad);
    return Math.hypot(x, (a.lat - b.lat) * rad) * 6371;
}
/** Snow24h is cm of observed snowfall, not snow depth. JMA quality flag 0 is
 * the only accepted value; absent/out-of-season/flagged values stay missing. */
export function selectObservedSnow(raw: unknown, observedAt: string, points: WeatherPoint[], now = new Date()): ObservedSnow {
    const result: ObservedSnow = { available: false, observedAt, checkedAt: now.toISOString(), points: [],
        coverage: { available: 0, total: points.length }, url };
    const age = now.getTime() - Date.parse(observedAt);
    if (!Number.isFinite(age) || age < 0 || age > 90 * 60_000 || !raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
    const valid = stations.stations.flatMap(station => {
        const value = (raw as Record<string, {snow24h?: unknown}>)[station.id]?.snow24h;
        return Array.isArray(value) && value.length === 2 && value[1] === 0 && typeof value[0] === 'number' &&
            Number.isFinite(value[0]) && value[0] >= 0 ? [{ ...station, snowfall24hCm: value[0] }] : [];
    });
    result.points = points.flatMap(point => {
        const nearest = valid.map(station => ({ ...station, distanceKm: distance(point, station) }))
            .filter(station => station.distanceKm <= 35).sort((a, b) => a.distanceKm - b.distanceKm)[0];
        return nearest ? [{ point: point.name, station: nearest.name, stationId: nearest.id,
            distanceKm: Math.round(nearest.distanceKm), snowfall24hCm: nearest.snowfall24hCm }] : [];
    });
    result.coverage.available = result.points.length;
    result.available = points.length > 0 && result.points.length === points.length;
    return result;
}
let cache: { expires: number; promise: Promise<{ raw: unknown; observedAt: string }> } | null = null;
async function observationMap() {
    if (cache && cache.expires > Date.now()) return cache.promise;
    const promise = (async () => {
        const latest = await fetch(`${base}data/latest_time.txt`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
        if (!latest.ok) throw new Error('AMeDAS time unavailable');
        const text = (await latest.text()).trim();
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(text)) throw new Error('AMeDAS time invalid');
        // Snow is hourly; ten-minute maps may not contain any snow measurements.
        const observedAt = `${text.slice(0, 13)}:00:00+09:00`;
        const stamp = observedAt.slice(0, 19).replace(/[-:T]/g, '');
        const response = await fetch(`${base}data/map/${stamp}.json`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error('AMeDAS observations unavailable');
        return { observedAt, raw: await response.json() as unknown };
    })();
    cache = { expires: Date.now() + 300_000, promise };
    try { return await promise; } catch (error) { cache = null; throw error; }
}
export async function getObservedSnow(points: WeatherPoint[], now = new Date()): Promise<ObservedSnow> {
    try { const {raw, observedAt} = await observationMap(); return selectObservedSnow(raw, observedAt, points, now); }
    catch { return { ...selectObservedSnow(null, '', points, now), observedAt: null }; }
}
export function withObservedSnow(risk: RiskAssessment, snow: ObservedSnow, target: number, now: Date): RiskAssessment {
    if (target < now.getTime() - 3_600_000 || target > now.getTime() + 3_600_000) return risk;
    const maximum = snow.points.reduce<ObservedSnow['points'][number] | null>((a,b) => !a || b.snowfall24hCm > a.snowfall24hCm ? b : a, null);
    if (maximum && maximum.snowfall24hCm >= 20) {
        const score = Math.max(risk.score ?? 0, maximum.snowfall24hCm >= 40 ? 80 : 55);
        return { ...risk, score, level: score >= 75 ? 'severe' : 'high', reasons: [
            `${maximum.station}で直前24時間に${maximum.snowfall24hCm}cmの降雪を観測（気象庁）`, ...risk.reasons] };
    }
    const winter = [12,1,2,3].includes(Number(new Intl.DateTimeFormat('en', {timeZone:'Asia/Tokyo',month:'numeric'}).format(now)));
    if (winter && !snow.available && risk.level === 'low') return { ...risk, score: null, level: 'unknown',
        reasons: ['近隣の降雪観測が不足しています。直前の大雪の影響を確認できません。', ...risk.reasons] };
    return risk;
}
