/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { fetchHourlyWeatherForecast } from '@/lib/weather';

export const dynamic = 'force-dynamic'; // 🆕 Disable caching for real-time predictions
import { calculateSuspensionRisk } from '@/lib/prediction-engine'; // Correct import
import { JRStatusItem, PredictionInput, JRStatus } from '@/lib/types';
import { extractResumptionTime } from '@/lib/text-parser'; // 🆕

import { getAdminSupabaseClient } from '@/lib/supabase';
import { ROUTE_DEFINITIONS } from '@/lib/jr-status';

// Helper to fetch JR Status (Debug Version)
async function _fetchJRStatus(routeId: string): Promise<JRStatusItem | null> {
    try {
        const supabase = getAdminSupabaseClient();
        if (!supabase) {
            console.error('Missing Supabase credentials');
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
            console.error('DB Error fetching route_status_history:', dbError.message);
            return null;
        }

        if (incidents && incidents.length > 0) {
            const latest = incidents[0];
            const description = latest.status === 'suspended' ? '運休・見合わせが発生しています' : latest.status === 'delayed' ? '遅延が発生しています' : '平常運転';
            let jrStatus: JRStatusItem = {
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
            console.error('DB Error fetching crawler_logs:', logError.message);
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
                return {
                    routeName: routeName,
                    status: 'delay',
                    description: 'Stale Data',
                    statusText: `ERR: Data Stale (${Math.round((now - lastFetch) / 60000)}min old)`,
                    updatedAt: logs[0].fetched_at,
                    source: 'official'
                } as unknown as JRStatusItem;
            }
        } else {
            // クローラーログがないまたはデータが古い -> nullを返し気象予測のみで判定する
            return null;
        }

        return null;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('JR Status Fetch Error:', msg);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { routeId, date, time, lat, lon } = body;

        // Parallel fetch
        const dateTime = `${date}T${time}:00`;
        const coordinates = (lat != null && lon != null) ? { lat: Number(lat), lon: Number(lon) } : undefined;

        const [weather, jrStatus] = await Promise.all([
            fetchHourlyWeatherForecast(routeId, dateTime, coordinates).catch(e => {
                console.error(e);
                return null;
            }),
            _fetchJRStatus(routeId)
        ]);

        if (!weather) {
            return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
        }

        const input: PredictionInput = {
            weather,
            routeId,
            routeName: jrStatus?.routeName || '当該路線', // Fallback name
            targetDate: date,
            targetTime: time,
            historicalData: null, // API generally doesn't check historical here or needs fetch
            jrStatus: jrStatus,
            crowdsourcedStatus: null
        };

        const result = calculateSuspensionRisk(input);

        // Ensure officialStatus is set in the result
        result.officialStatus = jrStatus;

        // 🆕 Trend Calculation (Server-Side)
        // User Request: "Calculate on server for consistency throughout."
        const trend: any[] = [];
        const targetHour = parseInt(time.split(':')[0]);
        const surroundingWeather = weather.surroundingHours || [];

        for (let offset = -2; offset <= 2; offset++) {
            const h = targetHour + offset;
            if (h < 0 || h > 23) continue;

            const hStr = h.toString().padStart(2, '0');
            const checkTime = `${hStr}:00`;

            let hourRisk: number;
            let hourWeather: any = null;
            const isTarget = offset === 0;

            if (isTarget) {
                hourRisk = result.probability; // Re-use main result
                hourWeather = weather;
            } else {
                hourWeather = surroundingWeather.find((sw: any) => {
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
                        ...hourWeather,
                        surroundingHours: contextHours
                    };

                    const r = calculateSuspensionRisk({
                        weather: weatherWithContext,
                        routeId,
                        routeName: jrStatus?.routeName || '当該路線',
                        targetDate: date,
                        targetTime: checkTime,
                        historicalData: null,
                        jrStatus: jrStatus,
                        crowdsourcedStatus: null,
                        timetableTrain: undefined
                    });
                    hourRisk = r.probability;
                } else {
                    continue;
                }
            }

            // Determine icon
            let icon = 'cloud';
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

        return NextResponse.json(result);

    } catch (error) {
        console.error('Prediction API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
