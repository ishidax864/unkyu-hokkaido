import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/b2b-auth';
import { calculateSuspensionRisk } from '@/lib/prediction-engine';
import { fetchHourlyWeatherForecast } from '@/lib/weather';

export async function GET(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key');
    const { authorized, error, partner } = await validateApiKey(apiKey);

    if (!authorized) {
        return NextResponse.json({ error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get('routeId');

    if (!routeId) {
        return NextResponse.json({ error: 'routeId is required' }, { status: 400 });
    }

    try {
        const now = new Date();
        const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
        const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' }).format(now);
        const targetDateTime = `${date}T${time}:00`;

        // 天気予報を取得
        const weather = await fetchHourlyWeatherForecast(routeId, targetDateTime);

        // リスク計算
        const prediction = calculateSuspensionRisk({
            weather,
            routeId,
            routeName: 'API Request', // ルート名取得は省略
            targetDate: date,
            targetTime: time,
            historicalData: null,
            jrStatus: null,
            crowdsourcedStatus: null
        });

        return NextResponse.json({
            partner: partner?.name || 'Unknown',
            timestamp: new Date().toISOString(),
            prediction
        });
    } catch (err) {
        logger.error('B2B prediction error:', err);
        return NextResponse.json({ error: 'Failed to fetch prediction' }, { status: 500 });
    }
}
