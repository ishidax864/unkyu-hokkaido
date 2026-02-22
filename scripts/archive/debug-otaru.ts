
import { fetchHourlyWeatherForecast } from '../lib/weather';

async function run() {
    console.log('--- Debugging Sapporo-Otaru Weather ---');
    // Sapporo-Otaru usually uses Hakodate Main Line (Sapporo area) ID
    const routeId = 'jr-hokkaido.hakodate-main';

    // Target: Feb 5th 22:00 (Tomorrow from user perspective, but strictly checking date string)
    // User input date: 2026-02-05
    const targetDateTime = '2026-02-05T22:00';

    console.log(`Fetching data for: ${routeId} at ${targetDateTime}`);
    const forecast = await fetchHourlyWeatherForecast(routeId, targetDateTime);

    if (forecast) {
        console.log('Date:', forecast.date);
        console.log('Weather:', forecast.weather);
        console.log('Wind Speed (Mean):', forecast.windSpeed);
        console.log('Wind Gust:', forecast.windGust); // 54m/s?
        console.log('Warnings:', forecast.warnings);
    } else {
        console.log('Failed to fetch data');
    }
}

run();
