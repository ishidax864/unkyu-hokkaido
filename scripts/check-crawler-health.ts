import { getAdminSupabaseClient } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkCrawlerHealth() {
    console.log('🔍 Checking Crawler Health & Data Accumulation...\n');

    const supabase = getAdminSupabaseClient();
    if (!supabase) {
        console.error('❌ Supabase Client not available. Check .env.local');
        return;
    }

    // 1. Check Crawler Logs
    const { data: logs, error: logsError } = await supabase
        .from('crawler_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logsError) {
        console.error('❌ Failed to fetch crawler logs:', logsError);
    } else {
        console.log(`✅ Recent Crawler Logs (${logs.length} found):`);
        logs.forEach((log: any) => {
            console.log(`  - [${log.created_at}] Area: ${log.area_id}, Status: ${log.status}`);
        });
    }

    // 2. Check Accumulated Status Data
    const { data: statusData, error: statusError, count } = await supabase
        .from('route_status_history')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .order('time', { ascending: false })
        .limit(5);

    if (statusError) {
        console.error('❌ Failed to fetch status history:', statusError);
    } else {
        console.log(`\n✅ Route Status History (Total entries: ${count}):`);
        statusData.forEach((item: any) => {
            console.log(`  - [${item.date} ${item.time}] Route: ${item.route_id}, Status: ${item.status}, Details: ${item.details.substring(0, 40)}...`);
        });
    }

    // 3. Accuracy Trend Estimation
    if (count && count > 0) {
        console.log('\n📈 Accuracy Outlook:');
        console.log(`  - 現在、${count}件の実績データが蓄積されています。`);
        console.log('  - データが増えるほど、特定の路線・天候パターンにおける「動的なリスク補正」の精度が自動的に向上します。');
        console.log('  - 特に「どの程度の雪で実際に止まったか」のログが溜まることで、閾値の個別最適化が可能になります。');
    }
}

checkCrawlerHealth().catch(console.error);
