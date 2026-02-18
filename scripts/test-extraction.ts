import { extractNumericalStatus } from '../lib/jr-status';

const testCases = [
    {
        text: "函館本線は、大雪の影響で、一部の列車に30分程度の遅れが出ています。",
        expected: { delayMinutes: 30 }
    },
    {
        text: "千歳線は、信号点検のため、一部の列車に120分の遅れが出ています。",
        expected: { delayMinutes: 120 }
    },
    {
        text: "根室本線は、除雪作業のため、20時30分頃に運転再開を見込んでいます。",
        expected: { recoveryTime: "20:30" }
    },
    {
        text: "宗谷本線は、倒木の影響で、9時15分に運転を再開しました。",
        expected: { recoveryTime: "09:15" }
    },
    {
        text: "平常運転です。",
        expected: {}
    }
];

console.log("🚀 Testing Numerical Extraction Logic...");

testCases.forEach((tc, i) => {
    const result = extractNumericalStatus(tc.text);
    const pass = JSON.stringify(result) === JSON.stringify(tc.expected);
    console.log(`[Test ${i + 1}] ${pass ? '✅ PASS' : '❌ FAIL'}`);
    if (!pass) {
        console.log(`   Text: ${tc.text}`);
        console.log(`   Expected:`, tc.expected);
        console.log(`   Actual:  `, result);
    }
});
