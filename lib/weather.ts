// Open-Meteo API クライアント（北海道・路線別・時間単位対応）
// APIキー不要・無料

import { WeatherForecast, WeatherWarning } from './types';
import { logger } from './logger';
import { getJMAWarningsForRoute } from './jma-warnings';
import { japanDate, japanTime } from './forecast/time';

// 路線別の代表座標（最も影響を受けやすい地点）
// 長距離路線は複数地点を設定し、最悪地点の気象を採用
export const ROUTE_COORDINATES: Record<string, { lat: number; lon: number; name: string }[]> = {
    // 札幌近郊
    'jr-hokkaido.hakodate-main': [
        { lat: 43.0621, lon: 141.3544, name: '札幌' },
        { lat: 43.2000, lon: 140.9833, name: '小樽' },
        { lat: 43.3333, lon: 141.9167, name: '岩見沢' },
    ],
    'jr-hokkaido.chitose': [
        { lat: 42.7752, lon: 141.6922, name: '千歳' },
    ],
    'jr-hokkaido.sassho': [
        { lat: 43.2167, lon: 141.3500, name: '石狩当別' },
    ],
    // 道央
    'jr-hokkaido.muroran-main': [
        { lat: 42.3150, lon: 140.9736, name: '室蘭' },
        { lat: 42.6333, lon: 141.6000, name: '苫小牧' },
    ],
    'jr-hokkaido.hidaka': [
        { lat: 42.4833, lon: 142.0500, name: '日高門別' },
    ],
    // 道南
    'jr-hokkaido.hakodate-south': [
        { lat: 41.7686, lon: 140.7289, name: '函館' },
        { lat: 42.5000, lon: 140.2333, name: '長万部' },
    ],
    // 道北
    'jr-hokkaido.soya-main': [
        { lat: 45.4167, lon: 141.6833, name: '稚内' },
        { lat: 44.3500, lon: 142.3833, name: '名寄' },
    ],
    'jr-hokkaido.rumoi': [
        { lat: 43.9500, lon: 141.6333, name: '留萌' },
    ],
    // 道東
    'jr-hokkaido.sekihoku-main': [
        { lat: 43.8000, lon: 143.9000, name: '北見' },
        { lat: 43.7706, lon: 142.3650, name: '上川（白滝）' },
    ],
    'jr-hokkaido.senmo-main': [
        { lat: 44.0200, lon: 144.2700, name: '網走' },
        { lat: 42.9849, lon: 144.3816, name: '釧路' },
    ],
    'jr-hokkaido.nemuro-main': [
        { lat: 42.9200, lon: 143.2000, name: '帯広' },
        { lat: 42.9849, lon: 144.3816, name: '釧路' },
    ],
    'jr-hokkaido.furano': [
        { lat: 43.3500, lon: 142.3833, name: '富良野' },
    ],
    'jr-hokkaido.sekisho': [
        { lat: 43.0000, lon: 142.7500, name: '占冠' },
        { lat: 42.9200, lon: 143.2000, name: '帯広' },
    ],
};

// デフォルト座標（札幌）
const DEFAULT_LAT = 43.0621;
const DEFAULT_LON = 141.3544;

// 座標間の距離を計算 (Haversine formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Find the nearest weather observation point from the given coordinates.
 * @param lat Latitude
 * @param lon Longitude
 * @returns Object containing the ID and name of the nearest point.
 */
export function findNearestWeatherPoint(lat: number, lon: number): { id: string; name: string } {
    let nearestPoint = 'jr-hokkaido.hakodate-main'; // デフォルト札幌
    let minDistance = Infinity;

    Object.entries(ROUTE_COORDINATES).forEach(([id, points]) => {
        // 各路線の全地点から最も近いものを探す
        for (const point of points) {
            const dist = calculateDistance(lat, lon, point.lat, point.lon);
            if (dist < minDistance) {
                minDistance = dist;
                nearestPoint = id;
            }
        }
    });

    return {
        id: nearestPoint,
        name: ROUTE_COORDINATES[nearestPoint][0].name
    };
}

