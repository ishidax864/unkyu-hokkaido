
import { fetchDailyWeatherForecast } from '../lib/weather';
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { JROperationStatus } from '../lib/jr-status';

async function runDebug() {
    console.log('--- Debugging Prediction Logic ---');

    const routeId = 'jr-hokkaido.chitose';
    console.log(`Fetching weather for route: ${routeId}`);

    const weeklyWeather = await fetchDailyWeatherForecast(routeId);

    if (weeklyWeather.length === 0) {
        console.log('No weather data fetched.');
        return;
    }

    const todayWeather = weeklyWeather[0];
    console.log('Today Weather Data:', JSON.stringify(todayWeather, null, 2));

    const mockJrStatus: JROperationStatus = {
        routeId,
        routeName: '千歳線',
        status: 'normal',
        statusText: '平常運転',
        updatedAt: new Date().toISOString()
    };

    console.log('Running calculateSuspensionRisk for Today...');

    const input = {
        routeId,
        routeName: '千歳線',
        targetDate: todayWeather.date,
        targetTime: '12:00',
        weather: todayWeather,
        jrStatus: mockJrStatus,
        crowdsourcedStatus: null,
        historicalData: null
    };

    const result = calculateSuspensionRisk(input);

    console.log('Prediction Result:', JSON.stringify(result, null, 2));
}

runDebug().catch(console.error);
