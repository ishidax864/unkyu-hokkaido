/**
 * DB Deep Analysis — 問題の根本原因を特定するスクリプト
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log('='.repeat(60));
    console.log('🔍 Deep Analysis: 問題の根本原因特定');
    console.log('='.repeat(60));

    // ===== 1. crawler_logs の月別推移 =====
    console.log('\n━━━━━ 1. crawler_logs 月別推移 ━━━━━');
    const { data: clAll } = await supabase.from('crawler_logs')
        .select('fetched_at, status, area_id')
        .order('fetched_at', { ascending: true });
    
    if (clAll) {
        const monthly: Record<string, { success: number; error: number }> = {};
        clAll.forEach(r => {
            const d = new Date(r.fetched_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthly[key]) monthly[key] = { success: 0, error: 0 };
            monthly[key][r.status === 'success' ? 'success' : 'error']++;
        });
        for (const [month, stats] of Object.entries(monthly).sort()) {
            console.log(`  ${month}: ✅ ${stats.success} / ❌ ${stats.error}`);
        }

        // 最新10件の時系列
        console.log('\n  【最新10件のクローラー実行】');
        const latest = clAll.slice(-10);
        for (const r of latest) {
            const t = new Date(r.fetched_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            console.log(`    ${r.status === 'success' ? '✅' : '❌'} ${r.area_id} - ${t}`);
        }
    }

    // ===== 2. route_status_history の日別推移 =====
    console.log('\n━━━━━ 2. route_status_history 日別推移（最新20日） ━━━━━');
    const { data: rshAll } = await supabase.from('route_status_history')
        .select('date, status, route_id')
        .order('date', { ascending: false })
        .limit(1000);
    
    if (rshAll) {
        const daily: Record<string, Record<string, number>> = {};
        rshAll.forEach(r => {
            if (!daily[r.date]) daily[r.date] = {};
            daily[r.date][r.status] = (daily[r.date][r.status] || 0) + 1;
        });
        const sorted = Object.entries(daily).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 20);
        for (const [date, statuses] of sorted) {
            const parts = Object.entries(statuses).map(([s, c]) => `${s}:${c}`).join(', ');
            console.log(`  ${date}: ${parts}`);
        }
    }

    // ===== 3. crawler_logs で raw_json に gaikyo があるか確認（最新） =====
    console.log('\n━━━━━ 3. 最新クローラーJSONの中身確認 ━━━━━');
    const { data: latestLogs } = await supabase.from('crawler_logs')
        .select('area_id, raw_json, status, content_hash, fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(10);
    
    if (latestLogs) {
        for (const log of latestLogs) {
            const t = new Date(log.fetched_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            const hasJson = !!log.raw_json;
            const gaikyoCount = log.raw_json?.today?.gaikyo?.length ?? 'N/A';
            const unkou = log.raw_json?.today?.unkou?.length ?? 'N/A';
            console.log(`  [${log.area_id}] ${t} | raw_json: ${hasJson ? 'あり' : 'なし(dedup)'} | gaikyo: ${gaikyoCount}件 | unkou: ${unkou}件`);
            
            // gaikyoの中身をサンプル表示
            if (log.raw_json?.today?.gaikyo?.length > 0) {
                const sample = log.raw_json.today.gaikyo[0];
                console.log(`    → サンプル: title="${sample.title}" honbun="${(sample.honbun || '').substring(0, 80)}..."`);
            }
        }
    }

    // ===== 4. ml_training_data のステータス分布（SQL集計で正確に） =====
    console.log('\n━━━━━ 4. ml_training_data ステータス正確集計 (RPC) ━━━━━');
    // Supabase JS client の制限を回避して全件スキャン
    const statuses = ['normal', 'delayed', 'suspended'];
    for (const status of statuses) {
        const { count } = await supabase.from('ml_training_data')
            .select('*', { count: 'exact', head: true })
            .eq('train_status', status);
        console.log(`  ${status}: ${(count ?? 0).toLocaleString()} 件`);
    }

    // ===== 5. ml_training_data の月別推移 =====
    console.log('\n━━━━━ 5. ml_training_data 月別推移（正確なcount） ━━━━━');
    const months = ['2026-02', '2026-03', '2026-04'];
    for (const m of months) {
        const start = `${m}-01T00:00:00Z`;
        const nextMonth = m === '2026-02' ? '2026-03' : m === '2026-03' ? '2026-04' : '2026-05';
        const end = `${nextMonth}-01T00:00:00Z`;
        const { count } = await supabase.from('ml_training_data')
            .select('*', { count: 'exact', head: true })
            .gte('recorded_at', start)
            .lt('recorded_at', end);
        console.log(`  ${m}: ${(count ?? 0).toLocaleString()} 件`);
    }

    // ===== 6. 3月前後のcrawler_logs: raw_jsonにgaikyoがあった最後の日 =====
    console.log('\n━━━━━ 6. gaikyoデータが入っていた最後のcrawler_log ━━━━━');
    const { data: withGaikyo } = await supabase.from('crawler_logs')
        .select('area_id, fetched_at, content_hash')
        .not('raw_json', 'is', null)
        .order('fetched_at', { ascending: false })
        .limit(5);
    
    if (withGaikyo) {
        for (const r of withGaikyo) {
            const t = new Date(r.fetched_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            console.log(`  ${r.area_id}: ${t} (hash: ${r.content_hash?.substring(0, 12)}...)`);
        }
    }

    // ===== 7. GitHub Actions cron (crawl_scheduler) の確認 =====
    console.log('\n━━━━━ 7. crawl間隔の確認 ━━━━━');
    if (clAll && clAll.length >= 2) {
        // 最新20件の間隔を計算
        const recent = clAll.slice(-20);
        const intervals: number[] = [];
        for (let i = 1; i < recent.length; i++) {
            const diff = new Date(recent[i].fetched_at).getTime() - new Date(recent[i-1].fetched_at).getTime();
            intervals.push(diff / (1000 * 60)); // minutes
        }
        const avgMin = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        console.log(`  最近のcrawl間隔（平均）: ${avgMin.toFixed(0)} 分`);
        console.log(`  最小: ${Math.min(...intervals).toFixed(0)} 分 / 最大: ${Math.max(...intervals).toFixed(0)} 分`);
    }

    console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
