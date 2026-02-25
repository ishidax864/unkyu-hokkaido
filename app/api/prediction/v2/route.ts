
import { NextRequest, NextResponse } from 'next/server';
import { fetchHourlyWeatherForecast } from '@/lib/weather';

export const dynamic = 'force-dynamic'; // 🆕 Disable caching for real-time predictions
import { calculateSuspensionRisk } from '@/lib/prediction-engine'; // Correct import
import { logger } from '@/lib/logger';
import { JRStatusItem, PredictionInput, JRStatus, HourlyRiskData, WeatherForecast } from '@/lib/types';
import { extractResumptionTime } from '@/lib/text-parser'; // 🆕

import { getAdminSupabaseClient, getHistoricalSuspensionRate, getOfficialRouteHistory } from '@/lib/supabase';
import { ROUTE_DEFINITIONS } from '@/lib/jr-status';
import { aggregateCrowdsourcedStatusAsync } from '@/lib/user-reports';

// Helper to fetch JR Status (Debug Version)
async function _fetchJRStatus(routeId: string): Promise<JRStatusItem | null> {
    try {
        const supabase = getAdminSupabaseClient();
        if (!supabase) {
            logger.error('Missing Supabase credentials');
            return null;
        }

        const routeDef = ROUTE_DEFINITIONS.find(r => r.routeId === routeId);
        const routeName = routeDef?.name || '当該路線';

        // 1. Check for recent incidents
        const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

        const { data: incidents, error: dbError } = await supabase
            .from('route_status_history')
            .select('*')
            .eq('route_id', routeId)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(1);

        if (dbError) {
            logger.error('DB Error fetching route_status_history:', dbError);
            return null;
        }

        if (incidents && incidents.length > 0) {
            const latest = incidents[0];
            const description = latest.status === 'suspended' ? '運休・見合わせが発生しています' : latest.status === 'delayed' ? '遅延が発生しています' : '平常運転';
            const jrStatus: JRStatusItem = {
                routeId,
                routeName,
                status: (latest.status === 'delayed' ? 'delay' : latest.status) as JRStatus,
                description,
                statusText: latest.details || description,
                updatedAt: latest.timestamp || latest.created_at,
                source: 'official',
                rawText: latest.details
            };

            // Ensure 'cancelled' is treated as 'suspended' for consistency
            if (jrStatus.status === 'cancelled') {
                jrStatus.status = 'suspended';
            }

            // 🆕 Attempt to extract resumption time
            if (jrStatus.status === 'suspended' || jrStatus.status === 'delay') {
                const extracted = extractResumptionTime(jrStatus.rawText || jrStatus.statusText || "");
                if (extracted) {
                    jrStatus.resumptionTime = extracted.toISOString();
                }
            }
            return jrStatus;
        }

        // 2. If no incidents, check if crawler ran recently (< 1 hour)
        const { data: logs, error: logError } = await supabase
            .from('crawler_logs')
            .select('fetched_at')
            .order('fetched_at', { ascending: false })
            .limit(1);

        if (logError) {
            logger.error('DB Error fetching crawler_logs:', logError);
            return null;
        }

        if (logs && logs.length > 0) {
            const lastFetch = new Date(logs[0].fetched_at).getTime();
            const now = Date.now();
            if (now - lastFetch < 60 * 60 * 1000) { // 1 hour
                // 🆕 Area-wide check
                // Our route had no direct incident, but did anyone else in the same area?
                // This protects against the crawler missing a regional warning.
                if (routeDef && routeDef.validAreas) {
                    const { data: areaIncidents } = await supabase
                        .from('route_status_history')
                        .select('status')
                        .in('route_id', ROUTE_DEFINITIONS.filter(r =>
                            r.validAreas && r.validAreas.some(a => routeDef.validAreas!.includes(a))
                        ).map(r => r.routeId))
                        .gte('created_at', since)
                        .limit(5);

                    const hasAreaIssues = areaIncidents && areaIncidents.some(ai => ai.status !== 'normal');
                    if (hasAreaIssues) {
                        return {
                            routeId,
                            routeName,
                            status: 'partial',
                            description: '周辺路線で運休・遅延が発生しています',
                            statusText: '周辺の運行状況に基づきリスクを算出しています',
                            updatedAt: logs[0].fetched_at,
                            source: 'official'
                        } as JRStatusItem;
                    }
                }

                return {
                    routeId,
                    routeName,
                    status: 'normal',
                    description: '平常運転',
                    statusText: '現在、遅れに関する情報はありません',
                    updatedAt: logs[0].fetched_at,
                    source: 'official'
                };
            } else {
                logger.warn(`JR Status data stale: ${Math.round((now - lastFetch) / 60000)}min old`);
                return null; // 古いデータは信頼できないためnull→気象予測のみで判定
            }
        } else {
            // クローラーログがないまたはデータが古い -> nullを返し気象予測のみで判定する
            return null;
        }
    } catch (e: unknown) {
        const _msg = e instanceof Error ? e.message : String(e);
        logger.error('JR Status Fetch Error:', e);
        return null;
    }
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

        // Parallel fetch: all data sources at once for minimal latency
        const dateTime = `${date}T${time}:00`;
        const coordinates = (lat != null && lon != null) ? { lat: Number(lat), lon: Number(lon) } : undefined;

        // 🆕 Check if searching for today (crowdsourced/history only relevant for today)
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isToday = date === todayStr;

        const [weather, jrStatus, historicalResult, officialHistoryResult, crowdsourcedResult] = await Promise.all([
            fetchHourlyWeatherForecast(routeId, dateTime, coordinates).catch(e => {
                logger.error('Weather fetch failed', e);
                return null;
            }),
            _fetchJRStatus(routeId),
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
        // User Request: "Calculate on server for consistency throughout."
        const trend: HourlyRiskData[] = [];
        const targetHour = parseInt(time.split(':')[0]);
        const surroundingWeather = weather.surroundingHours || [];

        for (let offset = -2; offset <= 2; offset++) {
            const h = targetHour + offset;
            if (h < 0 || h > 23) continue;

            const hStr = h.toString().padStart(2, '0');
            const checkTime = `${hStr}:00`;

            let hourRisk: number;
            let hourWeather: WeatherForecast | null = null;
            const isTarget = offset === 0;

            if (isTarget) {
                hourRisk = result.probability; // Re-use main result
                hourWeather = weather;
            } else {
                hourWeather = surroundingWeather.find((sw) => {
                    const swHour = sw.targetTime ? parseInt(sw.targetTime.split(':')[0]) : -1;
                    return swHour === h;
                }) || null;

                if (hourWeather) {
                    // 🔑 CRITICAL: Context Attachment for Adaptive Calibration
                    // We must attach 'surroundingHours' to the neighbor weather object
                    // so that 'calculateSuspensionRisk' can find "Now" and apply the delta.
                    // We use the full 'surroundingHours' from the main weather object.

                    // We also need to include the main weather itself in the list if it's not there,
                    // but usually 'surroundingHours' contains neighbors.
                    // To be safe, we construct a context list that includes the main weather.
                    const contextHours = [...surroundingWeather, weather];

                    const weatherWithContext = {
                        ...hourWeather!,
                        surroundingHours: contextHours
                    } as typeof weather;

                    const r = calculateSuspensionRisk({
                        weather: weatherWithContext,
                        routeId,
                        routeName: jrStatus?.routeName || '当該路線',
                        targetDate: date,
                        targetTime: checkTime,
                        historicalData,
                        jrStatus: jrStatus,
                        crowdsourcedStatus: isToday ? crowdsourcedStatus : null,
                        officialHistory: isToday ? officialHistory as PredictionInput['officialHistory'] : null,
                        timetableTrain: undefined
                    });
                    hourRisk = r.probability;
                } else {
                    continue;
                }
            }

            // Determine icon
            let icon: HourlyRiskData['weatherIcon'] = 'cloud';
            const displayWeather = isTarget ? weather : hourWeather;
            if (displayWeather) {
                if ((displayWeather.snowfall ?? 0) > 0) icon = 'snow';
                else if (displayWeather.precipitation && displayWeather.precipitation > 0) icon = 'rain';
                else if (displayWeather.windSpeed >= 15) icon = 'wind';
                else if (displayWeather.weather.includes('晴')) icon = 'sun';
            }

            trend.push({
                time: checkTime,
                risk: Math.floor(hourRisk), // Ensure integer
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

        return NextResponse.json(enrichedResult);

    } catch (error) {
        logger.error('Prediction API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
