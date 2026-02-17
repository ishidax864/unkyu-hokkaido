import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAnon() {
    console.log('--- Checking Anon Role Accessibility ---');
    const tables = ['user_reports', 'user_feedback'];
    for (const t of tables) {
        console.log(`Checking ${t}...`);
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            console.log(`❌ ${t}: ${error.message} (${error.code})`);
        } else {
            console.log(`✅ ${t}: Success, found ${data.length} rows.`);
        }
    }

    console.log('\nTrying to insert a test user_report anonymously...');
    const { error: insErr } = await supabase.from('user_reports').insert({
        route_id: 'test-anon-insert',
        report_type: 'normal',
        comment: 'Checking if anon can insert'
    });

    if (insErr) {
        console.log(`❌ Insert failed: ${insErr.message} (${insErr.code})`);
    } else {
        console.log('✅ Insert successful!');
    }
}

checkAnon().catch(console.error);
