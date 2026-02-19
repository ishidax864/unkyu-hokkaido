
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput, WeatherForecast } from '../lib/types';

// Mock Input
const input: PredictionInput = {
    routeId: 'jr-hokkaido.chitose',
    routeName: '千歳線',
    targetDate: '2026-02-19',
    targetTime: '18:00',
    weather: {
        windSpeed: 4.0, // Mild wind
        windGust: 8.0,
        snowfall: 0,
        weather: 'Cloudy',
        warnings: []
    } as WeatherForecast,
    jrStatus: {
        status: 'delay', // Not suspended, but...
        statusText: '大雪の影響により、札幌〜新千歳空港間では本数を減らして運転しています。',
        rawText: '大雪の影響により、札幌〜新千歳空港間では本数を減らして運転しています。',
        updatedAt: '2026-02-19T17:00:00Z'
    }
};

console.log('--- Test: Partial Suspension Detection ---');
const result = calculateSuspensionRisk(input);

console.log(`Input Text: "${input.jrStatus?.rawText}"`);
console.log(`Result Probability: ${result.probability}%`);
console.log(`Result Reasons:`, result.reasons);

if (result.probability >= 80 && result.reasons.some(r => r.includes('公式発表'))) {
    console.log('✅ Success: Risk boosted to High due to "本数を減らして" keyword.');
} else {
    console.log('❌ Failed: Risk was not boosted adequately.');
    process.exit(1);
}
