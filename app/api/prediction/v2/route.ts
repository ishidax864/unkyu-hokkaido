
import { NextRequest, NextResponse } from 'next/server';
import { fetchHourlyWeatherForecast } from '@/lib/weather';

export const dynamic = 'force-dynamic'; // Disable caching for real-time predictions
import { calculateSuspensionRisk } from '@/lib/prediction-engine';
import { logger } from '@/lib/logger';
import { PredictionInput, HourlyRiskData, WeatherForecast } from '@/lib/types';

import { getHistoricalSuspensionRate, getOfficialRouteHistory, savePredictionHistory } from '@/lib/supabase';
import { aggregateCrowdsourcedStatusAsync } from '@/lib/user-reports';
import { fetchJRHokkaidoStatus, ROUTE_DEFINITIONS } from '@/lib/jr-status';
import { extractResumptionTime } from '@/lib/text-parser';
import { buildCacheKey, getFromCache, setCache } from '@/lib/prediction-cache';
import { JRStatusItem } from '@/lib/types';

// --- Live JR Status Cache (shared across requests, same TTL as banner) ---
let liveJrCache: { data: Awaited<ReturnType<typeof fetchJRHokkaidoStatus>>; ts: number } | null = null;
const LIVE_JR_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

async function fetchLiveJRStatus(routeId: string): Promise<JRStatusItem | null> {
    try {
        // Use cached live data if fresh
        if (!liveJrCache || Date.now() - liveJrCache.ts >= LIVE_JR_CACHE_TTL) {
            const items = await fetchJRHokkaidoStatus();
            liveJrCache = { data: items, ts: Date.now() };
        }

        const items = liveJrCache.data;
        const match = items.find(i => i.routeId === routeId);

        if (match && match.status !== 'normal') {
            const routeDef = ROUTE_DEFINITIONS.find(r => r.routeId === routeId);
            const jrStatusItem: JRStatusItem = {
                routeId,
                routeName: match.routeName || routeDef?.name || '当該路線',
                status: match.status === 'cancelled' ? 'suspended' : match.status as JRStatusItem['status'],
                description: match.statusText,
                statusText: match.statusText,
                updatedAt: match.updatedAt,
                source: 'official',
                rawText: match.rawText,
            };

            // Extract resumption time from official text
            if (jrStatusItem.status === 'suspended' || jrStatusItem.status === 'delay') {
                const extracted = extractResumptionTime(jrStatusItem.rawText || jrStatusItem.statusText || '');
                if (extracted) {
                    jrStatusItem.resumptionTime = extracted.toISOString();
                }
            }
            return jrStatusItem;
        }

        // JR公式で「通常通り」と明示された路線 → area-wide partialチェックをスキップ
        if (match && match.status === 'normal') {
            const routeDef = ROUTE_DEFINITIONS.find(r => r.routeId === routeId);
            return {
                routeId,
                routeName: match.routeName || routeDef?.name || '当該路線',
                status: 'normal',
                description: match.statusText || '公式発表により通常運転',
                statusText: match.statusText || '公式発表により通常運転',
                updatedAt: match.updatedAt,
                source: 'official',
            };
        }

        // Check area-wide incidents (neighboring routes suspended)
        const routeDef = ROUTE_DEFINITIONS.find(r => r.routeId === routeId);
        if (routeDef?.validAreas) {
            const hasAreaIssues = items.some(i =>
                i.routeId !== routeId &&
                (i.status === 'suspended' || i.status === 'cancelled') &&
                ROUTE_DEFINITIONS.find(r => r.routeId === i.routeId)?.validAreas?.some(
                    a => routeDef.validAreas!.includes(a)
                )
            );
            if (hasAreaIssues) {
                return {
                    routeId,
                    routeName: routeDef.name || '当該路線',
                    status: 'partial',
                    description: '周辺路線で運休・遅延が発生しています',
                    statusText: '周辺の運行状況に基づきリスクを算出しています',
                    updatedAt: new Date().toISOString(),
                    source: 'official',
                };
            }
        }

        // No issues found = normal
        return {
            routeId,
            routeName: routeDef?.name || '当該路線',
            status: 'normal',
            description: '平常運転',
            statusText: '現在、遅れに関する情報はありません',
            updatedAt: new Date().toISOString(),
            source: 'official',
        };
    } catch (e) {
        logger.error('Live JR status fetch failed', e);
        return null;
    }
}

