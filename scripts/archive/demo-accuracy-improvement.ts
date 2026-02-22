import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput, WeatherForecast } from '../lib/types';

async function demoImprovement() {
    console.log('📊 Accuracy Improvement Demo (Crawler Integration)\n');

    const weather: WeatherForecast = {
        date: new Date().toISOString().split('T')[0],
        weather: 'clear',
        tempMax: -5,
        tempMin: -12,
        precipitation: 0,
        windSpeed: 3, // Very calm
        snowfall: 0, // No new snow
        warnings: []
    };

    const inputBase: PredictionInput = {
        routeId: 'jr-hokkaido.soya',
        routeName: 'Soya Line',
        targetDate: weather.date,
        targetTime: '18:00',
        weather,
        jrStatus: { status: 'delay' } // Still officially alerting (Delay)
    };

    // --- Scenario A: Without History (Old Logic) ---
    const resOld = calculateSuspensionRisk({ ...inputBase, officialHistory: null });

    // --- Scenario B: With Recent Suspension (New Logic) ---
    const inputWithHistory: PredictionInput = {
        ...inputBase,
        officialHistory: [
            {
                status: 'suspended',
                cause: 'blizzard',
                date: weather.date,
                time: '16:00' // 2 hours ago
            }
        ]
    };
    const resNew = calculateSuspensionRisk(inputWithHistory);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' Case: Recovering weather but still officially suspended/delayed');
    console.log(` 🕒 Search Time: ${inputBase.targetTime}`);
    console.log(` ❄️ Weather: Wind ${weather.windSpeed}m/s, Snow ${weather.snowfall}cm/h`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(` 🔻 Old Logic Result: ${resOld.probability}% risk`);
    console.log(`    (Status: ${resOld.status})`);
    console.log('');
    console.log(` 🔼 New Logic Result: ${resNew.probability}% risk`);
    console.log(`    (Status: ${resNew.status})`);
    console.log(`    Reason added: ${resNew.reasons.find(r => r.includes('公式履歴'))}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (resNew.probability > resOld.probability) {
        console.log('\n✅ Demo Success: The system now correctly maintains high risk due to recent official suspension, even if weather is improving!');
    }
}

demoImprovement();