/**
 * Get the primary (first) coordinates for a specific route ID or use provided coordinates.
 * For multi-point weather, use getRouteAllCoordinates() instead.
 * Defaults to Sapporo if neither is valid.
 */
export function getRouteCoordinates(routeId?: string, coordinates?: { lat: number; lon: number }): { lat: number; lon: number } {
    if (coordinates) {
        logger.debug('Using provided user coordinates', { coordinates });
        return coordinates;
    }

    if (routeId && ROUTE_COORDINATES[routeId]) {
        const primary = ROUTE_COORDINATES[routeId][0];
        const coords = { lat: primary.lat, lon: primary.lon };
        logger.debug('Using route-specific coordinates', {
            routeId,
            coords,
            name: primary.name
        });
        return coords;
    }
    logger.debug('Using default coordinates (Sapporo)', { routeId });
    return { lat: DEFAULT_LAT, lon: DEFAULT_LON };
}

/**
 * Get all coordinates for a route (multiple observation points for long routes).
 */
export function getRouteAllCoordinates(routeId?: string): { lat: number; lon: number; name: string }[] {
    if (routeId && ROUTE_COORDINATES[routeId]) {
        return ROUTE_COORDINATES[routeId];
    }
    return [{ lat: DEFAULT_LAT, lon: DEFAULT_LON, name: '札幌（デフォルト）' }];
}

interface OpenMeteoHourlyResponse {
    latitude: number;
    longitude: number;
    timezone: string;
    hourly: {
        time: string[];
        temperature_2m: number[];
        precipitation: number[];
        wind_speed_10m: number[];
        wind_gusts_10m: number[];
        snow_depth: number[];
        weather_code: number[];
        snowfall?: number[];
        winddirection_10m: number[]; //
        pressure_msl?: number[]; //
    };
}

interface _OpenMeteoDailyResponse {
    latitude: number;
    longitude: number;
    timezone: string;
    daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        wind_speed_10m_max: number[];
        wind_gusts_10m_max: number[];
        snowfall_sum: number[];
    };
}

// 天気コードから天気名（日本語）
export function getWeatherName(code: number): string {
    if (code === 0) return '快晴';
    if (code <= 3) return '晴れ';
    if (code <= 48) return '曇り';
    if (code <= 67) return '雨';
    if (code <= 77) return '雪';
    if (code <= 82) return '雨';
    if (code <= 86) return '雪';
    if (code <= 99) return '雷雨';
    return '不明';
}

// 擬似警報生成（時間単位データ用） — JMA公式データ取得失敗時のフォールバック
export function generateWarningsFromHourly(
    precipitation: number,
    windSpeed: number,
    snowfall: number, // snowfall (intensity) instead of depth
    windGust: number
): WeatherWarning[] {
    const warnings: WeatherWarning[] = [];
    const now = new Date().toISOString();

    // 暴風警報（風速23m/s以上） - JMA基準より少し高めに設定（APIの過大評価補正）
    if (windSpeed >= 23) {
        warnings.push({ type: '暴風警報', area: '北海道', issuedAt: now, source: 'pseudo' });
    } else if (windSpeed >= 16 || windGust >= 35) {
        // 平均16m/s以上で注意報
        warnings.push({ type: '暴風注意報', area: '北海道', issuedAt: now, source: 'pseudo' });
    }

    // 大雨警報（1時間降水量30mm以上）
    if (precipitation >= 30) {
        warnings.push({ type: '大雨警報', area: '北海道', issuedAt: now, source: 'pseudo' });
    } else if (precipitation >= 10) {
        warnings.push({ type: '大雨注意報', area: '北海道', issuedAt: now, source: 'pseudo' });
    }

    // 大雪警報（強度ベース）
    // 気象庁基準はおおむね「12時間降雪量が30-40cm」など。時間当たり3-4cm続くと警報級。
    if (snowfall >= 4) {
        warnings.push({ type: '大雪警報', area: '北海道', issuedAt: now, source: 'pseudo' });
    }

    return warnings;
}

