import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput, WeatherForecast } from '../lib/types';

async function testCrawlerIntegration() {
    console.log('🧪 Testing Crawler Integration Logic...\n');

    const todayStr = new Date().toISOString().split('T')[0];
    const baseWeather: WeatherForecast = {
        date: todayStr,
        weather: 'clear',
        tempMax: -2,
        tempMin: -10,
        precipitation: 0,
        windSpeed: 5, // Low wind
        warnings: []
    };

    const baseInput: PredictionInput = {
        routeId: 'jr-hokkaido.soya',
        routeName: 'Soya Line',
        targetDate: todayStr,
        targetTime: '12:00',
        weather: baseWeather,
        jrStatus: { status: 'delay' }
    };

    // Scenario 1: Clean slate (No history)
    const res1 = calculateSuspensionRisk(baseInput);
    console.log(`Scenario 1 (No History): Prob = ${res1.probability}%`);

    const nowHour = new Date().getHours();
    const twoHoursAgo = `${String(Math.max(0, nowHour - 2)).padStart(2, '0')}:00`;

    // Scenario 2: Recent Suspension in History (within 6h)
    const inputWithSuspension: PredictionInput = {
        ...baseInput,
        officialHistory: [
            {
                status: 'suspended',
                cause: 'blizzard',
                date: todayStr,
                time: twoHoursAgo
            }
        ]
    };
    const res2 = calculateSuspensionRisk(inputWithSuspension);
    console.log(`Scenario 2 (Recent Suspension): Prob = ${res2.probability}% (Expected >= 70%)`);
    console.log(`Reason: ${res2.reasons.find(r => r.includes('公式履歴'))}`);

    // Scenario 3: Increasing Delays
    const inputWithIncreasingDelays: PredictionInput = {
        ...baseInput,
        officialHistory: [
            { status: 'delayed', cause: 'snow', date: todayStr, time: '11:00', delay_minutes: 45 },
            { status: 'delayed', cause: 'snow', date: todayStr, time: '10:00', delay_minutes: 20 }
        ]
    };
    const res3 = calculateSuspensionRisk(inputWithIncreasingDelays);
    console.log(`Scenario 3 (Increasing Delays): Prob = ${res3.probability}% (vs Base ${res1.probability}%)`);
    console.log(`Reason: ${res3.reasons.find(r => r.includes('遅延が拡大'))}`);

    if (res2.probability >= 70 && res3.probability > res1.probability) {
        console.log('\n✅ Verification Success: Crawler data correctly biases risk!');
    } else {
        console.log('\n❌ Verification Failed: Risk Bias not applied correctly.');
        process.exit(1);
    }
}

testCrawlerIntegration();
