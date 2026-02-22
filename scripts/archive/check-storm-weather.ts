import { fetchHourlyWeatherForecast } from '../lib/weather';
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput } from '../lib/types';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkWeatherAndPrediction() {
    console.log('🌡️ Fetching Live Weather Data for Sapporo (Hakodate Main)...');

    // Simulate current time for 2026-02-19
    const targetDate = '2026-02-19';
    const targetTime = '09:00';
    const dateTime = `${targetDate}T${targetTime}:00`;

    const weather = await fetchHourlyWeatherForecast('jr-hokkaido.hakodate-main', dateTime);

    if (!weather) {
        console.error('❌ Failed to fetch weather.');
        return;
    }

    console.log(`\n--- 🌧️ Weather Data for ${dateTime} ---`);
    console.log(`Condition: ${weather.weather}`);
    console.log(`Wind: ${weather.windSpeed} m/s (Gust: ${weather.windGust} m/s)`);
    console.log(`Snowfall: ${weather.snowfall} cm`);
    console.log(`Warnings: ${weather.warnings.map(w => w.type).join(', ') || 'None'}`);

    const input: PredictionInput = {
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: '函館本線',
        targetDate,
        targetTime,
        weather,
        jrStatus: {
            routeId: 'jr-hokkaido.hakodate-main',
            routeName: '函館本線',
            status: 'normal', // Assume normal initially to see weather risk
            statusText: '平常運転',
            updatedAt: new Date().toISOString()
        }
    };

    console.log('\n--- 🔮 Prediction Logic Output (Assuming Normal JR Status) ---');
    const result = calculateSuspensionRisk(input);
    console.log(`Probability: ${result.probability}%`);
    console.log(`Reasons: ${result.reasons.join(', ')}`);
}

checkWeatherAndPrediction();