export interface WeatherSeries { hours: WeatherForecast[]; fetchedAt: string }
const seriesCache = new Map<string, { expires: number; value: Promise<WeatherSeries> }>();
const SERIES_TTL_MS = 900_000;
/** 取得に失敗したとき、直前に取れた予報をこの時間までは使う(取得時刻は元のまま返すので、画面に「◯時時点」と出せる) */
export const STALE_WEATHER_MAX_MS = 6 * 3_600_000;
const lastGood = new Map<string, WeatherSeries>();
const pointKey = (p: { lat: number; lon: number }) => `${p.lat},${p.lon}`;
const remember = (p: { lat: number; lon: number }, series: WeatherSeries) => { lastGood.set(pointKey(p), series); return series; };
function staleOrThrow(p: { lat: number; lon: number }, error: unknown): WeatherSeries {
    const kept = lastGood.get(pointKey(p));
    if (kept && Date.now() - Date.parse(kept.fetchedAt) <= STALE_WEATHER_MAX_MS) return kept;
    throw error;
}
/** テスト用 */
export function __resetWeatherCache() { seriesCache.clear(); lastGood.clear(); }
const HOURLY_VARS = 'temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,snow_depth,weather_code,snowfall,winddirection_10m,pressure_msl';
const seriesKey = (p: { lat: number; lon: number }) => `${p.lat},${p.lon}:${japanDate()}`;

/** Open-Meteo の hourly を WeatherForecast[] に。欠損・負値の時刻は捨てる(晴れ扱いにしない)。 */
export function seriesFromHourly(h: OpenMeteoHourlyResponse['hourly'] | undefined): WeatherForecast[] {
    if (!h || !Array.isArray(h.time)) throw new Error('Invalid weather response');
    const hours: WeatherForecast[] = [];
    h.time.forEach((time, i) => {
        const required = [h.temperature_2m?.[i], h.precipitation?.[i], h.wind_speed_10m?.[i],
            h.wind_gusts_10m?.[i], h.snowfall?.[i], h.snow_depth?.[i], h.weather_code?.[i]];
        if (!required.every(v => typeof v === 'number' && Number.isFinite(v))) return;
        if ([h.precipitation[i], h.wind_speed_10m[i], h.wind_gusts_10m[i], h.snowfall![i], h.snow_depth[i]].some(v => v < 0)) return;
        hours.push({
            date: time.split('T')[0], targetTime: time.split('T')[1].slice(0, 5),
            weather: getWeatherName(h.weather_code[i]), weatherCode: h.weather_code[i],
            temperature: h.temperature_2m[i], tempMax: h.temperature_2m[i], tempMin: h.temperature_2m[i],
            precipitation: h.precipitation[i], windSpeed: h.wind_speed_10m[i],
            windGust: h.wind_gusts_10m[i], snowfall: h.snowfall![i], snowDepth: h.snow_depth[i],
            snowDepthChange: i > 0 && Number.isFinite(h.snow_depth[i-1]) ? (h.snow_depth[i] - h.snow_depth[i-1]) * 100 : undefined,
            windDirection: h.winddirection_10m?.[i], pressure: h.pressure_msl?.[i], warnings: [],
        });
    });
    if (!hours.length) throw new Error('Weather response contains no usable hours');
    return hours;
}

/** One seven-day hourly fetch serves the selected time, timeline and week.
 * Units: wind m/s, snowfall cm/hour, snow depth metres, precipitation mm/hour.
 * Missing values are omitted, never coerced to fair weather. */
