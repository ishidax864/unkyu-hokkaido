
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
        const { routeId, date, time } = body;

        if (!routeId || !date || !time) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const dateTime = `${date}T${time}:00`;

        // 1. Fetch Weather (Hourly)
        let weather = null;
        try {
            weather = await fetchHourlyWeatherForecast(routeId, dateTime);
        } catch (e) {
            console.error(e);
            return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
        }

        if (!weather) {
            return NextResponse.json({ error: 'No weather data' }, { status: 404 });
        }

        // Calculate Trend (Next hour - Current hour)
        // Weather object has `surroundingHours`. Find +1 hour.
        const currentHourCode = parseInt(time.split(':')[0]);
        const nextHourData = weather.surroundingHours?.find(h => {
            if (!h.targetTime) return false;
            const hTime = parseInt(h.targetTime.split(':')[0]);
            return hTime === (currentHourCode + 1) || hTime === (currentHourCode + 1 - 24); // Simple check
        });

        // If no next hour data (e.g. end of array), assume 0 change
        const windChange = nextHourData ? (nextHourData.windSpeed - weather.windSpeed) : 0;
        // Pressure might not be in surroundingHours yet? check lib/weather.ts. 
        // It wasn't added to surroundingHours in previous steps. Assuming 0 for now or adding it.
        // Actually weather.ts:284 has windDirection but not pressure in surroundingHours yet.
        // Let's default pressureChange to 0 for now to keep it safe, or use wind only.
        // Model expects input, so passing 0 is fine.
        const pressureChange = 0;

        // 2. Prepare ML Input
        // ML expects: month, wind_speed, wind_dir, wind_gust, snowfall, snow_depth, temperature, pressure, wind_change, pressure_change
        const input = {
            routeId,
            month: new Date(date).getMonth() + 1,
            windSpeed: weather.windSpeed,
            windDirection: weather.windDirection || 0,
            windGust: weather.windGust || weather.windSpeed * 1.5,
            snowfall: weather.snowfall || 0,
            snowDepth: weather.snowDepth || 0,
            temperature: weather.temperature || 0,
            pressure: weather.pressure || 1013,
            windChange, // 🆕
            pressureChange // 🆕
        };

        // 3. Run ML
        const mlResult = await predictWithML(input);

        // 4. Construct Response (Compatible with PredictionResult interface roughly)
        // We map ML output to the UI expected format

        // Map status to probability for UI compatibility
        // Suspended -> 95%, Delayed -> 50%, Normal -> 10%
        let probability = 10;
        if (mlResult.status === 'suspended') probability = 95;
        if (mlResult.status === 'delayed') probability = 50;

        // Reason text
        const factors = [];
        if (input.windSpeed > 15) factors.push(`強風 (${input.windSpeed}m/s)`);
        if (input.snowfall > 2) factors.push(`降雪 (${input.snowfall}cm)`);
        if (input.temperature < -5) factors.push(`低温 (${input.temperature}℃)`);

        const reasons = factors.length > 0
            ? [`AI予測: ${factors.join('・')}の影響により${mlResult.status === 'suspended' ? '運休' : '遅延'}リスクあり`]
            : ['AI予測: 平常運転の見込み'];

        // Recovery Time text
        let recoveryText = null;
        if (mlResult.status !== 'normal') {
            const h = Math.round(mlResult.recoveryTime || 0);
            recoveryText = getRecoveryMessage(h, time);
        }

        const result = {
            probability,
            level: probability >= 70 ? 'high' : probability >= 30 ? 'medium' : 'low',
            status: mlResult.status,
            reasons,
            details: {
                wind: { value: input.windSpeed, isHigh: input.windSpeed > 15 },
                snow: { value: input.snowfall, isHigh: input.snowfall > 2 },
            },
            estimatedRecoveryTime: recoveryText,
            isOfficialOverride: false
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('Prediction API Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
