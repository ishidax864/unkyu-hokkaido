const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testApi() {
    console.log('Fetching /api/admin/stats (logic test)...');
    const { getGlobalStats } = require('../lib/supabase');
    const result = await getGlobalStats();
    console.log('Result:', JSON.stringify(result, null, 2));
}

testApi().catch(console.error);
