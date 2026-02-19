
// Mock logic from lib/crawler.ts (AFTER FIX)
function parseStatus(content: string) {
    let status = 'normal';

    // 1. Check for Normal/Resumption keywords first (lowest priority)
    if (content.includes('再開') || content.includes('平常')) {
        status = 'normal';
    }

    // 2. Check for Delay (medium priority) - Overrides Normal
    if (content.includes('遅れ') || content.includes('遅延')) {
        status = 'delayed';
    }

    // 3. Check for Suspended (highest priority) - Overrides All
    if (content.includes('運休') || content.includes('見合')) {
        status = 'suspended';
    }

    return status;
}

const testText = "以下の区間で運転を見合わせています。なお函館線　小樽～手稲間は 19時 から 20時頃 の運転再開を見込んでいます。";

console.log(`Input: "${testText}"`);
const status = parseStatus(testText);
console.log(`Parsed Status: ${status}`);

if (status === 'normal') {
    console.log("❌ BUG REPRODUCED: Status became 'normal' because of '再開' (resumption) keyword.");
} else if (status === 'suspended') {
    console.log("✅ CORRECT: Status is 'suspended'.");
} else {
    console.log(`❓ Result: ${status}`);
}
