
import { NextRequest, NextResponse } from 'next/server';
import { fetchHourlyWeatherForecast } from '@/lib/weather';
import { predictWithML } from '@/lib/prediction-engine/ml-runner';
import { JRStatusItem } from '@/lib/types';
import { getRecoveryMessage } from '@/lib/suggestion-logic';

// Helper to fetch JR Status
async function _fetchJRStatus(_routeId: string): Promise<JRStatusItem | null> {
    try {
        // Self-call or mocking internal logic? 
        // In Server Action/Route Handler, calling another API route via fetch(localhost) is efficient? 
        // Or just implementing logic directly.
        // Let's assume we can fetch the public endpoint or use a lib. 
        // For simplicity, let's skip JR Status fetching inside this API for now 
        // OR reuse the logic if it's in a lib. 
        // Given current structure, we'll fetch from the LIVE endpoint if possible, 
        // but `fetch` to localhost in Vercel is flaky. 
        // Better: The client passes JR Status? No, server should handle it.
        // Let's skip JR Status integration in V2 PoC for a moment and focus on Weather+ML.
        return null;
    } catch { return null; }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { routeId, date, time, lat, lon } = body;

        if (!routeId || !date || !time) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const dateTime = `${date}T${time}:00`;
        const coordinates = (lat != null && lon != null) ? { lat: Number(lat), lon: Number(lon) } : undefined;

        // 1. Fetch Weather (Hourly)
        let weather = null;
        try {
            weather = await fetchHourlyWeatherForecast(routeId, dateTime, coordinates);
        } catch (e) {
            console.error(e);
            return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
        }

        if (!weather) {
            return NextResponse.json({ error: 'No weather data' }, { status: 404 });
        }

        const currentHourCode = parseInt(time.split(':')[0]);
        const surroundingWeather = weather.surroundingHours || [];

        // 2. Prepare Trend Data (±2 hours)
        const trendPromises = [-2, -1, 0, 1, 2].map(async (offset) => {
            const h = currentHourCode + offset;
            // Handle hour wrap-around (e.g., -1 becomes 23, 24 becomes 0)
            const normalizedH = (h + 24) % 24;

            const hStr = normalizedH.toString().padStart(2, '0');
            const checkTime = `${hStr}:00`;

            const hourWeather = offset === 0 ? weather : surroundingWeather.find(sw => {
                if (!sw.targetTime) return false;
                return parseInt(sw.targetTime.split(':')[0]) === normalizedH;
            });

            if (!hourWeather) return null;

            // Calculate Trend (Next hour for this specific hour)
            // Simplified: for trend points, just use current data or +1 hour from API if available
            const nextH = (normalizedH + 1) % 24;
            const nextWeather = surroundingWeather.find(sw => sw.targetTime && parseInt(sw.targetTime.split(':')[0]) === nextH);
            const windChange = nextWeather ? (nextWeather.windSpeed - hourWeather.windSpeed) : 0;

            const input = {
                routeId,
                month: new Date(date).getMonth() + 1,
                windSpeed: hourWeather.windSpeed,
                windDirection: hourWeather.windDirection || 0,
                windGust: hourWeather.windGust || hourWeather.windSpeed * 1.5,
                snowfall: hourWeather.snowfall || 0,
                snowDepth: hourWeather.snowDepth || 0,
                temperature: hourWeather.temperature || 0,
                pressure: hourWeather.pressure || 1013,
                windChange,
                pressureChange: 0
            };

            const ml = await predictWithML(input);
            let prob = 10;
            if (ml.status === 'suspended') prob = 95;
            if (ml.status === 'delayed') prob = 50;
            // Inject minor random variance based on wind/snow for smoother chart if status is same? 
            // Better to keep it raw ML status for now.

            return {
                time: checkTime,
                risk: prob,
                status: ml.status,
                weather: hourWeather
            };
        });

        const trendResults = (await Promise.all(trendPromises)).filter(t => t !== null);

        // 3. Main Result (from Trend[2] which is offset 0)
        const targetResult = trendResults.find(t => parseInt(t!.time.split(':')[0]) === currentHourCode);
        if (!targetResult) {
            return NextResponse.json({ error: 'Failed to generate target prediction' }, { status: 500 });
        }

        const input = {
            windSpeed: targetResult.weather.windSpeed,
            snowfall: targetResult.weather.snowfall || 0
        };

        const factors = [];
        if (input.windSpeed > 15) factors.push(`強風 (${input.windSpeed}m/s)`);
        if (input.snowfall > 2) factors.push(`降雪 (${input.snowfall}cm)`);

        const reasons = factors.length > 0
            ? [`AI予測: ${factors.join('・')}の影響により${targetResult.status === 'suspended' ? '運休' : '遅延'}リスクあり`]
            : ['AI予測: 平常運転の見込み'];

        const result = {
            probability: targetResult.risk,
            level: targetResult.risk >= 70 ? 'high' : targetResult.risk >= 30 ? 'medium' : 'low',
            status: targetResult.status,
            reasons,
            details: {
                wind: { value: input.windSpeed, isHigh: input.windSpeed > 15 },
                snow: { value: input.snowfall, isHigh: input.snowfall > 2 },
            },
            estimatedRecoveryTime: null, // Simplified for now
            isOfficialOverride: false,
            trend: trendResults.map(t => ({
                time: t!.time,
                risk: t!.risk,
                weatherIcon: (t!.weather.snowfall || 0) > 0 ? 'snow' : (t!.weather.precipitation || 0) > 0 ? 'rain' : t!.weather.windSpeed >= 15 ? 'wind' : 'cloud'
            }))
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('Prediction API Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
