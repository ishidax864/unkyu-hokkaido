
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput, WeatherForecast } from '../lib/types';

// Mock surrounding hours generator
const generateSurroundingHours = (targetHour: number): WeatherForecast[] => {
    const hours: WeatherForecast[] = [];
    // Simulate the BUG: i=0 is skipped
    for (let i = -12; i <= 12; i++) {
        if (i === 0) continue; // The "Hole" at targetHour relative to forecast fetch

        const h = targetHour + i;
        const normalizedH = (h + 24) % 24; // Simple wrap for mock
        const timeStr = `${String(normalizedH).padStart(2, '0')}:00`;

        // Critical: Make weather SAFE everywhere EXCEPT maybe early morning to force recovery calculation
        // Let's maximize wind at 00:00 - 09:00 to ensure recovery time is pushed to ~11:00 or 12:00
        let windSpeed = 5;
        if (normalizedH < 10) {
            windSpeed = 25; // High wind until 10am
        }

        hours.push({
            date: '2026-02-20',
            targetTime: timeStr,
            weather: 'Cloudy',
            snowfall: 0,
            windSpeed: windSpeed,
            weatherCode: 3,
            warnings: [],
            tempMax: 0, tempMin: 0, precipitation: 0, windGust: windSpeed + 5, windDirection: 0, pressure: 1000
        });
    }
    return hours;
};

async function runTest() {
    console.log("--- Reproduction Test ---");

    // Mock Base Input
    const baseInput: PredictionInput = {
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: '函館本線',
        targetDate: '2026-02-20',
        targetTime: '10:00', // varies
        jrStatus: {
            status: 'suspended',
            rawText: '雪のため運休', // No resumption time
            updatedAt: '2026-02-20T08:00:00',
            source: 'official'
        },
        weather: {
            date: '2026-02-20',
            weather: 'Cloudy',
            surroundingHours: [], // Filled below
            tempMax: 0, tempMin: 0, precipitation: 0, windSpeed: 0, snowfall: 0, windGust: 0, weatherCode: 3, warnings: []
        },
        historicalData: null,
        crowdsourcedStatus: null,
        officialHistory: null
    };

    // Scenario 1: Target Time 10:00
    // The "hole" is at 10:00.
    // Assuming effective prediction logic starts from "Now" (e.g. 10:00).
    const surrounding1 = generateSurroundingHours(10);
    // This array lacks 10:00. Has 09:00, 11:00...

    // In calculating recovery, we filter for hours >= "Now". 
    // If we assume "Now" is 10:00 (user searching for current time).
    // The filtered list will start with 11:00 (because 10:00 is missing).
    // Wind at <10 is high. (09 is high).
    // Wind at >=10 is low (5).
    // Since 11:00 is low, recovery might be detected immediately at 11:00 + buffer.

    const input1 = { ...baseInput, targetTime: '10:00', weather: { ...baseInput.weather, surroundingHours: surrounding1 } };
    const result1 = calculateSuspensionRisk(input1);
    console.log(`[Target 10:00] Recovery: ${result1.estimatedRecoveryTime}, Prob: ${result1.probability}, Status: ${result1.status}`);

    // Scenario 2: Target Time 13:00
    // The "hole" is at 13:00.
    // User searching for 13:00. "Now" is still 10:00 (server time).
    const surrounding2 = generateSurroundingHours(13);
    // This array lacks 13:00. Has 12:00, 14:00...
    // Filter >= 10:00.
    // Includes: 10, 11, 12, (missing 13), 14, ...
    // Since 10, 11, 12 are all safe (wind 5).
    // Recovery should be identical or very close to Scenario 1?
    // Wait, generateSurroundingHours(13) generates relative to 13.
    // i=-3 -> 10:00. i=0 -> 13:00(skip).
    // So 10:00 is present.
    // Start of safety window: should be same (10:00 or 11:00).

    const input2 = { ...baseInput, targetTime: '13:00', weather: { ...baseInput.weather, surroundingHours: surrounding2 } };
    const result2 = calculateSuspensionRisk(input2);
    console.log(`[Target 13:00] Recovery: ${result2.estimatedRecoveryTime}, Prob: ${result2.probability}, Status: ${result2.status}`);

    // Verification 1: Consistency
    if (result1.estimatedRecoveryTime !== result2.estimatedRecoveryTime) {
        console.error(`FAIL: Recovery time inconsistent! 10:00->${result1.estimatedRecoveryTime} vs 13:00->${result2.estimatedRecoveryTime}`);
    } else {
        console.log("PASS: Recovery time consistent.");
    }

    // Verification 2: Status Discrepancy
    // If recovery is ~12:00. input2.targetTime is 13:00.
    // 13:00 > 12:00. Status should NOT be 100%.
    if (result2.estimatedRecoveryTime) {
        const [recH, recM] = result2.estimatedRecoveryTime.split(':').map(Number);
        const [tgtH, tgtM] = input2.targetTime.split(':').map(Number);
        const recMin = recH * 60 + recM;
        const tgtMin = tgtH * 60 + tgtM;

        if (tgtMin > recMin + 60) {
            if (result2.probability === 100) {
                console.error("FAIL: Status is 100% (Suspended) even though Target > Recovery + 1h");
            } else {
                console.log(`PASS: Status correctly downgraded to ${result2.probability}%`);
            }
        }
    }
}

runTest();
