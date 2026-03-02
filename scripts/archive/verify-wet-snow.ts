
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { WeatherForecast } from '../lib/types';

// Mock Weather for Wet Snow
const mockWeather: WeatherForecast = {
    date: '2026-02-20',
    // time: '08:00', // Removed
    weather: 'Snow', // Added dummy
    weatherCode: 71, // Snow
    temperature: 0.5,
    precipitation: 0,
    snowfall: 2.0,
    windSpeed: 5.0,
    windDirection: 0,
    windGust: 10.0,
    snowDepth: 10,
    snowDepthChange: 1,
    warnings: [],
    tempMax: 1,
    tempMin: 0
};

console.log("=== Wet Snow Logic Verification ===");

const result = calculateSuspensionRisk({
    routeId: 'jr-hokkaido.hakodate-main', // Vulnerability 1.0
    routeName: 'TEST ROUTE', // Added
    weather: mockWeather,
    targetDate: '2026-02-20',
    targetTime: '08:00'
});

// Check probability magnitude
// Moderate Snow (2cm) -> 25 + (2-2)*15 = 25
// Wet Snow (2cm) -> 20 + (2-1)*10 = 30
// Total ~ 55
// Plus Wind (Light) ~ 5?
// Winter Risk ~ 5?
// Expected ~ 60-70

if (result.probability >= 50) {
    console.log(`✅ PASS: Probability (${result.probability}%) reflects increased risk.`);
} else {
    console.log(`⚠️ WARN: Probability might be too low: ${result.probability}%`);
}
