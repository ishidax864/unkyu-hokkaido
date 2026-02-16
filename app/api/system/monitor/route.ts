import { NextRequest, NextResponse } from 'next/server';
import { HOKKAIDO_ROUTES } from '@/lib/hokkaido-data';
import { fetchJRHokkaidoStatus } from '@/lib/jr-status';
import { fetchHourlyWeatherForecast } from '@/lib/weather';
import { predictWithML, MLInput } from '@/lib/prediction-engine/ml-runner';
import { saveMonitoringLog } from '@/lib/supabase';

// Force dynamic to ensure we get fresh data every call
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Basic Auth
    const { searchParams } = new URL(req.url);
    if (searchParams.get('key') !== 'admin_monitor') {
        return NextResponse.json({ error: 'Unauthorized access. Please provide valid key.' }, { status: 401 });
    }

    const results = [];
    // 1. Fetch Official Status (Live)
    const jrStatuses = await fetchJRHokkaidoStatus();

    const now = new Date();
    // Round down to current hour string for weather fetch "YYYY-MM-DDTHH:00:00"
    const isoNow = now.toISOString().slice(0, 13) + ':00:00';

    for (const route of HOKKAIDO_ROUTES) {
        // 2. Determine Actual Status
        // JRHokkaidoStatus returns only "non-normal" routes usually, unless "All Normal" fallback.
        // We find if this route is in the list.
        const official = jrStatuses.find(s => s.routeId === route.id);
        const actualStatus = official ? official.status : 'normal';
        const actualText = official ? official.statusText : '平常運転';

        // 3. Make AI Prediction (Live)
        let prediction = null;
        try {
            const weather = await fetchHourlyWeatherForecast(route.id, isoNow);
            if (weather) {
                // Calculate Trend features (simplified from v2 route)
                const currentHourCode = now.getHours();
                const nextHourData = weather.surroundingHours?.find(h => {
                    if (!h.targetTime) return false;
                    // Extract hour from "HH:00"
                    const hTime = parseInt(h.targetTime.split(':')[0]);
                    return hTime === (currentHourCode + 1) % 24;
                });

                const windChange = nextHourData ? (nextHourData.windSpeed - weather.windSpeed) : 0;

                const input: MLInput = {
                    routeId: route.id,
                    month: now.getMonth() + 1,
                    windSpeed: weather.windSpeed,
                    windDirection: weather.windDirection || 0,
                    windGust: weather.windGust || weather.windSpeed * 1.5,
                    snowfall: weather.snowfall || 0,
                    snowDepth: weather.snowDepth || 0,
                    temperature: weather.temperature || 0,
                    pressure: weather.pressure || 1013,
                    windChange,
                    pressureChange: 0
                };

                const mlResult = await predictWithML(input);

                // Map probabilities safely
                const prob = mlResult.probabilities[mlResult.status] || 0;

                prediction = {
                    status: mlResult.status,
                    prob,
                    summary: `Wind:${input.windSpeed}m/s, Snow:${input.snowfall}cm, Temp:${input.temperature}C`
                };
            }
        } catch (e) {
            console.error(`Prediction failed for ${route.id}`, e);
        }

        // 4. Compare and Log
        if (prediction) {
            // Strict match check
            // 'suspended' vs 'suspended'
            // 'delay' vs 'delay'
            // 'normal' vs 'normal'
            // Note: Official 'cancelled' maps to 'suspended' in logic usually?
            // JRStatus type has 'cancelled' | 'suspended' | 'delay' | 'normal' | 'no-service'

            let normalizedActual = actualStatus;
            if (actualStatus === 'cancelled') normalizedActual = 'suspended';

            const normalizedPred = prediction.status;
            // ML returns 'suspended' | 'delayed' | 'normal'

            const isMatch = normalizedActual === normalizedPred;

            // Anomaly Detection Logic
            // If AI says Normal but Actual is Suspended -> Critical Miss (False Negative)
            // If AI says Suspended but Actual is Normal -> False Alarm (False Positive)

            const logEntry = {
                route_id: route.id,
                route_name: route.name,
                predicted_status: normalizedPred,
                predicted_probability: Math.round(prediction.prob * 100),
                actual_status: normalizedActual,
                actual_status_text: actualText,
                is_match: isMatch,
                weather_summary: prediction.summary
            };

            await saveMonitoringLog(logEntry);
            results.push(logEntry);
        }
    }

    return NextResponse.json({
        success: true,
        timestamp: now.toISOString(),
        total_routes: results.length,
        anomalies: results.filter(r => !r.is_match).length,
        results
    });
}
