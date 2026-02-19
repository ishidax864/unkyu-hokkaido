
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProdStatus() {
    console.log('🔍 Checking Production Data...');

    // 1. Check latest crawler logs
    const { data: logs, error: logError } = await supabase
        .from('crawler_logs')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(5);

    if (logError) {
        console.error('❌ Failed to fetch crawler logs:', logError);
    } else {
        console.log('\n📋 Latest Crawler Logs:');
        logs.forEach(log => {
            console.log(`  - [${new Date(log.fetched_at).toLocaleString()}] Area: ${log.area_id} | Status: ${log.status} | Msg: ${log.error_message || 'None'}`);
        });
    }

    // 2. Check latest route status history for key routes (Sapporo area)
    const { data: status, error: statusError } = await supabase
        .from('route_status_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (statusError) {
        console.error('❌ Failed to fetch route status history:', statusError);
    } else {
        console.log('\n📋 Latest Route Status History:');
        status.forEach(s => {
            console.log(`  - [${new Date(s.created_at).toLocaleString()}] Route: ${s.route_id} | Status: ${s.status} | Text: ${s.status_text?.substring(0, 50)}...`);
        });
    }

    // 3. Check current time in UTC/JST
    console.log('\n⏰ System Time Check:');
    console.log('  - UTC:', new Date().toISOString());
    console.log('  - Local:', new Date().toLocaleString());
}

checkProdStatus();
