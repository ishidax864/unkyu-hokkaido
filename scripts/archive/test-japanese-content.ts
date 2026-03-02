const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testDirect() {
    const { saveFeedback } = require('../lib/supabase');
    console.log('Testing saveFeedback with "テスト"...');
    const result = await saveFeedback({
        type: 'bug',
        content: 'テスト投稿（直接）',
    });
    console.log('Result:', JSON.stringify(result, null, 2));
}

testDirect().catch(console.error);
