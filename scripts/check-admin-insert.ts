import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminInsert() {
    console.log('--- Checking Service Role Insert Accessibility ---');

    console.log('Trying to insert a test user_report via Service Role...');
    const { data, error: insErr } = await supabase.from('user_reports').insert({
        route_id: 'test-admin-insert',
        report_type: 'normal',
        comment: 'Checking if service_role can insert'
    }).select();

    if (insErr) {
        console.log(`❌ Insert failed: ${insErr.message} (${insErr.code})`);
    } else {
        console.log('✅ Insert successful!', data);
    }
}

checkAdminInsert().catch(console.error);
