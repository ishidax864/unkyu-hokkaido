import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Crawler Logs ---');
    const { data: logs, error: logError } = await supabase
        .from('crawler_logs')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(5);

    if (logError) console.error(logError);
    else {
        console.log(`Latest Logs: ${logs.length}`);
        logs.forEach(l => console.log(`- ${l.fetched_at} (${l.area_id})`));
    }

    console.log('\n--- Checking Route Status History ---');
    const { data: history, error: histError } = await supabase
        .from('route_status_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (histError) console.error(histError);
    else {
        console.log(`Latest Status: ${history.length}`);
        history.forEach(h => console.log(`- ${h.created_at} [${h.route_id}] ${h.status}: ${h.details?.substring(0, 20)}...`));
    }
}

check();