/**
 * 時間帯別リスク推移を構築する
 *
 * 全時間を surroundingHours から統一取得し、surroundingHours を除外した
 * 独立計算を行うことで、検索時刻に依存しない一貫したリスク値を保証する。
 */
function buildHourlyRiskTrend(params: {
    targetHour: number;
    surroundingWeather: WeatherForecast[];
    routeId: string;
    routeName: string;
    date: string;
    isToday: boolean;
    jrStatus: PredictionInput['jrStatus'];
    historicalData: PredictionInput['historicalData'];
    crowdsourcedStatus: PredictionInput['crowdsourcedStatus'];
    officialHistory: PredictionInput['officialHistory'];
}): HourlyRiskData[] {
    const { targetHour, surroundingWeather, routeId, routeName, date, isToday, jrStatus, historicalData, crowdsourcedStatus, officialHistory } = params;
    const trend: HourlyRiskData[] = [];

    for (let offset = -2; offset <= 2; offset++) {
        const h = targetHour + offset;
        if (h < 0 || h > 23) continue;

        const hStr = h.toString().padStart(2, '0');
        const checkTime = `${hStr}:00`;
        const isTarget = offset === 0;

        // 全時間を surroundingHours から統一取得（データ構造の一貫性を保証）
        const hourWeather = surroundingWeather.find((sw) => {
            const swHour = sw.targetTime ? parseInt(sw.targetTime.split(':')[0]) : -1;
            return swHour === h;
        }) || null;

        if (!hourWeather) continue;

        // 当日はリアルタイムステータスも反映するため surroundingHours を保持
        // 全時間に同一の surroundingWeather を渡すことで、検索時刻による一貫性を維持しつつ
        // applyAdaptiveCalibration（JR公式ステータスによる補正）を有効にする
        const weatherWithContext = { ...hourWeather, surroundingHours: isToday ? surroundingWeather : undefined } as WeatherForecast;

        const hourResult = calculateSuspensionRisk({
            weather: weatherWithContext,
            routeId,
            routeName,
            targetDate: date,
            targetTime: checkTime,
            historicalData,
            jrStatus,
            crowdsourcedStatus: isToday ? crowdsourcedStatus : null,
            officialHistory: isToday ? officialHistory : null,
        });

        // 天気アイコン判定
        let icon: HourlyRiskData['weatherIcon'] = 'cloud';
        if ((hourWeather.snowfall ?? 0) > 0) icon = 'snow';
        else if (hourWeather.precipitation && hourWeather.precipitation > 0) icon = 'rain';
        else if (hourWeather.windSpeed >= 15) icon = 'wind';
        else if (hourWeather.weather.includes('晴')) icon = 'sun';

        trend.push({
            time: checkTime,
            risk: Math.floor(hourResult.probability),
            weatherIcon: icon,
            isTarget,
            isCurrent: isTarget,
        });
    }

    return trend;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { routeId, date, time, lat, lon } = body;

        // Input validation
        if (!routeId || typeof routeId !== 'string' || routeId.length > 100) {
            return NextResponse.json({ error: 'Invalid routeId' }, { status: 400 });
        }
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Invalid date format (expected YYYY-MM-DD)' }, { status: 400 });
        }
        if (!time || !/^\d{2}:\d{2}$/.test(time)) {
            return NextResponse.json({ error: 'Invalid time format (expected HH:MM)' }, { status: 400 });
        }
        if (lat != null && (isNaN(Number(lat)) || Number(lat) < -90 || Number(lat) > 90)) {
            return NextResponse.json({ error: 'Invalid latitude' }, { status: 400 });
        }
        if (lon != null && (isNaN(Number(lon)) || Number(lon) < -180 || Number(lon) > 180)) {
            return NextResponse.json({ error: 'Invalid longitude' }, { status: 400 });
        }

        // キャッシュチェック: 同一ルート・同一時間帯のリクエストはキャッシュから返す
        const cacheKey = buildCacheKey(routeId, date, time);
        const cached = getFromCache<Record<string, unknown>>(cacheKey);
        if (cached) {
            return NextResponse.json({ ...cached, _cached: true });
        }

        // Parallel fetch: all data sources at once for minimal latency
        const dateTime = `${date}T${time}:00`;
        const coordinates = (lat != null && lon != null) ? { lat: Number(lat), lon: Number(lon) } : undefined;

        // Check if searching for today (crowdsourced/history only relevant for today)
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isToday = date === todayStr;

        const [weather, jrStatus, historicalResult, officialHistoryResult, crowdsourcedResult] = await Promise.all([
            fetchHourlyWeatherForecast(routeId, dateTime, coordinates).catch(e => {
                logger.error('Weather fetch failed', e);
                return null;
            }),
            fetchLiveJRStatus(routeId),
            // Historical suspension rate from user reports
            getHistoricalSuspensionRate(routeId).catch(e => {
                logger.warn('Historical data fetch failed', e);
                return { success: false, data: null };
            }),
            // Official route history from crawler data (last 24h)
            getOfficialRouteHistory(routeId, 24).catch(e => {
                logger.warn('Official history fetch failed', e);
                return { success: false, data: null };
            }),
            // Crowdsourced user reports (only for today)
            isToday ? aggregateCrowdsourcedStatusAsync(routeId).catch(e => {
                logger.warn('Crowdsourced status fetch failed', e);
                return null;
            }) : Promise.resolve(null)
        ]);

        if (!weather) {
            return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
        }

        // Assemble all data sources
        const historicalData = historicalResult?.success && historicalResult?.data
            ? historicalResult.data : null;
        const officialHistory = officialHistoryResult?.success && officialHistoryResult?.data
            ? officialHistoryResult.data : null;
        const crowdsourcedStatus = crowdsourcedResult && crowdsourcedResult.reportCount > 0
            ? {
                consensusStatus: crowdsourcedResult.consensusStatus,
                reportCount: crowdsourcedResult.reportCount,
                last15minCounts: crowdsourcedResult.last15minCounts
            } : null;

        const input: PredictionInput = {
            weather,
            routeId,
            routeName: jrStatus?.routeName || '当該路線',
            targetDate: date,
            targetTime: time,
            historicalData,
            jrStatus: jrStatus,
            crowdsourcedStatus: isToday ? crowdsourcedStatus : null,
            officialHistory: isToday ? officialHistory as PredictionInput['officialHistory'] : null
        };

        const result = calculateSuspensionRisk(input);

        // Ensure officialStatus is set in the result
        result.officialStatus = jrStatus;

        // Trend Calculation (Server-Side)
        // 各時間を独立・統一的に評価し、検索時刻に依存しない一貫したリスク値を保証する
        const trend = buildHourlyRiskTrend({
            targetHour: parseInt(time.split(':')[0]),
            surroundingWeather: weather.surroundingHours || [],
            routeId,
            routeName: jrStatus?.routeName || '当該路線',
            date,
            isToday,
            jrStatus,
            historicalData,
            crowdsourcedStatus,
            officialHistory: officialHistory as PredictionInput['officialHistory'],
        });

        result.trend = trend;

        // Attach enriched data for client-side weekly forecast (avoids redundant fetches)
        const enrichedResult = {
            ...result,
            _serverData: {
                historicalData,
                officialHistory,
                crowdsourcedStatus: isToday ? crowdsourcedStatus : null
            }
        };

        // Persist prediction for ML training & enterprise API data
        savePredictionHistory({
            route_id: routeId,
            route_name: input.routeName || routeId,
            probability: result.probability,
            status: result.status,
            weather_factors: result.reasons || [],
            is_official_influenced: !!jrStatus,
        }).catch(err => logger.warn('Failed to save prediction history', { err }));
        // キャッシュに保存（次回同一リクエスト高速化）
        setCache(cacheKey, enrichedResult);

        return NextResponse.json(enrichedResult);

    } catch (error) {
        logger.error('Prediction API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
