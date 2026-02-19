import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput } from '../lib/types';

async function verifyFix() {
    console.log('🧪 Starting Storm Prediction Verification...');

    const stormWeather = {
        date: '2026-02-19',
        targetTime: '08:31',
        windSpeed: 8.42,
        windGust: 20.3,
        snowfall: 1.0,
        humidity: 80,
        temperature: -5,
        precipProbability: 90,
        condition: 'snow',
        warnings: [] // 🆕 Added to avoid TypeError
    };

    const inputNormalStatus: PredictionInput = {
        routeId: 'jr-hokkaido.chitose',
        routeName: '千歳線',
        targetDate: '2026-02-19',
        targetTime: '08:31',
        weather: stormWeather as any,
        jrStatus: {
            routeId: 'jr-hokkaido.chitose',
            routeName: '千歳線',
            status: 'normal',
            statusText: '現在、遅れに関する情報はありません',
            updatedAt: new Date().toISOString()
        }
    };

    console.log('\n--- Case 1: Official Normal, High Gust (20.3m/s) ---');
    const result1 = calculateSuspensionRisk(inputNormalStatus);
    console.log(`Probability: ${result1.probability}%`);
    console.log(`Status: ${result1.status}`);
    console.log(`Reasons: ${result1.reasons.join(', ')}`);

    // Before fix, regression happened due to suppressionRatio 0.4 and MAX_PREDICTION_WITH_NORMAL_DATA=35.
    // Now with suppressionRatio 0.7 and MAX_PREDICTION_WITH_NORMAL_DATA=50 (for high gust), it should be higher.
    if (result1.probability > 30) {
        console.log('✅ PASS: Risk is no longer crushed to 5% despite Official Normal.');
    } else {
        console.log('❌ FAIL: Risk is still too low.');
    }

    const inputAreaStatus: PredictionInput = {
        routeId: 'jr-hokkaido.chitose',
        routeName: '千歳線',
        targetDate: '2026-02-19',
        targetTime: '08:31',
        weather: stormWeather as any,
        jrStatus: {
            routeId: 'jr-hokkaido.chitose',
            routeName: '千歳線',
            status: 'suspended',
            statusText: '一部運休が発生しています',
            rawText: "札幌圏で一部列車が運休しています",
            updatedAt: new Date().toISOString()
        }
    };

    console.log('\n--- Case 2: Official Suspended (Simulating regional keyword match) ---');
    const result2 = calculateSuspensionRisk(inputAreaStatus);
    console.log(`Probability: ${result2.probability}%`);
    console.log(`Status: ${result2.status}`);

    if (result2.probability >= 100 || result2.status === '運休中') {
        console.log('✅ PASS: Correctly handles suspended status.');
    } else {
        console.log('❌ FAIL: Failed to recognize suspension.');
    }
}

verifyFix();
