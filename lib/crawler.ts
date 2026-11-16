import { getAdminSupabaseClient } from '@/lib/supabase';
import { JR_JSON_URLS, ROUTE_DEFINITIONS, extractNumericalStatus } from '@/lib/jr-status';
import { logger } from '@/lib/logger';
import crypto from 'node:crypto';
import { classifyOfficialObservation, hasExplicitAreaAllClear, specificRouteKeywords, officialPublishedAt } from './official-observation';

import crawlerConfig from '../data/crawler-config.json';

const BASE_URL = 'https://www3.jrhokkaido.co.jp/webunkou/json/area/area_';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Exclude keywords (non-weather causes)
const EXCLUDE_KEYWORDS = ['鹿', '人身', '信号', '車両', '線路支障', '倒木', '点検', '工事'];

// ----- Weather Snapshot Fetching -----

interface WeatherSnapshot {
    evidence?: { url: string; fetchedAt: string; kind: string; payload: unknown };
    temperature: number | null;
    wind_speed: number | null;
    wind_gust: number | null;
    snowfall: number | null;
    precipitation: number | null;
    snow_depth: number | null;
    weather_code: number | null;
    wind_direction: number | null;
    pressure_msl: number | null;
    visibility: number | null;
}

const NULL_SNAPSHOT: WeatherSnapshot = {
    temperature: null, wind_speed: null, wind_gust: null,
    snowfall: null, precipitation: null, snow_depth: null,
    weather_code: null, wind_direction: null, pressure_msl: null, visibility: null
};

const WEATHER_TIMEOUT_MS = 8000;
const WEATHER_RETRY_DELAYS_MS = [1500, 4000];

export interface WeatherAttempt { status?: number; error?: string; retryAfter?: string | null }

/**
 * 全エリアの代表座標で現在の天気を1回のリクエストでまとめて取得 (Open-Meteo, 複数地点指定)。
 * 共有IPからの5並列リクエストはレート制限に当たりやすいため1リクエストに集約し、
 * 429/5xx/タイムアウト時のみ待機して再試行する。失敗理由は attempts として返し、収集記録に残す。
 */
export async function fetchAreaWeather(
    areas: Array<{ id: string; lat: number; lon: number }>,
    fetchImpl: typeof fetch = fetch,
    sleep: (ms: number) => Promise<void> = ms => new Promise(r => setTimeout(r, ms)),
): Promise<{ byArea: Record<string, WeatherSnapshot>; attempts: WeatherAttempt[] }> {
    const byArea: Record<string, WeatherSnapshot> = Object.fromEntries(areas.map(a => [a.id, { ...NULL_SNAPSHOT }]));
    const attempts: WeatherAttempt[] = [];
    if (areas.length === 0) return { byArea, attempts };

    const params = new URLSearchParams({
        latitude: areas.map(a => a.lat).join(','),
        longitude: areas.map(a => a.lon).join(','),
        current: [
            'temperature_2m', 'wind_speed_10m', 'wind_gusts_10m',
            'snowfall', 'precipitation', 'snow_depth',
            'weather_code', 'wind_direction_10m', 'pressure_msl'
        ].join(','),
        timezone: 'Asia/Tokyo',
        wind_speed_unit: 'kmh' // Legacy training store uses km/h; never mix with m/s prediction inputs.
    });
    const url = `${OPEN_METEO_URL}?${params}`;

    for (let i = 0; i <= WEATHER_RETRY_DELAYS_MS.length; i++) {
        let retryable = false;
        try {
            const res = await fetchImpl(url, { cache: 'no-store', signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS) });
            if (!res.ok) {
                attempts.push({ status: res.status, retryAfter: res.headers.get('retry-after') });
                retryable = res.status === 429 || res.status >= 500;
            } else {
                const data = await res.json();
                // 1地点ならオブジェクト、複数地点なら配列で返る
                const list: unknown[] = Array.isArray(data) ? data : [data];
                if (list.length !== areas.length) {
                    attempts.push({ status: res.status, error: `location count mismatch: ${list.length}/${areas.length}` });
                    break;
                }
                const fetchedAt = new Date().toISOString();
                areas.forEach((area, idx) => {
                    const payload = list[idx] as { current?: Record<string, number | null> };
                    const current = payload?.current;
                    if (!current) return;
                    byArea[area.id] = {
                        temperature: current.temperature_2m ?? null,
                        wind_speed: current.wind_speed_10m ?? null,
                        wind_gust: current.wind_gusts_10m ?? null,
                        snowfall: current.snowfall ?? null,
                        precipitation: current.precipitation ?? null,
                        snow_depth: current.snow_depth ?? null,
                        weather_code: current.weather_code ?? null,
                        wind_direction: current.wind_direction_10m ?? null,
                        pressure_msl: current.pressure_msl ?? null,
                        visibility: null, // Open-Meteo current does not include visibility.
                        evidence: { url, fetchedAt, kind: 'model-current-15min', payload }
                    };
                });
                attempts.push({ status: res.status });
                return { byArea, attempts };
            }
        } catch (e) {
            const name = (e as Error)?.name;
            attempts.push({ error: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : String((e as Error)?.message ?? e).slice(0, 200) });
            retryable = true;
        }
        if (!retryable || i === WEATHER_RETRY_DELAYS_MS.length) break;
        await sleep(WEATHER_RETRY_DELAYS_MS[i]);
    }
    logger.warn('Weather snapshot fetch failed', { attempts });
    return { byArea, attempts };
}

