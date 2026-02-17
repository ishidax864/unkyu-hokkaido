const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function searchTest() {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Searching for "テスト" in user_feedback...');
    const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .ilike('content', '%テスト%');

    if (error) console.error(error);
    else {
        console.log(`Found ${data.length} matches.`);
        data.forEach(item => console.log(`- [${item.created_at}] ${item.content}`));
    }
}

searchTest().catch(console.error);
