import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('--- Inspecting database schema ---');

    // Try to query common tables via POST
    const tables = ['user_reports', 'user_feedback', 'partners', 'prediction_history'];

    for (const t of tables) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (error) {
            console.log(`Table ${t}: ❌ ${error.message} (${error.code})`);
        } else {
            console.log(`Table ${t}: ✅ OK`);
        }
    }

    // Try to see if we can get anything from rpc if get_tables exists
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_tables');
    if (!rpcError) {
        console.log('RPC get_tables result:', rpcData);
    }
}

inspectSchema().catch(console.error);