// ----- 追加の収集(後から取り戻せないもの) -----

/**
 * 運行フィード以外で、過去分を後から取得できないデータ。内容が変わったときだけ保存する
 * (変化なし・失敗は収集記録の summary.extras に残す)。失敗しても本体の収集は成功扱いのまま。
 * - map: JRの影響マップ(区間ごとの状態。1=情報なし 2=運休・遅延 3=災害等の見合わせ 9=バス代行)
 * - jma:<府県予報区>: 気象庁の警報・注意報(北海道の8予報区)
 * - bus:chuo: 北海道中央バスの運休情報(代替手段が使えるかの判断材料)
 */
export const EXTRA_SOURCES: { id: string; url: string; kind: 'json' | 'text' }[] = [
    { id: 'map', url: 'https://www3.jrhokkaido.co.jp/webunkou/json/map/eikyo_map_status.json', kind: 'json' },
    ...['011000', '012000', '013000', '014030', '014100', '015000', '016000', '017000']
        .map(code => ({ id: `jma:${code}`, url: `https://www.jma.go.jp/bosai/warning/data/r8/${code}.json`, kind: 'json' as const })),
    { id: 'bus:chuo', url: 'https://www.chuo-bus.co.jp/support/stop/?ope=feed&topic=stop_top', kind: 'text' },
];

type ExtraOutcome = 'saved' | 'unchanged' | string;

export async function collectExtras(
    supabase: NonNullable<ReturnType<typeof getAdminSupabaseClient>>, fetchImpl: typeof fetch = fetch,
): Promise<Record<string, ExtraOutcome>> {
    const out: Record<string, ExtraOutcome> = {};
    await Promise.all(EXTRA_SOURCES.map(async src => {
        try {
            const res = await fetchImpl(src.url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
            if (!res.ok) { out[src.id] = `error: HTTP ${res.status}`; return; }
            const text = (await res.text()).replace(/^\uFEFF/, '');
            const payload = src.kind === 'json' ? JSON.parse(text) : { text };
            const hash = hashContent(src.kind === 'json' ? JSON.stringify(payload) : text);
            const { data: last } = await supabase.from('crawler_logs').select('content_hash')
                .eq('area_id', src.id).order('fetched_at', { ascending: false }).limit(1);
            if (last?.[0]?.content_hash === hash) { out[src.id] = 'unchanged'; return; }
            const { error } = await supabase.from('crawler_logs').insert({
                area_id: src.id, raw_json: payload, content_hash: hash, status: 'success',
                source_url: src.url, collector_version: 'extras-v1',
            });
            out[src.id] = error ? `error: ${error.message}`.slice(0, 120) : 'saved';
        } catch (e) {
            out[src.id] = `error: ${(e as Error)?.name === 'TimeoutError' ? 'timeout' : String((e as Error)?.message ?? e)}`.slice(0, 120);
        }
    }));
    return out;
}

// ----- Content Hash for Deduplication -----

function hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
}

// ----- Main Crawler -----

