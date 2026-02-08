
import { WeatherForecast } from '@/lib/types';
import { getRouteCoordinates } from '@/lib/weather';
import { logger } from '@/lib/logger';

interface ArchiveHourlyResponse {
    latitude: number;
    longitude: number;
    timezone: string;
    hourly: {
        time: string[];
        temperature_2m: number[];
        precipitation: number[];
        wind_speed_10m: number[];
        wind_gusts_10m: number[];
        snow_depth: number[];
        weather_code: number[];
        snowfall: number[];
        winddirection_10m: number[];
    };
}

// Helper to map weather code to name (same as lib/weather.ts)
function getWeatherName(code: number): string {
    if (code === 0) return '快晴';
    if (code <= 3) return '晴れ';
    if (code <= 48) return '曇り';
    if (code <= 67) return '雨';
    if (code <= 77) return '雪';
    if (code <= 82) return '雨';
    if (code <= 86) return '雪';
    if (code <= 99) return '雷雨';
    return '不明';
}

/**
 * Fetch historical hourly weather data for a specific route and date.
 * Uses Open-Meteo Archive API.
 */
export async function fetchHistoricalWeather(
    routeId: string,
    date: string // YYYY-MM-DD
): Promise<WeatherForecast[]> {
    const { lat, lon } = getRouteCoordinates(routeId);

    // Request range: The specific date (start_date = end_date = date)
    // We need hourly data for the whole day to calculate risk appropriately.
    // Ideally, we might want previous day data for snow accumulation, but let's start with single day.

    // To properly simulate "snow depth change", we really need the previous day as well.
    // Let's fetch 2 days: the target date and the day before.
    const targetDateObj = new Date(date);
    const prevDateObj = new Date(targetDateObj);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const startDate = prevDateObj.toISOString().split('T')[0];
    const endDate = date;

    const url = `https://archive-api.open-meteo.com/v1/archive?` +
        `latitude=${lat}&longitude=${lon}` +
        `&start_date=${startDate}&end_date=${endDate}` +
        `&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,snow_depth,weather_code,snowfall,winddirection_10m` +
        `&timezone=Asia/Tokyo`;

    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit protection (gentle)

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Archive API error: ${response.status}`);
        }

        const data: ArchiveHourlyResponse = await response.json();
        const forecasts: WeatherForecast[] = [];

        // Filter for the target date only, but use previous data for calc if needed?
        // Actually, the risk engine takes `WeatherForecast` which represents a specific point in time (or daily summary).
        // For backtesting "Did it stop on this day?", we probably want to evaluate the "worst hour" of the target date,
        // or a series of hourly evaluations.

        // Let's return hourly forecasts for the TARGET DATE only.

        data.hourly.time.forEach((t, i) => {
            if (!t.startsWith(date)) return; // Skip previous day rows

            const prevIndex = i > 0 ? i - 1 : i; // Use previous hour (even if it's from yesterday)
            const snowDepth = data.hourly.snow_depth[i] || 0; // m
            const prevSnowDepth = data.hourly.snow_depth[prevIndex] || 0; // m

            // Calc snow depth change (cm)
            // Note: Archive API snow_depth is in meters? Check docs. Usually meters.
            // Our system uses cm for snowDepthChange.
            const snowDepthChange = (snowDepth - prevSnowDepth) * 100;

            const hourlyForecast: WeatherForecast = {
                date: date,
                targetTime: t.split('T')[1],
                weather: getWeatherName(data.hourly.weather_code[i]),
                tempMax: data.hourly.temperature_2m[i], // Point value
                tempMin: data.hourly.temperature_2m[i], // Point value
                precipitation: data.hourly.precipitation[i],
                windSpeed: data.hourly.wind_speed_10m[i],
                windGust: data.hourly.wind_gusts_10m[i],
                snowfall: data.hourly.snowfall[i], // cm
                snowDepth: snowDepth * 100, // m -> cm
                snowDepthChange: parseFloat(snowDepthChange.toFixed(1)),
                weatherCode: data.hourly.weather_code[i],
                windDirection: data.hourly.winddirection_10m[i],
                warnings: [], // We can't fetch historical warnings easily, so we might generate them from data
                surroundingHours: [] // Can be populated if needed
            };

            forecasts.push(hourlyForecast);
        });

        return forecasts;

    } catch (error) {
        logger.error('Failed to fetch historical weather', error, { routeId, date });
        return [];
    }
}
