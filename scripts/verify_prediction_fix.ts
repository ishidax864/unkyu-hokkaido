
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { MAX_PREDICTION_WITH_NORMAL_DATA } from '../lib/prediction-engine/constants';
import { PredictionInput } from '../lib/types';

// Mock Data
const mockWeather = {
    date: '2026-02-12',
    weather: 'Storm',
    tempMax: 0,
    tempMin: -5,
    precipitation: 0,
    windSpeed: 25, // High wind, should trigger high risk normally
    windDirection: 270, // West wind (not safe for Chitose)
    snowfall: 0,
    weatherCode: 0,
    warnings: [],
    targetTime: '12:00'
};

const routesToTest = [
    { id: 'jr-hokkaido.chitose', name: '千歳線' },
    { id: 'jr-hokkaido.hakodate-main', name: '函館本線' },
    { id: 'jr-hokkaido.sekihoku', name: '石北本線' }, // Mountainous, high vulnerability
    { id: 'jr-hokkaido.muroran', name: '室蘭本線' }   // Coastal
];

console.log('--- Starting Verification: Prediction Fix (Multi-Route) ---');

let allPassed = true;

for (const route of routesToTest) {
    console.log(`\n=== Testing Route: ${route.name} (${route.id}) ===`);

    // Case 1: High Wind + No Official Status (Baseline)
    const inputBaseline: PredictionInput = {
        routeId: route.id,
        routeName: route.name,
        targetDate: '2026-02-12',
        targetTime: '12:00',
        weather: mockWeather,
        jrStatus: null,
        crowdsourcedStatus: null,
        historicalData: null
    };

    const resultBaseline = calculateSuspensionRisk(inputBaseline);
    console.log(`[Baseline] High Wind (25m/s) -> Probability: ${resultBaseline.probability}%`);

    // Case 2: High Wind + Official Status NORMAL (The Fix)
    const inputNormal: PredictionInput = {
        ...inputBaseline,
        jrStatus: {
            status: 'normal',
            statusText: '平常運転',
            updatedAt: '2026-02-12T10:00:00',
            rawText: '現在、平常通り運転しています。'
        }
    };

    const resultNormal = calculateSuspensionRisk(inputNormal);
    const isCapped = resultNormal.probability <= MAX_PREDICTION_WITH_NORMAL_DATA;
    const hasCorrectReason = resultNormal.reasons.some(r => r.includes('公式情報'));

    console.log(`[Normal Status Cap] -> Probability: ${resultNormal.probability}%`);

    if (isCapped && hasCorrectReason) {
        console.log(`✅ Passed`);
    } else {
        console.error(`❌ FAILED: Risk not capped or reason missing.`);
        allPassed = false;
    }
}

if (allPassed) {
    console.log('\n✨ ALL ROUTES PASSED VERIFICATION ✨');
} else {
    console.error('\n⚠️ SOME ROUTES FAILED VERIFICATION ⚠️');
}
