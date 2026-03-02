
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { calculateResumptionTime } from '../lib/prediction-engine/resumption';
import { PredictionInput, WeatherForecast, Route } from '../lib/types';

// Mock Utilities
const createWeather = (temp: number, snow: number, wind: number, warnings: string[] = []): WeatherForecast => ({
    date: '2026-02-20',
    weather: 'Snow', // Added
    // time property removed
    weatherCode: 71, // Snow
    temperature: temp,
    precipitation: 0,
    snowfall: snow,
    windSpeed: wind,
    windDirection: 0,
    windGust: wind * 1.5,
    snowDepth: 10,
    snowDepthChange: snow,
    warnings: warnings.map(w => ({ type: w as any, area: 'Test', issuedAt: '2026-02-20T10:00' })),
    tempMax: temp + 1,
    tempMin: temp - 1
});

const runTest = (name: string, check: () => boolean) => {
    process.stdout.write(`TEST: ${name.padEnd(50)} ... `);
    const passed = check();
    if (passed) console.log('✅ PASS');
    else {
        console.log('❌ FAIL');
        process.exit(1);
    }
};

console.log('=== 🐻 LEGENDARY VERIFICATION SUITE 🐻 ===\n');

// 1. Wet Snow Logic
// Boundary: Temp between -1 and +2, Snow >= 1.0
runTest('Wet Snow Trigger (0.5°C, 2cm)', () => {
    const result = calculateSuspensionRisk({
        routeId: 'jr-hokkaido.hakodate-main', // Vuln 1.0
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '12:00',
        weather: createWeather(0.5, 2.0, 5.0)
    });
    return result.reasons.some(r => r.includes('湿り雪'));
});

runTest('Wet Snow Boundary Cold (-2.0°C, 2cm)', () => {
    const result = calculateSuspensionRisk({
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '12:00',
        weather: createWeather(-2.0, 2.0, 5.0)
    });
    return !result.reasons.some(r => r.includes('湿り雪'));
});

runTest('Wet Snow Boundary Light (0.5°C, 0.5cm)', () => {
    const result = calculateSuspensionRisk({
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '12:00',
        weather: createWeather(0.5, 0.5, 5.0)
    });
    return !result.reasons.some(r => r.includes('湿り雪'));
});

// 2. Wolf Boy Regression (Official Normal + High Risk Weather)
runTest('Wolf Boy Mitigation (Storm vs Normal)', () => {
    const result = calculateSuspensionRisk({
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '12:00',
        weather: createWeather(-5, 5.0, 25.0, ['暴風警報']), // Severe Weather
        jrStatus: { // Official says Normal
            status: 'normal',
            statusText: '平常運転',
            updatedAt: '2026-02-20T11:00:00'
        }
    });
    // Should still be high risk
    return result.probability >= 70;
});

// 3. Partial Suspension Regression
runTest('Partial Suspension (Reduced Service)', () => {
    const result = calculateSuspensionRisk({
        routeId: 'jr-hokkaido.chitose',
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '12:00',
        weather: createWeather(-5, 0, 5.0), // Mild Weather
        jrStatus: {
            status: 'delay', // API might say delay
            statusText: '本数を減らして運転しています',
            rawText: '本数を減らして運転しています',
            updatedAt: '2026-02-20T11:00:00'
        }
    });
    // Should be boosted to caution/warning level
    return result.probability >= 50 && result.reasons.some(r => r.includes('公式発表'));
});

// 4. Snow Removal Buffer (Resumption Logic)
// We test calculateResumptionTime directly.
// We need a forecast array.
const createHourlyForecast = (snowAmounts: number[]): WeatherForecast[] => {
    return snowAmounts.map((snow, i) => createWeather(-5, snow, 5.0));
};

runTest('Snow Removal Buffer (29cm)', () => {
    // 29cm snow at hour 0 (unsafe), then 0cm (safe)
    const forecasts = createHourlyForecast([29, 0, 0, 0, 0, 0]);
    // Force safety window to start at index 1?
    // Actually, calculateResumptionTime finds the first safe window.
    // Index 0 has 29cm snow -> Unsafe.
    // Index 1,2,3,4 have 0cm -> Safe window starts at Index 1.
    // totalSnow during unsafe period (Index 0) = 29.

    // We need to verify that buffer does NOT include the +2h penalty.
    // Base snow buffer = 29 * weight. (Weight depends on vuln, but let's assume raw calc)
    // The +2h penalty is explicitly added if totalSnow >= 30.

    const result = calculateResumptionTime(forecasts, 'jr-hokkaido.hakodate-main');
    // We check the reason text strings for the specific mention of "大規模な除雪"
    return !result.reason.includes('大規模な除雪');
});

runTest('Snow Removal Buffer (31cm)', () => {
    const forecasts = createHourlyForecast([31, 0, 0, 0, 0, 0]);
    const result = calculateResumptionTime(forecasts, 'jr-hokkaido.hakodate-main');
    return result.reason.includes('大規模な除雪');
});

// 5. Future Masking Regression (Same Day Resumption)
runTest('Future Masking (Same Day > Resumption)', () => {
    const result = calculateSuspensionRisk({
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '20:00', // After resumption
        weather: createWeather(-2, 0, 5.0),
        jrStatus: {
            status: 'suspended',
            statusText: '運転見合わせ。18:00頃再開見込み',
            rawText: '運転見合わせ。18:00頃運転再開を見込んでいます。',
            updatedAt: '2026-02-20T17:00:00Z',
            resumptionTime: '2026-02-20T18:00:00+09:00'
        }
    });
    // Should be low risk (Delay/Normal), definitely NOT Suspended (100 or high)
    // Expecting < 60% (Delay cap is 60%, but weather is good so maybe lower)
    return result.probability < 70;
});

// 6. Future Masking Regression (Next Day)
runTest('Future Masking (Next Day)', () => {
    const result = calculateSuspensionRisk({
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: 'Test Route',
        targetDate: '2026-02-21', // Tomorrow
        targetTime: '08:00',
        weather: createWeather(-2, 0, 5.0),
        jrStatus: {
            status: 'suspended', // Current status is suspended
            statusText: '運転見合わせ',
            rawText: '運転見合わせ',
            updatedAt: '2026-02-20T17:00:00Z'
        }
    });
    // Should be low risk because today's status shouldn't affect tomorrow unless specified
    return result.probability < 50;
});

console.log('\nAll Legendary Tests Passed! 🚀');
