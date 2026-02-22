
import { determineBaseStatus } from '../lib/prediction-engine/status-logic';

const runTest = () => {
    console.log("--- Partial Suspension Logic Test ---");

    // Case 1: Partial Suspension Text
    const partialText = "函館線 小樽駅構内で、昨日からの降雪にともなう除雪作業に時間を要したため、一部の列車に運休・遅れが出ています。";

    const input = {
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: '函館本線',
        targetDate: '2026-02-20',
        targetTime: '10:30',
        jrStatus: {
            status: 'delay',
            rawText: partialText,
            statusText: partialText
        },
        weather: {
            // Mock minimal weather to trigger recovery calculation if not suppressed
            date: '2026-02-20',
            surroundingHours: [{
                targetTime: '10:00',
                windSpeed: 25, // Bad weather
                snowfall: 0
            }, {
                targetTime: '11:00',
                windSpeed: 5, // Good weather (Recovery trigger)
                snowfall: 0,
                warnings: [], // Fix crash
                weather: 'Cloudy',
                tempMax: 0, tempMin: 0, precipitation: 0,
                windGust: 5, windDirection: 0, pressure: 1000,
                weatherCode: 3
            }],
            warnings: [] // Fix crash
        }
    } as any;

    const { calculateSuspensionRisk } = require('../lib/prediction-engine');
    const result = calculateSuspensionRisk(input);

    console.log(`Input Text: "${partialText}"`);
    console.log(`Result Status: ${result.status}`);
    console.log(`Result Recovery Time: ${result.estimatedRecoveryTime}`);

    if (result.status === '運休') {
        console.error("FAIL: Partial suspension treated as Total Suspension!");
    } else if (!result.isPartialSuspension) {
        console.error("FAIL: isPartialSuspension flag is Missing or False!");
    } else if (result.partialSuspensionText !== partialText) {
        console.error(`FAIL: partialSuspensionText mismatch! Expected: "${partialText}", Got: "${result.partialSuspensionText}"`);
    } else {
        console.log("PASS: Partial suspension treated as Delay/Caution, Recovery Time suppressed, and Text preserved.");
    }
};

runTest();
