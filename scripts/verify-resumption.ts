
import { calculateResumptionTime } from '../lib/prediction-engine/resumption';
import { WeatherForecast } from '@/lib/types';

// Mock Data for Mar 19, 2024 (Blizzard ending)
// Scenario:
// 12:00 - 15:00: Heavy Snow (4cm/h), Wind 25m/s (STOP)
// 16:00 - 17:00: Moderate Snow (2cm/h), Wind 18m/s (Getting Better)
// 18:00 - 20:00: Light Snow (0am/h), Wind 10m/s (Safe Window)

const mockForecasts: WeatherForecast[] = [
    { targetTime: '12:00', windSpeed: 25, snowfall: 4 } as any,
    { targetTime: '13:00', windSpeed: 26, snowfall: 3 } as any,
    { targetTime: '14:00', windSpeed: 24, snowfall: 5 } as any, // Peak snow
    { targetTime: '15:00', windSpeed: 22, snowfall: 2 } as any,
    { targetTime: '16:00', windSpeed: 18, snowfall: 1 } as any, // Wind Safe, Snow Safe
    { targetTime: '17:00', windSpeed: 15, snowfall: 0 } as any, // Safe 2
    { targetTime: '18:00', windSpeed: 12, snowfall: 0 } as any, // Safe 3 -> Window Starts at 16:00? No, 16,17,18 all safe.
    { targetTime: '19:00', windSpeed: 10, snowfall: 0 } as any,
];

function runTest() {
    console.log('=== Testing Resumption Logic (Mar 19 Blizzard Scenario) ===');

    const result = calculateResumptionTime(mockForecasts, 'jr-hokkaido.hakodate-main');

    console.log('Result:', result);

    // Manual Validation
    // Safe Window: 16:00, 17:00, 18:00 are all safe (<20m/s, <3cm/h)
    // So safetyStartTime should be 16:00.
    // Total Snow before 16:00: 4+3+5+2 = 14cm.
    // Buffer for >10cm snow: 3 hours.
    // Estimated Resumption: 16:00 + 3h = 19:00.

    if (result.estimatedResumption === '19:00' && result.requiredBufferHours === 3) {
        console.log('✅ verification PASSED');
    } else {
        console.error('❌ verification FAILED');
        console.log('Expected 19:00 with 3h buffer');
    }
}

runTest();
