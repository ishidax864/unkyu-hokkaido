const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function checkEnvironments() {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Supabase URL (Local Config):', process.env.NEXT_PUBLIC_SUPABASE_URL);

    console.log('\nScanning user_feedback for non-localhost URLs...');
    const { data: feedback, error: fErr } = await supabase
        .from('user_feedback')
        .select('created_at, content, page_url')
        .order('created_at', { ascending: false })
        .limit(20);

    if (fErr) {
        console.error('Feedback Error:', fErr);
    } else {
        feedback.forEach(item => {
            const isLocal = item.page_url?.includes('localhost') || !item.page_url;
            console.log(`- [${item.created_at}] ${isLocal ? '[LOCAL/NULL]' : '[PROD?]'} ${item.page_url || 'N/A'}`);
            console.log(`  Content snippet: ${item.content.substring(0, 30)}...`);
        });
    }
}

checkEnvironments().catch(console.error);