export async function fetchWeatherSeries(coordinates: { lat: number; lon: number }): Promise<WeatherSeries> {
    const { lat, lon } = coordinates;
    const key = seriesKey(coordinates);
    const cached = seriesCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    const value = (async () => {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&hourly=${HOURLY_VARS}&timezone=Asia/Tokyo&wind_speed_unit=ms&forecast_days=7&past_days=1`,
            { cache: 'no-store', signal: AbortSignal.timeout(8000) } // own 15-min cache; Next's stale-while-revalidate once served a month-old forecast
        );
        if (!response.ok) throw new Error(`Weather source unavailable (${response.status})`);
        const data: OpenMeteoHourlyResponse = await response.json();
        return remember(coordinates, { hours: seriesFromHourly(data.hourly), fetchedAt: new Date().toISOString() });
    })();
    if (seriesCache.size >= 200) seriesCache.delete(seriesCache.keys().next().value!);
    seriesCache.set(key, { expires: Date.now() + SERIES_TTL_MS, value });
    try { return await value; }
    catch (error) { seriesCache.delete(key); return staleOrThrow(coordinates, error); }
}

/**
 * 複数地点を1回のリクエストでまとめて取得し、地点ごとのキャッシュに入れる。
 * 共有IPからの並列リクエストはレート制限に当たりやすいため、全路線ボードはこれを使う。
 * 戻り値は入力と同じ順。取れなかった地点は Error。
 */
export async function fetchWeatherSeriesBatch(points: { lat: number; lon: number }[], fetchImpl: typeof fetch = fetch): Promise<(WeatherSeries | Error)[]> {
    const missing = points.filter(p => { const c = seriesCache.get(seriesKey(p)); return !c || c.expires <= Date.now(); });
    const unique = missing.filter((p, i) => missing.findIndex(q => q.lat === p.lat && q.lon === p.lon) === i);
    if (unique.length) {
        const batch = (async () => {
            const response = await fetchImpl(
                `https://api.open-meteo.com/v1/forecast?latitude=${unique.map(p => p.lat).join(',')}&longitude=${unique.map(p => p.lon).join(',')}` +
                `&hourly=${HOURLY_VARS}&timezone=Asia/Tokyo&wind_speed_unit=ms&forecast_days=7&past_days=1`,
                { cache: 'no-store', signal: AbortSignal.timeout(12000) });
            if (!response.ok) throw new Error(`Weather source unavailable (${response.status})`);
            const data = await response.json() as OpenMeteoHourlyResponse | OpenMeteoHourlyResponse[];
            const list = Array.isArray(data) ? data : [data];
            if (list.length !== unique.length) throw new Error('Weather response location count mismatch');
            return list;
        })();
        const fetchedAt = new Date().toISOString();
        unique.forEach((p, i) => {
            const value = batch.then(list => remember(p, { hours: seriesFromHourly(list[i].hourly), fetchedAt }));
            value.catch(() => seriesCache.delete(seriesKey(p)));
            seriesCache.set(seriesKey(p), { expires: Date.now() + SERIES_TTL_MS, value });
        });
    }
    return Promise.all(points.map(p => (seriesCache.get(seriesKey(p))?.value ?? fetchWeatherSeries(p))
        .catch((e: unknown) => { try { return staleOrThrow(p, e); } catch { return e instanceof Error ? e : new Error(String(e)); } })));
}

export async function fetchHourlyWeatherForecast(
    routeId?: string, targetDateTime?: string, coordinates?: { lat: number; lon: number }
): Promise<WeatherForecast | null> {
    try {
        const { hours } = await fetchWeatherSeries(getRouteCoordinates(routeId, coordinates));
        const target = targetDateTime || `${japanDate()}T${japanTime()}`;
        const [date, time] = target.split('T');
        const entry = hours.find(h => h.date === date && h.targetTime === `${time.slice(0, 2)}:00`);
        if (!entry) return null;
        const index = hours.indexOf(entry);
        const nearNow = Math.abs(Date.parse(`${date}T${entry.targetTime}:00+09:00`) - Date.now()) < 3_600_000;
        const officialWarnings = nearNow ? await getJMAWarningsForRoute(routeId || '') : null;
        return { ...entry, warnings: officialWarnings || [], surroundingHours: hours.slice(Math.max(0, index-12), index+13) };
    } catch (error) {
        logger.error('Failed to fetch hourly weather', error);
        return null;
    }
}

