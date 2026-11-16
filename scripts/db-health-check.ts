/**
 * DB Health Check — ML学習用データの状態を総合的にチェック
 * Usage: npx tsx scripts/db-health-check.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('='.repeat(60));
    console.log('📊 運休AI データベース健全性チェック');
    console.log('='.repeat(60));
    console.log(`チェック日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n`);

    // ===== 1. テーブル一覧と件数 =====
    console.log('━━━━━ 1. テーブル別レコード数 ━━━━━');
    const tables = ['ml_training_data', 'route_status_history', 'crawler_logs', 'user_reports', 'prediction_history', 'user_feedback', 'monitoring_logs'];
    
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`  ❌ ${table}: エラー (${error.message})`);
        } else {
            console.log(`  ${(count ?? 0) > 0 ? '✅' : '⚠️'} ${table}: ${(count ?? 0).toLocaleString()} 件`);
        }
    }

    // ===== 2. ML Training Data 詳細 =====
    console.log('\n━━━━━ 2. ML学習データ (ml_training_data) 詳細 ━━━━━');
    
    const { count: mlTotal } = await supabase.from('ml_training_data').select('*', { count: 'exact', head: true });
    console.log(`  総レコード数: ${(mlTotal ?? 0).toLocaleString()} 件`);

    // 最古と最新
    const { data: oldest } = await supabase.from('ml_training_data')
        .select('recorded_at').order('recorded_at', { ascending: true }).limit(1).single();
    const { data: newest } = await supabase.from('ml_training_data')
        .select('recorded_at').order('recorded_at', { ascending: false }).limit(1).single();
    
    if (oldest && newest) {
        console.log(`  最古のレコード: ${new Date(oldest.recorded_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        console.log(`  最新のレコード: ${new Date(newest.recorded_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        const days = Math.round((new Date(newest.recorded_at).getTime() - new Date(oldest.recorded_at).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`  収集期間: ${days} 日間`);
    }

    // ステータス別内訳
    console.log('\n  【ステータス別内訳】');
    const { data: statusData } = await supabase.from('ml_training_data').select('train_status');
    if (statusData) {
        const statusCounts: Record<string, number> = {};
        statusData.forEach(r => {
            statusCounts[r.train_status] = (statusCounts[r.train_status] || 0) + 1;
        });
        for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
            const pct = ((count / statusData.length) * 100).toFixed(1);
            console.log(`    ${status}: ${count.toLocaleString()} 件 (${pct}%)`);
        }
    }

    // 路線別内訳
    console.log('\n  【路線別レコード数】');
    const { data: routeData } = await supabase.from('ml_training_data').select('route_id');
    if (routeData) {
        const routeCounts: Record<string, number> = {};
        routeData.forEach(r => {
            routeCounts[r.route_id] = (routeCounts[r.route_id] || 0) + 1;
        });
        const sorted = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]);
        for (const [route, count] of sorted) {
            console.log(`    ${route}: ${count.toLocaleString()} 件`);
        }
    }

    // 天気データの充実度
    console.log('\n  【天気データの充実度】');
    const weatherFields = ['temperature', 'wind_speed', 'wind_gust', 'snowfall', 'precipitation', 'snow_depth', 'weather_code'];
    for (const field of weatherFields) {
        const { count: nonNull } = await supabase.from('ml_training_data')
            .select('*', { count: 'exact', head: true })
            .not(field, 'is', null);
        const pct = mlTotal ? (((nonNull ?? 0) / mlTotal) * 100).toFixed(1) : '0';
        console.log(`    ${field}: ${(nonNull ?? 0).toLocaleString()} 件 (${pct}%)`);
    }

    // ===== 3. 月別データ量 =====
    console.log('\n━━━━━ 3. 月別データ量推移 ━━━━━');
    const { data: allRecords } = await supabase.from('ml_training_data')
        .select('recorded_at')
        .order('recorded_at', { ascending: true });
    
    if (allRecords) {
        const monthCounts: Record<string, number> = {};
        allRecords.forEach(r => {
            const d = new Date(r.recorded_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthCounts[key] = (monthCounts[key] || 0) + 1;
        });
        for (const [month, count] of Object.entries(monthCounts).sort()) {
            const bar = '█'.repeat(Math.min(Math.round(count / 500), 40));
            console.log(`    ${month}: ${count.toLocaleString().padStart(7)} ${bar}`);
        }
    }

    // ===== 4. Crawler Logs =====
    console.log('\n━━━━━ 4. クローラー最新ステータス ━━━━━');
    const { data: crawlerLogs } = await supabase.from('crawler_logs')
        .select('area_id, status, fetched_at, error_message')
        .order('fetched_at', { ascending: false })
        .limit(30);
    
    if (crawlerLogs) {
        const latestPerArea = new Map<string, typeof crawlerLogs[0]>();
        crawlerLogs.forEach(log => {
            if (!latestPerArea.has(log.area_id)) {
                latestPerArea.set(log.area_id, log);
            }
        });
        for (const [area, log] of latestPerArea) {
            const icon = log.status === 'success' ? '✅' : '❌';
            const time = new Date(log.fetched_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            console.log(`    ${icon} ${area}: ${log.status} (${time})`);
            if (log.error_message) console.log(`       ↳ ${log.error_message}`);
        }
    }

    // ===== 5. route_status_history =====
    console.log('\n━━━━━ 5. 公式運行ステータス履歴 (route_status_history) ━━━━━');
    const { count: rshTotal } = await supabase.from('route_status_history').select('*', { count: 'exact', head: true });
    console.log(`  総レコード数: ${(rshTotal ?? 0).toLocaleString()} 件`);
    
    const { data: rshOldest } = await supabase.from('route_status_history')
        .select('date').order('date', { ascending: true }).limit(1).single();
    const { data: rshNewest } = await supabase.from('route_status_history')
        .select('date').order('date', { ascending: false }).limit(1).single();
    if (rshOldest && rshNewest) {
        console.log(`  最古: ${rshOldest.date} / 最新: ${rshNewest.date}`);
    }

    // ステータス別
    const { data: rshStatus } = await supabase.from('route_status_history').select('status');
    if (rshStatus) {
        const sc: Record<string, number> = {};
        rshStatus.forEach(r => { sc[r.status] = (sc[r.status] || 0) + 1; });
        console.log('  ステータス別:');
        for (const [s, c] of Object.entries(sc).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${s}: ${c.toLocaleString()} 件`);
        }
    }

    // ===== 6. ML学習に十分か？ =====
    console.log('\n━━━━━ 6. ML学習準備度 評価 ━━━━━');
    const total = mlTotal ?? 0;
    const statusBreakdown = statusData ? (() => {
        const sc: Record<string, number> = {};
        statusData.forEach(r => { sc[r.train_status] = (sc[r.train_status] || 0) + 1; });
        return sc;
    })() : {};
    
    const suspendedCount = statusBreakdown['suspended'] ?? 0;
    const delayedCount = statusBreakdown['delayed'] ?? 0;
    const abnormalCount = suspendedCount + delayedCount;

    console.log(`\n  📈 データ量: ${total.toLocaleString()} 件`);
    if (total >= 50000) console.log('     ✅ 十分 (5万件以上)');
    else if (total >= 10000) console.log('     ⚠️ 最低限 (1〜5万件) — もう少し蓄積が望ましい');
    else console.log('     ❌ 不足 (1万件未満) — 学習には大幅に不足');

    console.log(`\n  🚨 異常データ（suspended+delayed）: ${abnormalCount.toLocaleString()} 件`);
    if (abnormalCount >= 500) console.log('     ✅ モデル学習に十分');
    else if (abnormalCount >= 100) console.log('     ⚠️ 最低限 — 冬季データが貯まれば改善');
    else console.log('     ❌ 大幅不足 — 冬季シーズンのデータ蓄積が必要');

    const abnormalRatio = total > 0 ? (abnormalCount / total * 100) : 0;
    console.log(`\n  ⚖️ 正常/異常比率: normal ${(100-abnormalRatio).toFixed(1)}% / abnormal ${abnormalRatio.toFixed(1)}%`);
    if (abnormalRatio >= 5 && abnormalRatio <= 30) console.log('     ✅ 良好なバランス');
    else if (abnormalRatio < 5) console.log('     ⚠️ 異常データが少ない — 冬季のデータ蓄積で改善見込み');
    else console.log('     ⚠️ 異常データの比率が高い');

    console.log('\n' + '='.repeat(60));
    console.log('チェック完了');
    console.log('='.repeat(60));
}

main().catch(console.error);
