import { NextResponse } from 'next/server';
import { fetchJRHokkaidoStatus } from '@/lib/jr-status';
import { calculateSuspensionRisk } from '@/lib/prediction-engine';

export async function GET() {
    const checks: Record<string, any> = {
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
        version: '1.1.0',
        checks,
    };

    return NextResponse.json(healthCheck, {
        status: isHealthy ? 200 : 503,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
    });
}
