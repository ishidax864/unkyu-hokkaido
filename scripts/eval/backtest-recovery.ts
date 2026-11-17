/**
 * 復旧の見通しの検証。各事例を1件ずつ外し、残りの事例から出した見通しが、外した事例に当たったかを見る。
 * 発生直後(経過0分)と、発生から60分たった時点の両方で確認する。
 * Usage: npx tsx scripts/eval/backtest-recovery.ts
 */
import { outlookFor, CAUSE_LABELS, type CauseKind, type RecoveryDataset, type DurationSet } from '../../lib/engine/episodes';
import stats from '../../data/recovery-stats.json';

const data = stats as unknown as RecoveryDataset;
const without = (set: DurationSet, minutes: number): DurationSet => { const i = set.resumed.indexOf(minutes); return { resumed: set.resumed.filter((_, j) => j !== i), censored: set.censored }; };

function run(elapsed: number) {
    const rows: { cause: CauseKind; pool: string; actual: number; median: number | null; p25: number | null; p75: number | null }[] = [];
    let noOutlook = 0;
    for (const [cause, set] of Object.entries(data.byCause) as [CauseKind, DurationSet][]) for (const m of set!.resumed) {
        if (m <= elapsed) continue;
        const loo: RecoveryDataset = { all: without(data.all, m), byCause: { ...data.byCause, [cause]: without(set!, m) } };
        const o = outlookFor(loo, cause, elapsed);
        if (!o || o.median == null) { noOutlook++; continue; }
        rows.push({ cause, pool: o.pool, actual: m - elapsed, median: o.median, p25: o.p25, p75: o.p75 });
    }
    const med = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const summarize = (list: typeof rows) => ({
        n: list.length,
        within75: Math.round(list.filter(r => r.p75 != null && r.actual <= r.p75).length / list.length * 100),
        inBand: Math.round(list.filter(r => r.p25 != null && r.p75 != null && r.actual >= r.p25 && r.actual <= r.p75).length / list.length * 100),
        beforeMedian: Math.round(list.filter(r => r.actual <= r.median!).length / list.length * 100),
        medianAbsError: med(list.map(r => Math.abs(r.actual - r.median!))),
        // 「暖かい場所で待つ(中央値120分以内)」と言ったのに実際は3時間超だった割合
        longWaitMiss: Math.round(list.filter(r => r.median! <= 120 && r.actual > 180).length / Math.max(1, list.filter(r => r.median! <= 120).length) * 100),
    });
    console.log(`\n=== 発生から${elapsed}分の時点 (見通しを出せなかった事例 ${noOutlook})`);
    const all = summarize(rows);
    console.log(`全体 n=${all.n}: 中央値までに解消 ${all.beforeMedian}% (理想50) / 4分の3の目安までに解消 ${all.within75}% (理想75) / 幅の中 ${all.inBand}% (理想50) / 中央値の誤差 ${all.medianAbsError}分 / 「2時間以内」と見て3時間超 ${all.longWaitMiss}%`);
    for (const cause of [...new Set(rows.map(r => r.cause))]) {
        const s = summarize(rows.filter(r => r.cause === cause));
        if (s.n >= 5) console.log(`  ${CAUSE_LABELS[cause].padEnd(20)} n=${String(s.n).padStart(3)} 中央値まで ${s.beforeMedian}% / 4分の3まで ${s.within75}% / 誤差 ${s.medianAbsError}分 (${rows.find(r => r.cause === cause)!.pool === 'cause' ? '原因別' : '全体の実績'})`);
    }
}
run(0); run(60);