export async function fetchDailyWeatherForecast(routeId?: string, coordinates?: { lat: number; lon: number }): Promise<WeatherForecast[]> {
    try {
        const { hours } = await fetchWeatherSeries(getRouteCoordinates(routeId, coordinates));
        const grouped = new Map<string, WeatherForecast[]>();
        for (const hour of hours) {
            if (hour.date < japanDate()) continue;
            grouped.set(hour.date, [...(grouped.get(hour.date) || []), hour]);
        }
        return [...grouped.entries()].map(([date, day]) => ({
            ...day[Math.floor(day.length / 2)], date,
            tempMax: Math.max(...day.map(h => h.tempMax)), tempMin: Math.min(...day.map(h => h.tempMin)),
            // The legacy risk model expects hourly intensities, not daily totals.
            precipitation: Math.max(...day.map(h => h.precipitation)),
            snowfall: Math.max(...day.map(h => h.snowfall ?? 0)),
            snowDepth: Math.max(...day.map(h => h.snowDepth ?? 0)),
            windSpeed: Math.max(...day.map(h => h.windSpeed)), windGust: Math.max(...day.map(h => h.windGust ?? 0)),
            surroundingHours: day, warnings: [],
        }));
    } catch (error) {
        logger.error('Failed to fetch daily weather', error);
        return [];
    }
}

/**
 * Fetch active weather warnings for major areas in Hokkaido.
 * @returns Array of areas with their active warnings.
 */
export async function fetchAllHokkaidoWarnings(): Promise<Array<{ area: string; warnings: WeatherWarning[] }>> {
    const results: Array<{ area: string; warnings: WeatherWarning[] }> = [];

    // 主要地域の代表地点
    const targetAreas = [
        { id: 'jr-hokkaido.hakodate-main', area: '石狩・空知・後志（札幌周辺）' },
        { id: 'jr-hokkaido.chitose', area: '石狩・胆振（千歳周辺）' },
        { id: 'jr-hokkaido.hakodate', area: '渡島・檜山（函館周辺）' },
        { id: 'jr-hokkaido.sekihoku', area: '網走・北見・紋別' },
        { id: 'jr-hokkaido.nemuro', area: '釧路・根室' },
        { id: 'jr-hokkaido.soya', area: '宗谷・上川（旭川周辺）' },
        { id: 'jr-hokkaido.hidaka', area: '日高・胆振東部' }
    ];

    try {
        const promises = targetAreas.map(async (target) => {
            // 現在の天気を取得（警告判定のためfetchHourlyWeatherForecastを再利用）
            // 未来予測を含めた直近の警報状態を知りたいため、現在時刻で取得
            const forecast = await fetchHourlyWeatherForecast(target.id);
            if (forecast && forecast.warnings.length > 0) {
                return {
                    area: target.area,
                    warnings: forecast.warnings.map(w => ({ ...w, area: target.area }))
                };
            }
            return null;
        });

        const fetchResults = await Promise.all(promises);
        fetchResults.forEach(r => {
            if (r) results.push(r);
        });

    } catch (error) {
        logger.error('Failed to fetch all Hokkaido warnings', error);
    }

    return results;
}

// 互換性のため（既存コードで使用）
export async function fetchRealWeatherForecast(routeId?: string, coordinates?: { lat: number; lon: number }): Promise<WeatherForecast[]> {
    return fetchDailyWeatherForecast(routeId, coordinates);
}
