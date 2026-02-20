import { getAdminSupabaseClient } from '@/lib/supabase';
import { JR_JSON_URLS, ROUTE_DEFINITIONS, extractNumericalStatus } from '@/lib/jr-status';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

import crawlerConfig from '../data/crawler-config.json';

const BASE_URL = 'https://www3.jrhokkaido.co.jp/webunkou/json/area/area_';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Exclude keywords (non-weather causes)
const EXCLUDE_KEYWORDS = ['鹿', '人身', '信号', '車両', '線路支障', '倒木', '点検', '工事'];

// ----- Weather Snapshot Fetching -----

interface WeatherSnapshot {
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

/**
 * エリアの代表座標で現在の天気を取得 (Open-Meteo Current Weather API)
 */
async function fetchCurrentWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
    const nullSnapshot: WeatherSnapshot = {
        temperature: null, wind_speed: null, wind_gust: null,
        snowfall: null, precipitation: null, snow_depth: null,
        weather_code: null, wind_direction: null, pressure_msl: null, visibility: null
    };

    try {
        const params = new URLSearchParams({
            latitude: lat.toString(),
            longitude: lon.toString(),
            current: [
                'temperature_2m', 'wind_speed_10m', 'wind_gusts_10m',
                'snowfall', 'precipitation', 'snow_depth',
                'weather_code', 'wind_direction_10m', 'pressure_msl'
            ].join(','),
            timezone: 'Asia/Tokyo'
        });

        const res = await fetch(`${OPEN_METEO_URL}?${params}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(5000) // 5s timeout
        });

        if (!res.ok) return nullSnapshot;

        const data = await res.json();
        const current = data.current;
        if (!current) return nullSnapshot;

        return {
            temperature: current.temperature_2m ?? null,
            wind_speed: current.wind_speed_10m ?? null,
            wind_gust: current.wind_gusts_10m ?? null,
            snowfall: current.snowfall ?? null,
            precipitation: current.precipitation ?? null,
            snow_depth: current.snow_depth ?? null,
            weather_code: current.weather_code ?? null,
            wind_direction: current.wind_direction_10m ?? null,
            pressure_msl: current.pressure_msl ?? null,
            visibility: null // Open-Meteo current doesn't include visibility
        };
    } catch (e) {
        logger.warn('Weather snapshot fetch failed', { lat, lon, error: e });
        return nullSnapshot;
    }
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
    const weatherByArea: Record<string, WeatherSnapshot> = {};
    await Promise.all(areaConfigs.map(async (area) => {
        weatherByArea[area.id] = await fetchCurrentWeather(area.lat, area.lon);
    }));

    // Collect all ML training rows for batch insert
    const mlBatch: Array<Record<string, unknown>> = [];

    for (const area of JR_JSON_URLS) {
        const url = `${BASE_URL}${area.id}.json`;

        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();
            const json = JSON.parse(text.replace(/^\uFEFF/, ''));

            // Content hash for dedup (computed locally, no extra DB query)
            const contentHash = hashContent(JSON.stringify(json));

            // Store log (raw_json always stored — dedup check moved to lightweight hash comparison)
            const { data: logData, error: logError } = await supabase
                .from('crawler_logs')
                .insert({
                    area_id: area.id,
                    raw_json: json,
                    content_hash: contentHash,
                    status: 'success'
                })
                .select('id')
                .single();

            if (logError) {
                logger.error(`❌ Failed to log for ${area.name}:`, logError);
                continue;
            }

            const gaikyoList = json.today?.gaikyo || [];
            let savedCount = 0;
            const weather = weatherByArea[area.id];
            const routesWithStatus = new Set<string>();

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
                month, hour, day_of_week: dayOfWeek,
                crawler_log_id: logData.id
            });

            for (const item of gaikyoList) {
                const content = (item.honbun || '') + (item.title || '');
                if (!content) continue;
                if (EXCLUDE_KEYWORDS.some(kw => content.includes(kw))) continue;

                let matchedRouteId = null;
                for (const def of ROUTE_DEFINITIONS) {
                    if (def.validAreas && !def.validAreas.includes(area.id)) continue;
                    if (def.keywords.some(kw => content.includes(kw))) {
                        matchedRouteId = def.routeId;
                        break;
                    }
                }

                if (matchedRouteId) {
                    routesWithStatus.add(matchedRouteId);

                    let status = 'normal';
                    if (content.includes('再開') || content.includes('平常')) status = 'normal';
                    if (content.includes('遅れ') || content.includes('遅延')) status = 'delayed';
                    if (content.includes('運休') || content.includes('見合')) status = 'suspended';

                    let cause = 'weather';
                    if (content.includes('雪')) cause = 'snow';
                    else if (content.includes('風')) cause = 'wind';
                    else if (content.includes('雨')) cause = 'rain';

                    const { delayMinutes, recoveryTime } = extractNumericalStatus(content);

                    // route_status_history (既存)
                    const { error: insertError } = await supabase
                        .from('route_status_history')
                        .insert({
                            date, time,
                            route_id: matchedRouteId,
                            status, cause,
                            details: content,
                            crawler_log_id: logData.id,
                            delay_minutes: delayMinutes,
                            recovery_time: recoveryTime
                        });

                    if (insertError) {
                        logger.error(`Failed to insert status for ${matchedRouteId}:`, insertError);
                    } else {
                        savedCount++;
                    }

                    // ML row (異常時) — collect, don't insert yet
                    mlBatch.push(mkMlRow(matchedRouteId, status, cause, content, delayMinutes, recoveryTime));
                }
            }

            // Normal routes (ネガティブサンプル) — collect
            const areaRoutes = ROUTE_DEFINITIONS.filter(r => r.validAreas?.includes(area.id));
            for (const route of areaRoutes) {
                if (!routesWithStatus.has(route.routeId)) {
                    mlBatch.push(mkMlRow(route.routeId, 'normal', null, null, undefined, undefined));
                }
            }

            results.push({ area: area.name, saved: savedCount });

        } catch (e) {
            logger.error(`❌ Error fetching ${area.name}:`, e);
            await supabase.from('crawler_logs').insert({
                area_id: area.id,
                raw_json: {},
                status: 'error',
                error_message: String(e)
            });
        }
    }

    // 🆕 Batch insert all ML training data in one call
    let mlResult: { inserted: number; error?: string } = { inserted: 0 };
    if (mlBatch.length > 0) {
        console.log(`[ML] Attempting batch insert: ${mlBatch.length} rows`);
        const { error: mlBatchErr } = await supabase
            .from('ml_training_data')
            .insert(mlBatch);
        if (mlBatchErr) {
            console.error(`[ML] Batch insert FAILED: ${mlBatchErr.message}`, mlBatchErr.code, mlBatchErr.details);
            mlResult = { inserted: 0, error: mlBatchErr.message };
        } else {
            console.log(`[ML] ✅ ${mlBatch.length} rows inserted`);
            mlResult = { inserted: mlBatch.length };
        }
    }

    logger.info('🏁 Crawler finished (ML Enhanced).', { results });
    return { success: true, results, ml: mlResult };
}
