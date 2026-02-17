const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testSave() {
    const { saveReportToSupabase, saveFeedback } = require('../lib/supabase');

    console.log('Testing saveFeedback...');
    const fRes = await saveFeedback({
        type: 'improvement',
        content: `Test feedback at ${new Date().toISOString()}`,
    });
    console.log('Feedback Result:', JSON.stringify(fRes, null, 2));

    console.log('\nTesting saveReportToSupabase...');
    const rRes = await saveReportToSupabase({
        route_id: 'test-route',
        report_type: 'stopped',
        comment: 'Test report',
    });
    console.log('Report Result:', JSON.stringify(rRes, null, 2));
}

testSave().catch(console.error);
