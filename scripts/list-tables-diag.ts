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

async function listTables() {
    console.log('Listing all tables in public schema via RPC or raw query (if possible)...');
    // Supabase doesn't have a direct "list tables" in JS client easily without RPC.
    // But we can try to query information_schema if we have enough permissions.
    const { data, error } = await supabase.rpc('get_tables'); // This probably won't work unless defined

    if (error) {
        console.log('RPC get_tables failed (expected). Trying information_schema...');
        const { data: data2, error: error2 } = await supabase
            .from('pg_tables') // Usually not exposed to PostgREST
            .select('*')
            .eq('schemaname', 'public');

        if (error2) {
            console.log('Could not query pg_tables directly. Trying a different approach...');
            // Let's just try to check if we can run a raw SQL if we have pg-compatible layer? No.
            // Let's try to query some common Supabase tables.
            const commonTables = ['user_feedback', 'user_reports', 'partners', 'prediction_history', 'monitoring_logs', 'api_keys'];
            for (const t of commonTables) {
                const { error: e } = await supabase.from(t).select('*', { count: 'exact', head: true });
                if (e) {
                    console.log(`Table ${t}: ❌ ${e.message} (${e.code})`);
                } else {
                    console.log(`Table ${t}: ✅ EXISTS`);
                }
            }
        } else {
            console.log('Tables found:', data2.map(t => t.tablename));
        }
    } else {
        console.log('Tables:', data);
    }
}

listTables().catch(console.error);