export async function runJRCrawler() {
    const supabase = getAdminSupabaseClient();
    if (!supabase) {
        logger.error('❌ Supabase ADMIN client not available');
        return { success: false, error: 'Supabase configuration missing' };
    }

    logger.info('🚀 Starting JR Hokkaido Crawler (ML Enhanced)...');

    const now = new Date();
    const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const month = jstNow.getMonth() + 1;
    const hour = jstNow.getHours();
    const dayOfWeek = jstNow.getDay();
    const date = `${jstNow.getFullYear()}-${String(month).padStart(2, '0')}-${String(jstNow.getDate()).padStart(2, '0')}`;
    const time = jstNow.toLocaleTimeString('en-US', { hour12: false });

    const results: Array<{ area: string; saved: number }> = [];

    // Fetch weather for all areas in parallel
    const areaConfigs = crawlerConfig.areas as Array<{ id: string; name: string; lat: number; lon: number }>;
    const { byArea: weatherByArea, attempts: weatherAttempts } = await fetchAreaWeather(areaConfigs);

    // Collect all ML training rows for batch insert
    const mlBatch: Array<Record<string, unknown>> = [];

    // Process all areas in PARALLEL for speed (Vercel 10s limit)
    const areaResults = await Promise.allSettled(JR_JSON_URLS.map(async (area) => {
        const url = `${BASE_URL}${area.id}.json`;
        const areaML: Array<Record<string, unknown>> = [];
        let savedCount = 0;

        const response = await fetch(url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(5000) // Explicit 5s timeout
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const json = JSON.parse(text.replace(/^\uFEFF/, ''));

        // Content hash for dedup
        const contentHash = hashContent(JSON.stringify(json));

        const { data: logData, error: logError } = await supabase
            .from('crawler_logs')
            .insert({
                area_id: area.id,
                raw_json: json, // Keep independently replayable provenance for every collected observation.
                content_hash: contentHash,
                status: 'success',
                source_url: url,
                collector_version: 'verified-source-v3.1',
                weather_snapshot: weatherByArea[area.id]?.evidence ?? null
            })
            .select('id')
            .single();

        if (logError) {
            logger.error(`❌ Failed to log for ${area.name}:`, logError);
            throw new Error(`Provenance logging failed for area ${area.id}`);
        }

        const published = officialPublishedAt(json.time);
        // Preserve stale raw feeds for review, but never label them as current.
        if (!published || now.getTime() - Date.parse(published) > 24 * 3600_000 || Date.parse(published) > now.getTime() + 5 * 60_000) {
            return { area: area.name, saved: 0, ml: areaML, labelStatus: 'stale-or-unverifiable' };
        }
        const gaikyoList = json.today?.gaikyo || [];
        const weather = weatherByArea[area.id];
        const routesWithStatus = new Set<string>();
        const routesIgnored = new Set<string>();

        // Helper: create ML row object
        const mkMlRow = (routeId: string, status: string, cause: string | null, details: string | null, delayMin: number | undefined, recTime: string | undefined) => ({
            recorded_at: now.toISOString(),
            area_id: area.id,
            route_id: routeId,
            train_status: status,
            delay_minutes: delayMin ?? null,
            recovery_time: recTime ?? null,
            cause,
            status_details: details?.substring(0, 500) ?? null,
            temperature: weather.temperature,
            wind_speed: weather.wind_speed,
            wind_gust: weather.wind_gust,
            snowfall: weather.snowfall,
            precipitation: weather.precipitation,
            snow_depth: weather.snow_depth,
            weather_code: weather.weather_code,
            wind_direction: weather.wind_direction,
            pressure_msl: weather.pressure_msl,
            visibility: weather.visibility,
            crawler_log_id: logData.id,
            month, hour, day_of_week: dayOfWeek
        });

        // Batch all status inserts for this area
        const statusInserts: Array<Record<string, unknown>> = [];

        for (const item of gaikyoList) {
            const content = (item.honbun || '') + (item.title || '');
            if (!content) continue;

            let matchedRouteId = null;
            const matches = ROUTE_DEFINITIONS.filter(def => (!def.validAreas || def.validAreas.includes(area.id)) && specificRouteKeywords(def.keywords).some(kw => content.includes(kw)));
            // A multi-route bulletin must be reviewed at section level before it becomes a label.
            if (matches.length !== 1) { for (const def of matches) routesIgnored.add(def.routeId); continue; }
            for (const def of matches) {
                if (def.validAreas && !def.validAreas.includes(area.id)) continue;
                if (specificRouteKeywords(def.keywords).some(kw => content.includes(kw))) {
                    matchedRouteId = def.routeId;
                    break;
                }
            }

            if (!matchedRouteId) continue;

            if (EXCLUDE_KEYWORDS.some(kw => content.includes(kw))) {
                routesIgnored.add(matchedRouteId);
                continue;
            }

            routesWithStatus.add(matchedRouteId);

            const status = classifyOfficialObservation(content);
            if (status === 'unknown') { routesIgnored.add(matchedRouteId); continue; }

            let cause = 'unknown';
            if (content.includes('雪')) cause = 'snow';
            else if (content.includes('風')) cause = 'wind';
            else if (content.includes('雨')) cause = 'rain';

            const { delayMinutes, recoveryTime } = extractNumericalStatus(content);

            statusInserts.push({
                date, time,
                route_id: matchedRouteId,
                status, cause,
                details: content,
                crawler_log_id: logData.id
            });

            areaML.push(mkMlRow(matchedRouteId, status, cause, content, delayMinutes, recoveryTime));
        }

        // Batch insert status history (1 call instead of N)
        if (statusInserts.length > 0) {
            const { error: batchErr } = await supabase
                .from('route_status_history')
                .insert(statusInserts);
            if (batchErr) {
                logger.error(`Failed to batch insert statuses for ${area.name}:`, batchErr);
                throw new Error(`History write failed for area ${area.id}`);
            } else {
                savedCount = statusInserts.length;
            }
        }

        // Normal routes (ネガティブサンプル) — collect
        const explicitAllClear = gaikyoList.length > 0 && gaikyoList.every((item: { honbun?: string }) => hasExplicitAreaAllClear(item.honbun || ''));
        const areaRoutes = ROUTE_DEFINITIONS.filter(r => r.validAreas?.includes(area.id));
        for (const route of areaRoutes) {
            if (explicitAllClear && !routesWithStatus.has(route.routeId) && !routesIgnored.has(route.routeId)) {
                areaML.push(mkMlRow(route.routeId, 'normal', null, '現在、遅れに関する情報はありません。', undefined, undefined));
            }
        }

        return { area: area.name, saved: savedCount, ml: areaML };
    }));

    // Collect results from parallel execution
    for (let i = 0; i < areaResults.length; i++) {
        const r = areaResults[i];
        if (r.status === 'fulfilled') {
            results.push({ area: r.value.area, saved: r.value.saved });
            mlBatch.push(...r.value.ml);
        } else {
            const area = JR_JSON_URLS[i];
            logger.error(`❌ Error fetching ${area.name}:`, r.reason);
            try {
                await supabase.from('crawler_logs').insert({
                    area_id: area.id,
                    raw_json: {},
                    status: 'error',
                    error_message: String(r.reason)
                });
            } catch { /* ignore error logging failure */ }
            results.push({ area: area.name, saved: 0 });
        }
    }

    // Batch insert all ML training data in one call
    let mlResult: { inserted: number; error?: string } = { inserted: 0 };
    if (mlBatch.length > 0) {
        logger.info(`[ML] Attempting batch insert: ${mlBatch.length} rows`);
        const { error: mlBatchErr } = await supabase
            .from('ml_training_data')
            .insert(mlBatch);
        if (mlBatchErr) {
            logger.error(`[ML] Batch insert FAILED: ${mlBatchErr.message}`, { code: mlBatchErr.code, details: mlBatchErr.details });
            mlResult = { inserted: 0, error: mlBatchErr.message };
        } else {
            logger.info(`[ML] ✅ ${mlBatch.length} rows inserted`);
            mlResult = { inserted: mlBatch.length };
        }
    }

    logger.info('🏁 Crawler finished (ML Enhanced).', { results });
    const extras = await collectExtras(supabase).catch(e => ({ all: `error: ${String(e)}`.slice(0, 120) }));
    const weatherMissing = areaConfigs.filter(area => !weatherByArea[area.id]?.evidence).map(area => area.id);
    return { success: areaResults.every(r => r.status === 'fulfilled') && !mlResult.error && weatherMissing.length === 0, results, ml: mlResult, weatherMissing, weatherAttempts, extras };
}
