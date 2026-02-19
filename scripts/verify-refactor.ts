
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { WeatherForecast } from '../lib/types';

// Mock Weather for Strong Wind
const mockWeather: WeatherForecast = {
    date: '2026-02-20',
    // time: '12:00',
    weather: 'Cloudy',
    weatherCode: 3, // Cloud
    temperature: -5,
    precipitation: 0,
    snowfall: 0,
    windSpeed: 20.0, // Strong Wind
    windDirection: 0,
    windGust: 25.0,
    snowDepth: 0,
    snowDepthChange: 0,
    warnings: [{ type: '暴風警報', area: 'Sapporo', issuedAt: '2026-02-20T10:00:00' }],
    tempMax: -1,
    tempMin: -8
};

console.log("=== Refactor Verification (Wind) ===");

const result = calculateSuspensionRisk({
    routeId: 'jr-hokkaido.hakodate-main', // Vulnerability 1.0 (Wind Threshold 15)
    routeName: 'TEST ROUTE',
    weather: mockWeather,
    targetDate: '2026-02-20',
    targetTime: '12:00'
});

console.log(`Probability: ${result.probability}%`);
result.reasons.forEach(r => console.log(`- ${r}`));

// Checks
const hasStormWarning = result.reasons.some(r => r.includes('暴風警報'));
const hasWindReason = result.reasons.some(r => r.includes('風速20m/s'));

if (hasStormWarning && hasWindReason) {
    console.log("✅ PASS: Wind triggers correctly.");
} else {
    console.log("❌ FAIL: Missing wind reasons.");
    process.exit(1);
}

if (result.probability > 80) {
    console.log("✅ PASS: High probability for Storm Warning.");
} else {
    console.log(`⚠️ WARN: Probability might be too low: ${result.probability}%`);
}

// Check if Logic Engine is working
// If refactor failed, reasons might be empty or probability 0.
if (result.reasons.length >= 2) {
    console.log("✅ PASS: Multiple reasons detected (Engine is orchestrating).");
} else {
    console.log("❌ FAIL: Few reasons returned.");
}
