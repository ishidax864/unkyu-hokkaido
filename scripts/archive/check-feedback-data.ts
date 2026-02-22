import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFeedback() {
    console.log('Checking user_feedback table...');
    const { data, error } = await supabase.from('user_feedback').select('*').order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching feedback:', error.message);
    } else {
        console.log(`✅ Success! Found ${data.length} feedback items.`);
        if (data.length > 0) {
            console.log('Recent items:');
            data.forEach(item => console.log(`- [${item.type}] ${item.content} (Status: ${item.status})`));
        }
    }
}

checkFeedback();
