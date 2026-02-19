
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { WeatherForecast } from '../lib/types';

// Mock Data
const createWeather = (snowDepth: number): WeatherForecast => ({
    date: '2026-02-20',
    weather: 'Snow',
    weatherCode: 71,
    temperature: -2,
    precipitation: 0,
    snowfall: 0,
    windSpeed: 5,
    windDirection: 0,
    windGust: 8,
    snowDepth: snowDepth,
    warnings: [],
    tempMax: 0,
    tempMin: -5,
    snowDepthChange: 0
});

const runTest = (name: string, check: () => { pass: boolean; msg: string }) => {
    process.stdout.write(`TEST: ${name.padEnd(50)} ... `);
    const result = check();
    if (result.pass) console.log('✅ PASS');
    else {
        console.log(`❌ FAIL (${result.msg})`);
        process.exit(1);
    }
};

console.log('=== 🌪️ CHAOS LOGIC VERIFICATION 🌪️ ===\n');

// Common Setup
const routeId = 'jr-hokkaido.hakodate-main';
const resumptionTimeStr = '2026-02-20T18:00:00+09:00'; // 18:00 Resumption

// 1. Before Resumption (17:00)
runTest('Before Resumption (17:00)', () => {
    const result = calculateSuspensionRisk({
        routeId,
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '17:00',
        weather: createWeather(10), // Normal snow
        jrStatus: {
            status: 'suspended',
            statusText: '運転見合わせ',
            resumptionTime: resumptionTimeStr,
            updatedAt: '2026-02-20T16:00:00Z'
        }
    });
    // Should be Suspended (100)
    if (result.probability !== 100) return { pass: false, msg: `Exp 100, Got ${result.probability}` };
    return { pass: true, msg: '' };
});

// 2. Chaos Window (18:30) - Standard Snow (10cm)
// Window: 18:00 - 20:00 (2h)
runTest('Chaos Window (18:30, 10cm Snow)', () => {
    const result = calculateSuspensionRisk({
        routeId,
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '18:30',
        weather: createWeather(10),
        jrStatus: {
            status: 'suspended',
            statusText: '運転見合わせ',
            resumptionTime: resumptionTimeStr,
            updatedAt: '2026-02-20T16:00:00Z'
        }
    });
    // Should be Chaos (60%)
    if (result.probability < 60) return { pass: false, msg: `Exp >= 60, Got ${result.probability}` };
    if (!result.reasons.some(r => r.includes('運転再開直後'))) return { pass: false, msg: 'Missing chaos reason' };
    return { pass: true, msg: '' };
});

// 3. Post-Chaos (21:00) - Standard Snow (10cm)
// Window ended at 20:00. Should be Normal/Delay (<60 unless weather is bad, here weather is mild)
runTest('Post-Chaos (21:00, 10cm Snow)', () => {
    const result = calculateSuspensionRisk({
        routeId,
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '21:00',
        weather: createWeather(10),
        jrStatus: {
            status: 'suspended',
            statusText: '運転見合わせ',
            resumptionTime: resumptionTimeStr,
            updatedAt: '2026-02-20T16:00:00Z'
        }
    });
    // Should be < 60 (Downgraded to Delay or Normal)
    // Note: status-logic returns "Delay" (max 60) or "Normal"
    // Since we passed 21:00 (3h after), it should definitely be out of chaos.
    // However, status-logic keeps "Delay" buffer for a bit?
    // Let's check logic:
    // chaosEnd = 20:00. target 21:00 > chaosEnd.
    // standardBuffer = 19:00. target 21:00 > standardBuffer.
    // So it returns "Normal" or "Delay" depending on other factors?
    // Actually, status-logic returns:
    // if (target > bufferTime) return { status: 'delay', maxProp: 60 ... }
    // So it returns Delay. But probability calculation might settle lower if weather is good.
    // We expect it NOT to have the "Chaos" flag.
    if (result.reasons.some(r => r.includes('運転再開直後'))) return { pass: false, msg: 'Still has chaos reason' };
    return { pass: true, msg: '' };
});

// 4. Extended Chaos (20:30) - Heavy Snow (40cm)
// Window: 18:00 - 21:00 (3h) because > 30cm snow
runTest('Extended Chaos (20:30, 40cm Snow)', () => {
    const result = calculateSuspensionRisk({
        routeId,
        routeName: 'Test Route',
        targetDate: '2026-02-20',
        targetTime: '20:30',
        weather: createWeather(40), // Heavy Snow
        jrStatus: {
            status: 'suspended',
            statusText: '運転見合わせ',
            resumptionTime: resumptionTimeStr,
            updatedAt: '2026-02-20T16:00:00Z'
        }
    });
    // Should be Chaos (60%)
    if (result.probability < 60) return { pass: false, msg: `Exp >= 60, Got ${result.probability}` };
    if (!result.reasons.some(r => r.includes('運転再開直後'))) return { pass: false, msg: 'Missing chaos reason' };
    return { pass: true, msg: '' };
});

console.log('\nAll Chaos Tests Passed! 🌪️');
