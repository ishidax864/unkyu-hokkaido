/**
 * ファクトチェック — 前回の分析で見落としがないか徹底検証
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
    console.log('🔬 ファクトチェック: 全数値の厳密検証');
    console.log('='.repeat(60));

    // ===== FACT 1: ml_training_data の正確なカウント =====
    console.log('\n【FACT 1】ml_training_data ステータス別（count: exact で検証）');
    const statuses = ['normal', 'delayed', 'suspended'];
    let totalCheck = 0;
    for (const s of statuses) {
        const { count } = await supabase.from('ml_training_data')
            .select('*', { count: 'exact', head: true }).eq('train_status', s);
        console.log(`  ${s}: ${(count ?? 0).toLocaleString()}`);
        totalCheck += count ?? 0;
    }
    const { count: totalAll } = await supabase.from('ml_training_data')
        .select('*', { count: 'exact', head: true });
    console.log(`  合計（status別）: ${totalCheck.toLocaleString()}`);
    console.log(`  合計（全件count）: ${(totalAll ?? 0).toLocaleString()}`);
    console.log(`  一致確認: ${totalCheck === (totalAll ?? 0) ? '✅ 一致' : '❌ 不一致！'}`);

    // ===== FACT 2: crawler_logs の正確な月別カウント =====
    console.log('\n【FACT 2】crawler_logs 月別（count: exact で検証）');
    const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
    let clTotal = 0;
    for (const m of months) {
        const [y, mon] = m.split('-').map(Number);
        const start = new Date(y, mon - 1, 1).toISOString();
        const end = new Date(y, mon, 1).toISOString();
        const { count } = await supabase.from('crawler_logs')
            .select('*', { count: 'exact', head: true })
            .gte('fetched_at', start).lt('fetched_at', end);
        console.log(`  ${m}: ${(count ?? 0).toLocaleString()}`);
        clTotal += count ?? 0;
    }
    const { count: clAllCount } = await supabase.from('crawler_logs')
        .select('*', { count: 'exact', head: true });
    console.log(`  月別合計: ${clTotal.toLocaleString()} / 全件: ${(clAllCount ?? 0).toLocaleString()}`);

    // ===== FACT 3: GitHub Actionsは本当に15分毎に稼働？直近24hの実績 =====
    console.log('\n【FACT 3】直近24時間のクローラー実行回数');
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: last24h } = await supabase.from('crawler_logs')
        .select('*', { count: 'exact', head: true })
        .gte('fetched_at', since24h);
    console.log(`  直近24h: ${(last24h ?? 0)} 件`);
    console.log(`  1回あたり5エリアなので、実行回数: ${Math.round((last24h ?? 0) / 5)} 回`);
    console.log(`  期待値（15分毎×24h）: 96 回 × 5 = 480 件`);

    // 直近の実際の間隔を確認
    const { data: recentLogs } = await supabase.from('crawler_logs')
        .select('fetched_at, area_id')
        .gte('fetched_at', since24h)
        .eq('area_id', '01')  // 1つのエリアだけで間隔を測定
        .order('fetched_at', { ascending: true });
    
    if (recentLogs && recentLogs.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < recentLogs.length; i++) {
            const diff = new Date(recentLogs[i].fetched_at).getTime() - new Date(recentLogs[i-1].fetched_at).getTime();
            intervals.push(diff / (1000 * 60));
        }
        console.log(`  実際の間隔（エリア01のみ,直近24h）:`);
        console.log(`    平均: ${(intervals.reduce((a,b) => a+b, 0) / intervals.length).toFixed(0)} 分`);
        console.log(`    最小: ${Math.min(...intervals).toFixed(0)} 分`);
        console.log(`    最大: ${Math.max(...intervals).toFixed(0)} 分`);
        console.log(`    実行回数: ${recentLogs.length} 回`);

        // タイムスタンプ一覧
        console.log(`  直近のタイムスタンプ（エリア01）:`);
        for (const log of recentLogs.slice(-10)) {
            const t = new Date(log.fetched_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            console.log(`    ${t}`);
        }
    } else {
        console.log(`  ❌ 直近24hのエリア01のデータが${recentLogs?.length ?? 0}件しかない！`);
    }

    // ===== FACT 4: 直近7日間の日別クローラー実行 =====
    console.log('\n【FACT 4】直近7日間の日別クローラー実行回数');
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
        const { count } = await supabase.from('crawler_logs')
            .select('*', { count: 'exact', head: true })
            .gte('fetched_at', dayStart).lt('fetched_at', dayEnd);
        const runs = Math.round((count ?? 0) / 5);
        const dayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const bar = '█'.repeat(Math.min(runs, 50));
        console.log(`  ${dayStr}: ${(count ?? 0).toString().padStart(4)} 件 (${runs}回) ${bar}`);
    }

    // ===== FACT 5: ml_training_data の直近7日の蓄積 =====
    console.log('\n【FACT 5】直近7日間の日別ML学習データ蓄積');
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
        const { count: dayTotal } = await supabase.from('ml_training_data')
            .select('*', { count: 'exact', head: true })
            .gte('recorded_at', dayStart).lt('recorded_at', dayEnd);
        const { count: daySusp } = await supabase.from('ml_training_data')
            .select('*', { count: 'exact', head: true })
            .gte('recorded_at', dayStart).lt('recorded_at', dayEnd)
            .eq('train_status', 'suspended');
        const { count: dayDelay } = await supabase.from('ml_training_data')
            .select('*', { count: 'exact', head: true })
            .gte('recorded_at', dayStart).lt('recorded_at', dayEnd)
            .eq('train_status', 'delayed');
        const dayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        console.log(`  ${dayStr}: total=${(dayTotal??0).toString().padStart(4)} (susp=${daySusp??0}, delay=${dayDelay??0})`);
    }

    // ===== FACT 6: route_status_history の最終エントリ検証 =====
    console.log('\n【FACT 6】route_status_history の直近エントリ');
    const { data: rshRecent } = await supabase.from('route_status_history')
        .select('date, time, route_id, status, cause, details')
        .order('date', { ascending: false })
        .order('time', { ascending: false })
        .limit(5);
    if (rshRecent) {
        for (const r of rshRecent) {
            console.log(`  ${r.date} ${r.time} | ${r.route_id} | ${r.status} | ${r.cause}`);
            if (r.details) console.log(`    → ${(r.details as string).substring(0, 100)}`);
        }
    }

    // ===== FACT 7: 来季までの蓄積予測の根拠 =====
    console.log('\n【FACT 7】蓄積ペースの検証（来季予測の根拠）');
    // 直近30日の平均日次蓄積
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: last30d } = await supabase.from('ml_training_data')
        .select('*', { count: 'exact', head: true })
        .gte('recorded_at', since30d);
    const dailyAvg = (last30d ?? 0) / 30;
    console.log(`  直近30日のML蓄積: ${(last30d ?? 0).toLocaleString()} 件`);
    console.log(`  日平均: ${dailyAvg.toFixed(0)} 件/日`);
    console.log(`  このペースで11月まで（210日後）: +${Math.round(dailyAvg * 210).toLocaleString()} 件`);
    console.log(`  11月時点の予想総数: ${Math.round((totalAll ?? 0) + dailyAvg * 210).toLocaleString()} 件`);

    console.log('\n' + '='.repeat(60));
    console.log('ファクトチェック完了');
    console.log('='.repeat(60));
}

main().catch(console.error);
