import { HOKKAIDO_ROUTES, getStationById, getJRStatusUrl } from '@/lib/hokkaido-data';
import { fetchWeatherSeries, getRouteAllCoordinates } from '@/lib/weather';
import { fetchJRHokkaidoStatus, type JROperationStatus } from '@/lib/jr-status';
import { assessWeather, withCurrentWarnings } from './risk';
import { CORE_VERSION } from './core';
import { getJourneyWarnings } from '@/lib/jma-warnings';
import { getObservedSnow, withObservedSnow } from './observed-snow';
import { getBusAlternatives } from './alternatives';
import { addDays, japanDate } from './time';
import { estimateRecovery, officialRecoveryTime } from './recovery';
import { loadRecoveryEvidence } from './recovery-store';
import { winterCaseReferences } from './historical';
import type { JourneyForecast, PointForecast, WeatherPoint } from './types';

export { journeyRouteIds } from '@/lib/registry/journey-lines';
import { journeyRouteIds } from '@/lib/registry/journey-lines';

let officialCache: { expires: number; value: Promise<JROperationStatus[] | null> } | null = null;
async function officialSnapshot(): Promise<JROperationStatus[] | null> {
    if (officialCache && officialCache.expires > Date.now()) return officialCache.value;
    const value = fetchJRHokkaidoStatus().catch(() => null);
    officialCache = { expires: Date.now() + 180_000, value };
    const result = await value;
    if (!result && officialCache.value === value) officialCache = null;
    return result;
}

const cache = new Map<string, { expires: number; value: Promise<JourneyForecast> }>();
export async function getJourneyForecast(request: JourneyForecast['request']): Promise<JourneyForecast> {
    const key = JSON.stringify(request);
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;
    const value = buildJourneyForecast(request);
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 60_000, value });
    try {
        const result = await value;
        if (result.current.level === 'unknown') cache.delete(key);
        return result;
    } catch (error) { cache.delete(key); throw error; }
}

async function buildJourneyForecast(request: JourneyForecast['request']): Promise<JourneyForecast> {
    const ids = journeyRouteIds(request.departureId, request.arrivalId);
    if (!ids) throw new Error('UNSUPPORTED_JOURNEY');
    const points: WeatherPoint[] = ids.flatMap(id => getRouteAllCoordinates(id));
    for (const id of [request.departureId, request.arrivalId]) {
        const station = getStationById(id)!;
        if (station.lat != null && station.lon != null && !points.some(p => Math.abs(p.lat - station.lat!) < 0.02 && Math.abs(p.lon - station.lon!) < 0.02)) {
            points.push({ name: station.name, lat: station.lat, lon: station.lon });
        }
    }
    const unique = points.filter((p, i) => points.findIndex(other => other.lat === p.lat && other.lon === p.lon) === i);
    const [weatherResults, officialItems, warnings, observedSnow, buses] = await Promise.all([
        Promise.allSettled(unique.map(async point => ({ point, ...await fetchWeatherSeries(point) }))),
        officialSnapshot(),
        getJourneyWarnings(ids),
        getObservedSnow(unique),
        getBusAlternatives(request.departureId, request.arrivalId, request.date, request.time),
    ]);
    const weather = weatherResults.flatMap(r => r.status === 'fulfilled' ? [r.value as PointForecast] : []);
    const now = new Date();
    // The feed parser verifies present-tense status; retain its restart plan.
    const matches = ids.map(id => officialItems?.find(i => i.routeId === id || (id === 'jr-hokkaido.sassho' && i.routeId === 'jr-hokkaido.gakuentoshi')))
        .map(item => item);
    const rank: Record<string, number> = { suspended: 4, cancelled: 4, partial: 3, delay: 2, normal: 1 };
    const matched = matches.filter((m): m is JROperationStatus => !!m).sort((a, b) => rank[b.status] - rank[a.status])[0];
    const complete = matches.every(Boolean);
    const officialStatus = matched && (matched.status !== 'normal' || complete) ? matched.status : 'unknown';
    const disrupted = ['suspended', 'cancelled', 'partial'].includes(officialStatus);
    const history = disrupted && matched ? await loadRecoveryEvidence(matched.routeId, now) : { incidents: [], startedAt: null, cause: 'unknown', available: false };
    const officialText = matched?.rawText || matched?.statusText || '';
    const recovery = estimateRecovery({
        disrupted, officialText, officialExpectedAt: officialRecoveryTime(officialText, now),
        routeId: matched?.routeId || ids[0], ...history, now,
    });
    const assess = (date: string, time: string) => {
        const at = Date.parse(`${date}T${time}:00+09:00`);
        return { date, time, ...withCurrentWarnings(withObservedSnow(
            assessWeather(weather, unique.length, date, time), observedSnow, at, now), warnings, at, now) };
    };
    const target = Date.parse(`${request.date}T${request.time}:00+09:00`);
    const hourly = Array.from({ length: 9 }, (_, i) => {
        const instant = new Date(target + (i - 2) * 3_600_000);
        const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', hourCycle: 'h23' }).format(instant) + ':00';
        return assess(japanDate(instant), time);
    }).filter(slot => slot.date >= japanDate(now) && slot.date <= addDays(japanDate(now), 6));
    const daily = Array.from({ length: 7 }, (_, i) => assess(addDays(japanDate(now), i), request.time));
    return {
        modelVersion: CORE_VERSION, calibrated: false, generatedAt: now.toISOString(), request,
        route: { id: ids[0], lines: ids.map(id => ({ id, name: HOKKAIDO_ROUTES.find(r => r.id === id)?.name || id })), name: ids.map(id => HOKKAIDO_ROUTES.find(r => r.id === id)?.name || id).join('・'),
            scope: '経由する路線の代表地点を評価しています。乗車区間外の地点も含み、個別列車の運休判定ではありません。', points: unique.map(p => p.name) },
        current: assess(request.date, request.time), hourly, daily, warnings, observedSnow, buses,
        official: { status: officialStatus, text: officialStatus === 'unknown' ? '対象路線の現在の運行状態を確認できていません' : officialText,
            checkedAt: matched?.updatedAt || null, publishedAt: matched?.publishedAt || null, url: getJRStatusUrl(ids[0]).url },
        winterCases: winterCaseReferences(ids, now),
        sources: { weatherFetchedAt: weather.map(p => p.fetchedAt).sort()[0] || null,
            forecastHoursAhead: Math.max(0, (target - now.getTime()) / 3_600_000) }, recovery, historyAvailable: history.available,
    };
}
