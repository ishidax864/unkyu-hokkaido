import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput } from '../lib/types';

async function verifyArchitecturalSeparation() {
    console.log('🧪 Starting Architectural Separation Verification...');

    // JST considering
    const now = new Date();
    const nowStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const futureHour = (now.getHours() + 4) % 24;
    const futureStr = futureHour.toString().padStart(2, '0') + ':00';
    const dateStr = now.toISOString().split('T')[0];

    const stormWeather = {
        date: dateStr,
        targetTime: futureStr,
        windSpeed: 10,
        windGust: 22, // Significant gust
        snowfall: 2.0,
        humidity: 80,
        temperature: -5,
        precipProbability: 95,
        condition: 'snow',
        warnings: []
    };

    // --- Scenario 1: Rule ① (Near Real-Time) ---
    // Search for NOW. Official says Normal. Expect risk to be kept low (Capped at 35-50%).
    const inputNow: PredictionInput = {
        routeId: 'jr-hokkaido.chitose',
        routeName: '千歳線',
        targetDate: dateStr,
        targetTime: nowStr,
        weather: { ...stormWeather, targetTime: nowStr } as any,
        jrStatus: {
            routeId: 'jr-hokkaido.chitose',
            routeName: '千歳線',
            status: 'normal',
            statusText: '現在、遅れに関する情報はありません',
            updatedAt: new Date().toISOString()
        }
    };

    console.log(`\n--- Case 1: Near Real-Time (Search for ${nowStr}) ---`);
    const result1 = calculateSuspensionRisk(inputNow);
    console.log(`Probability: ${result1.probability}%`);
    console.log(`Reasons: ${result1.reasons.join(', ')}`);

    if (result1.probability <= 50) {
        console.log('✅ PASS: Real-time search is correctly constrained by official status.');
    } else {
        console.log('❌ FAIL: Real-time search should be more cautious about overriding official "Normal".');
    }

    // --- Scenario 2: Rule ② (Future Today) ---
    // Search for +4h. Official says Normal (Now). Weather says Storm (+4h).
    // Expect risk to NOT be capped at 35% and show weather risk (Blended).
    const inputFuture: PredictionInput = {
        routeId: 'jr-hokkaido.chitose',
        routeName: '千歳線',
        targetDate: dateStr,
        targetTime: futureStr,
        weather: stormWeather as any,
        jrStatus: {
            routeId: 'jr-hokkaido.chitose',
            routeName: '千歳線',
            status: 'normal',
            statusText: '現在、遅れに関する情報はありません',
            updatedAt: new Date().toISOString() // Current info
        }
    };

    console.log(`\n--- Case 2: Future Today (Search for ${futureStr}) ---`);
    const result2 = calculateSuspensionRisk(inputFuture);
    console.log(`Probability: ${result2.probability}%`);
    console.log(`Reasons: ${result2.reasons.join(', ')}`);

    if (result2.probability > 50) {
        console.log('✅ PASS: Future search correctly reflects weather risk (Not crushed by current Normal).');
    } else {
        console.log('❌ FAIL: Future risk is still being incorrectly suppressed by current official status.');
    }
}

verifyArchitecturalSeparation();
