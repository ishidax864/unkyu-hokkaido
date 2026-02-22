import { getAdminSupabaseClient } from '../lib/supabase';

async function diagnoseLiveData() {
    const supabase = getAdminSupabaseClient();
    if (!supabase) {
        console.error('❌ Supabase client initialization failed. Check .env.local');
        return;
    }

    console.log('🔍 Starting Database Diagnosis (Last 12 Hours)...');
    const now = new Date();
    const since = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();

    // 1. Check Crawler Logs
    console.log('\n--- 🤖 Crawler Logs ---');
    const { data: logs, error: logError } = await supabase
        .from('crawler_logs')
        .select('*')
        .gte('fetched_at', since)
        .order('fetched_at', { ascending: false })
        .limit(10);

    if (logError) console.error('Error fetching logs:', logError);
    else if (logs.length === 0) console.warn('⚠️ No crawler logs found in the last 12 hours!');
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
        .order('created_at', { ascending: false })
        .limit(20);

    if (historyError) console.error('Error fetching history:', historyError);
    else if (history.length === 0) console.warn('⚠️ No status changes recorded in the last 12 hours!');
    else {
        history.forEach(h => {
            console.log(`[${h.created_at || h.timestamp}] Route: ${h.route_id} | Status: ${h.status} | Details: ${h.details?.substring(0, 50)}...`);
        });
    }

    // 3. Check Prediction History (to see what was actually shown)
    console.log('\n--- 🔮 Recent Predictions ---');
    const { data: preds, error: predError } = await supabase
        .from('prediction_history')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10);

    if (predError) console.error('Error fetching predictions:', predError);
    else if (preds.length === 0) console.warn('⚠️ No predictions recorded in the last 12 hours!');
    else {
        preds.forEach(p => {
            console.log(`[${p.created_at}] Route: ${p.route_id} | Prob: ${p.probability}% | Status: ${p.status} | OfficialInfluenced: ${p.is_official_influenced}`);
        });
    }
}

diagnoseLiveData();
