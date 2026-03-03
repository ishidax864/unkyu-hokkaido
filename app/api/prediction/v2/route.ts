
import { NextRequest, NextResponse } from 'next/server';
import { fetchHourlyWeatherForecast } from '@/lib/weather';

export const dynamic = 'force-dynamic'; // Disable caching for real-time predictions
import { calculateSuspensionRisk } from '@/lib/prediction-engine';
import { logger } from '@/lib/logger';
import { PredictionInput, HourlyRiskData, WeatherForecast } from '@/lib/types';

import { getHistoricalSuspensionRate, getOfficialRouteHistory, savePredictionHistory } from '@/lib/supabase';
import { aggregateCrowdsourcedStatusAsync } from '@/lib/user-reports';
import { fetchJRStatusFromDB } from '@/lib/services/jr-status-service';
import { buildCacheKey, getFromCache, setCache } from '@/lib/prediction-cache';

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
            fetchJRStatusFromDB(routeId),
            // 🆕 Historical suspension rate from user reports
            getHistoricalSuspensionRate(routeId).catch(e => {
                logger.warn('Historical data fetch failed', e);
                return { success: false, data: null };
            }),
            // 🆕 Official route history from crawler data (last 24h)
            getOfficialRouteHistory(routeId, 24).catch(e => {
                logger.warn('Official history fetch failed', e);
                return { success: false, data: null };
            }),
            // 🆕 Crowdsourced user reports (only for today)
            isToday ? aggregateCrowdsourcedStatusAsync(routeId).catch(e => {
                logger.warn('Crowdsourced status fetch failed', e);
                return null;
            }) : Promise.resolve(null)
        ]);

        if (!weather) {
            return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
        }

        // 🆕 Assemble all data sources
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

        // 🆕 Trend Calculation (Server-Side)
        // Each hour is evaluated INDEPENDENTLY on its own weather data.
        // We intentionally do NOT pass surroundingHours so that
        // applyAdaptiveCalibration is skipped — this ensures the same hour
        // always shows the same risk value regardless of which hour is searched.
        const trend: HourlyRiskData[] = [];
        const targetHour = parseInt(time.split(':')[0]);
        const surroundingWeather = weather.surroundingHours || [];

        for (let offset = -2; offset <= 2; offset++) {
            const h = targetHour + offset;
            if (h < 0 || h > 23) continue;

            const hStr = h.toString().padStart(2, '0');
            const checkTime = `${hStr}:00`;
            const isTarget = offset === 0;

            // 全時間を surroundingHours から統一取得（データ構造の一貫性を保証）
            // ターゲット時刻も surroundingHours から取得することで、
            // 検索時刻を変えても同じ時刻は同じデータ・同じ結果になる
            const hourWeather = surroundingWeather.find((sw: WeatherForecast) => {
                const swHour = sw.targetTime ? parseInt(sw.targetTime.split(':')[0]) : -1;
                return swHour === h;
            }) || null;

            if (!hourWeather) continue;

            // Strip surroundingHours to ensure deterministic calculation per hour
            // (adaptive calibration uses surroundingHours which varies by search context)
            const isolatedWeather = {
                ...hourWeather,
                surroundingHours: undefined
            } as typeof weather;

            const hourResult = calculateSuspensionRisk({
                weather: isolatedWeather,
                routeId,
                routeName: jrStatus?.routeName || '当該路線',
                targetDate: date,
                targetTime: checkTime,
                historicalData,
                jrStatus: jrStatus,
                crowdsourcedStatus: isToday ? crowdsourcedStatus : null,
                officialHistory: isToday ? officialHistory as PredictionInput['officialHistory'] : null,
            });
            const hourRisk = hourResult.probability;

            // Determine icon
            let icon: HourlyRiskData['weatherIcon'] = 'cloud';
            if ((hourWeather.snowfall ?? 0) > 0) icon = 'snow';
            else if (hourWeather.precipitation && hourWeather.precipitation > 0) icon = 'rain';
            else if (hourWeather.windSpeed >= 15) icon = 'wind';
            else if (hourWeather.weather.includes('晴')) icon = 'sun';

            trend.push({
                time: checkTime,
                risk: Math.floor(hourRisk),
                weatherIcon: icon,
                isTarget: isTarget,
                isCurrent: isTarget
            });
        }

        result.trend = trend;

        // 🆕 Attach enriched data for client-side weekly forecast (avoids redundant fetches)
        const enrichedResult = {
            ...result,
            _serverData: {
                historicalData,
                officialHistory,
                crowdsourcedStatus: isToday ? crowdsourcedStatus : null
            }
        };

        // 🆕 Persist prediction for ML training & enterprise API data
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
