import { NextRequest, NextResponse } from 'next/server';
import { HOKKAIDO_ROUTES } from '@/lib/hokkaido-data';
import { fetchJRHokkaidoStatus } from '@/lib/jr-status';
import { fetchHourlyWeatherForecast } from '@/lib/weather';
import { calculateSuspensionRisk } from '@/lib/prediction-engine';
import { saveMonitoringLog } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { weatherAPIBreaker, jrStatusBreaker, supabaseBreaker } from '@/lib/circuit-breaker';

// Force dynamic to ensure we get fresh data every call
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const startTime = Date.now();

    // 認証: 環境変数で設定されたシークレットキーで保護
    const { searchParams } = new URL(req.url);
    const monitorSecret = process.env.MONITOR_SECRET;
    if (!monitorSecret || searchParams.get('key') !== monitorSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];
    const jrStatuses = await fetchJRHokkaidoStatus();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isoNow = now.toISOString().slice(0, 13) + ':00:00';

    for (const route of HOKKAIDO_ROUTES) {
        const routeStart = Date.now();
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
            logger.error(`Prediction failed for ${route.id}`, e);
        }

        if (prediction) {
            let normalizedActual = actualStatus;
            if (actualStatus === 'cancelled') normalizedActual = 'suspended';

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
                weather_summary: prediction.summary,
                response_time_ms: Date.now() - routeStart,
            };

            await saveMonitoringLog(logEntry);
            results.push(logEntry);
        }
    }

    const matchCount = results.filter(r => r.is_match).length;
    const totalDurationMs = Date.now() - startTime;

    return NextResponse.json({
        success: true,
        timestamp: now.toISOString(),
        // パフォーマンスメトリクス
        performance: {
            total_duration_ms: totalDurationMs,
            avg_route_ms: results.length > 0
                ? Math.round(results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length)
                : 0,
        },
        // システムメトリクス
        system: {
            memory: {
                used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
            },
            uptime_seconds: Math.round(process.uptime()),
        },
        // Circuit Breaker 状態
        circuit_breakers: {
            weather_api: weatherAPIBreaker.getMetrics(),
            jr_status_api: jrStatusBreaker.getMetrics(),
            supabase: supabaseBreaker.getMetrics(),
        },
        // 予測精度
        accuracy: {
            total_routes: results.length,
            matches: matchCount,
            anomalies: results.length - matchCount,
            accuracy_rate: results.length > 0
                ? `${Math.round((matchCount / results.length) * 100)}%`
                : 'N/A',
        },
        results
    });
}
