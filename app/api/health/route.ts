import { NextResponse } from 'next/server';
import { fetchJRHokkaidoStatus } from '@/lib/jr-status';
import { calculateSuspensionRisk } from '@/lib/prediction-engine';
import { isSupabaseAvailable } from '@/lib/supabase';
import { weatherAPIBreaker, jrStatusBreaker } from '@/lib/circuit-breaker';

// Cache health check result for 30 seconds
let lastHealthCheck: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000;

export async function GET() {
    // Return cached result if fresh
    if (lastHealthCheck && Date.now() - lastHealthCheck.timestamp < CACHE_TTL) {
        return NextResponse.json(lastHealthCheck.data);
    }

    const checks: Record<string, string> = {
        jr_hokkaido_json: 'pending',
        prediction_engine: 'pending',
    };

    // 1. JR北海道 JSON 疎通確認
    try {
        const jrStatus = await fetchJRHokkaidoStatus();
        checks.jr_hokkaido_json = jrStatus.length > 0 ? 'up' : 'down (empty results)';
    } catch (e) {
        checks.jr_hokkaido_json = `down (${e instanceof Error ? e.message : 'unknown error'})`;
    }

    // 2. 予測エンジン動作確認（モックデータでの正常動作）
    try {
        const testResult = calculateSuspensionRisk({
            routeId: 'jr-hokkaido.chitose',
            routeName: '千歳線',
            targetDate: new Date().toISOString().split('T')[0],
            targetTime: '12:00',
            weather: {
                date: new Date().toISOString().split('T')[0],
                weather: '晴れ',
                tempMax: 0,
                tempMin: -5,
                precipitation: 0,
                windSpeed: 2,
                snowfall: 0,
                windGust: 5,
                weatherCode: 0,
                warnings: [],
            }
        });
        checks.prediction_engine = testResult ? 'up' : 'down (invalid result)';
    } catch (e) {
        checks.prediction_engine = `down (${e instanceof Error ? e.message : 'unknown error'})`;
    }

    const isHealthy = Object.values(checks).every(v => v === 'up');

    const healthCheck = {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.2.0',
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB',
        },
        checks,
        dependencies: {
            supabase: isSupabaseAvailable() ? 'available' : 'unavailable',
            weatherAPI: weatherAPIBreaker.getState(),
            jrStatusAPI: jrStatusBreaker.getState(),
        },
        circuitBreakers: {
            weatherAPI: weatherAPIBreaker.getMetrics(),
            jrStatusAPI: jrStatusBreaker.getMetrics(),
        },
    };

    // Cache result
    lastHealthCheck = {
        data: healthCheck,
        timestamp: Date.now(),
    };

    return NextResponse.json(healthCheck, {
        status: isHealthy ? 200 : 503,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
    });
}
