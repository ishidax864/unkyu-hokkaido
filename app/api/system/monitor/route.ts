import { NextRequest, NextResponse } from 'next/server';
import { HOKKAIDO_ROUTES } from '@/lib/hokkaido-data';
import { fetchJRHokkaidoStatus } from '@/lib/jr-status';
import { fetchHourlyWeatherForecast } from '@/lib/weather';
import { calculateSuspensionRisk } from '@/lib/prediction-engine';
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
    const jrStatuses = await fetchJRHokkaidoStatus();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isoNow = now.toISOString().slice(0, 13) + ':00:00';

    for (const route of HOKKAIDO_ROUTES) {
        const official = jrStatuses.find(s => s.routeId === route.id);
        const actualStatus = official ? official.status : 'normal';
        const actualText = official ? official.statusText : '平常運転';

        let prediction = null;
        try {
            const weather = await fetchHourlyWeatherForecast(route.id, isoNow);
            if (weather) {
                const result = calculateSuspensionRisk({
                    routeId: route.id,
                    routeName: route.name,
                    targetDate: todayStr,
                    targetTime: timeStr,
                    weather,
                    jrStatus: official ?? null,
                });

                prediction = {
                    status: result.status,
                    probability: result.probability,
                    summary: `Wind:${weather.windSpeed}m/s, Snow:${weather.snowfall ?? 0}cm, Temp:${weather.temperature ?? 0}C`
                };
            }
        } catch (e) {
            console.error(`Prediction failed for ${route.id}`, e);
        }

        if (prediction) {
            let normalizedActual = actualStatus;
            if (actualStatus === 'cancelled') normalizedActual = 'suspended';

            // Map prediction status to a simple comparable form
            const isSuspendedPred = prediction.probability >= 70 || prediction.status === '運休' || prediction.status === '運休中';
            const normalizedPred = isSuspendedPred ? 'suspended' : prediction.probability >= 25 ? 'delayed' : 'normal';
            const isMatch = normalizedActual === normalizedPred;

            const logEntry = {
                route_id: route.id,
                route_name: route.name,
                predicted_status: normalizedPred,
                predicted_probability: prediction.probability,
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
