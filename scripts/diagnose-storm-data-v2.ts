import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function diagnoseLiveData() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials in .env.local');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Starting Database Diagnosis (Last 24 Hours)...');
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Check Crawler Logs
    console.log('\n--- 🤖 Crawler Logs ---');
    const { data: logs, error: logError } = await supabase
        .from('crawler_logs')
        .select('*')
        .gte('fetched_at', since)
        .order('fetched_at', { ascending: false })
        .limit(10);

    if (logError) console.error('Error fetching logs:', logError);
    else if (logs.length === 0) console.warn('⚠️ No crawler logs found in the last 24 hours!');
    else {
        logs.forEach(log => {
            console.log(`[${log.fetched_at}] Area: ${log.area_id} | Status: ${log.status} | Err: ${log.error_message || 'None'}`);
        });
    }

    // 2. Check Official Status History
    console.log('\n--- 🚆 JR Status History ---');
    const { data: history, error: historyError } = await supabase
        .from('route_status_history')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

    if (historyError) console.error('Error fetching history:', historyError);
    else if (history.length === 0) console.warn('⚠️ No status changes recorded in the last 24 hours!');
    else {
        history.forEach(h => {
            // Show only relevant routes like chitose
            console.log(`[${h.created_at}] Route: ${h.route_id} | Status: ${h.status} | Details: ${h.details?.substring(0, 80)}...`);
        });
    }

    // 3. Check Prediction History
    console.log('\n--- 🔮 Recent Predictions ---');
    const { data: preds, error: predError } = await supabase
        .from('prediction_history')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(15);

    if (predError) console.error('Error fetching predictions:', predError);
    else if (preds.length === 0) console.warn('⚠️ No predictions recorded in the last 24 hours!');
    else {
        preds.forEach(p => {
            console.log(`[${p.created_at}] Route: ${p.route_id} | Prob: ${p.probability}% | Status: ${p.status}`);
        });
    }
}

diagnoseLiveData();
