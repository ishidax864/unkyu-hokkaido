import { calculateSuspensionRisk } from '../lib/prediction-engine/index';
// Mock data and types
import { PredictionInput, WeatherForecast } from '../lib/types';
import { calculateResumptionTime } from '../lib/prediction-engine/resumption';

// Case: 10:00 OK, 11:00 OK, 12:00 BAD, 13:00 OK
// If target is 12:00, we should NOT see "Resume at 10:00". We should see "Resume at 13:00" (or null if future is unknown).
// Wait, my mock only goes to 12. Let's add 13.
const mockWeather10: WeatherForecast = { date: '2026-02-09', weather: '晴れ', windSpeed: 5, snowfall: 0, tempMax: 0, tempMin: -5, precipitation: 0, warnings: [], targetTime: '10:00' };
const mockWeather11: WeatherForecast = { date: '2026-02-09', weather: '晴れ', windSpeed: 5, snowfall: 0, tempMax: 0, tempMin: -5, precipitation: 0, warnings: [], targetTime: '11:00' };
const mockWeather12: WeatherForecast = { date: '2026-02-09', weather: '暴風', windSpeed: 25, snowfall: 0, tempMax: 0, tempMin: -5, precipitation: 0, warnings: [], targetTime: '12:00' };
const mockWeather13: WeatherForecast = { date: '2026-02-09', weather: '晴れ', windSpeed: 5, snowfall: 0, tempMax: 0, tempMin: -5, precipitation: 0, warnings: [], targetTime: '13:00' };
const mockWeather14: WeatherForecast = { date: '2026-02-09', weather: '晴れ', windSpeed: 5, snowfall: 0, tempMax: 0, tempMin: -5, precipitation: 0, warnings: [], targetTime: '14:00' };
const mockWeather15: WeatherForecast = { date: '2026-02-09', weather: '晴れ', windSpeed: 5, snowfall: 0, tempMax: 0, tempMin: -5, precipitation: 0, warnings: [], targetTime: '15:00' };

mockWeather12.surroundingHours = [mockWeather10, mockWeather11, mockWeather12, mockWeather13, mockWeather14, mockWeather15];

console.log("--- 12:00 Search (Suspended) ---");
const input12: PredictionInput = {
    routeId: 'jr-hokkaido.hakodate-main',
    routeName: '函館本線',
    targetDate: '2026-02-09',
    targetTime: '12:00',
    weather: mockWeather12, // 12:00 is BAD
    jrStatus: { status: 'suspended', statusText: '雪のため運休' },
    crowdsourcedStatus: null
};

// Logic Test
const result12 = calculateSuspensionRisk(input12);
console.log(`Status: ${result12.status}`);
console.log(`Resumption: ${result12.estimatedRecoveryTime}`);
if (result12.status === '運休中' && result12.estimatedRecoveryTime === '11:00') {
    console.error("BUG DETECTED: Status is Suspended but Resumption is inside the past (11:00) relative to target (12:00).");
} else {
    console.log("Logic OK?");
}

// Case 2: Resume Logic direct check
console.log("\n--- Direct Resumption Logic Check ---");
const surrounding = [mockWeather10, mockWeather11, mockWeather12];
const resumption = calculateResumptionTime(surrounding, 'jr-hokkaido.hakodate-main');
console.log("Resumption Result:", resumption);
