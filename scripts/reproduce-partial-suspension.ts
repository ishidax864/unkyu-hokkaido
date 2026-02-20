
import { determineBaseStatus } from '../lib/prediction-engine/status-logic';

const runTest = () => {
    console.log("--- Partial Suspension Logic Test ---");

    // Case 1: Partial Suspension Text
    const partialText = "函館線 小樽駅構内で、昨日からの降雪にともなう除雪作業に時間を要したため、一部の列車に運休・遅れが出ています。";

    // Using determineBaseStatus directly
    const result = determineBaseStatus(
        {
            status: 'delay', // Official API/Crawler might say 'delay' or 'normal' but text has 'unkyu'
            rawText: partialText,
            statusText: partialText
        },
        '2026-02-20',
        '10:30'
    );

    console.log(`Input Text: "${partialText}"`);
    console.log(`Result Status: ${result.status}`);
    console.log(`Is Official Suspended: ${result.isOfficialSuspended}`);

    if (result.status === '運休' || result.isOfficialSuspended) {
        console.error("FAIL: Partial suspension treated as Total Suspension!");
    } else {
        console.log("PASS: Partial suspension treated as Delay/Caution.");
    }
};

runTest();
