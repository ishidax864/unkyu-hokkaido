/**
 * score-engines.ts の出力から指標を計算する。
 * - AUC: 運休日を平常日より高く順位付けできるか (0.5=当てずっぽう, 1=完全)
 * - AP: 平均適合率 (陽性率が低いときの順位性能)
 * - 閾値別: 見逃し率(=1-検出率)、平常日に警告した割合、警告の的中率
 * Usage: npx tsx scripts/eval/metrics.ts <scores.json> [out.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';

type Row = Record<string, number | string | boolean | null>;

export function auc(pos: number[], neg: number[]): number {
    if (!pos.length || !neg.length) return NaN;
    let s = 0;
    for (const p of pos) for (const n of neg) s += p > n ? 1 : p === n ? 0.5 : 0;
    return s / (pos.length * neg.length);
}

export function averagePrecision(scores: Array<{ s: number; y: boolean }>): number {
    const sorted = [...scores].sort((a, b) => b.s - a.s);
    const totalPos = sorted.filter(x => x.y).length;
    if (!totalPos) return NaN;
    let tp = 0, ap = 0, i = 0;
    while (i < sorted.length) {
        let j = i, tpGroup = 0;
        while (j < sorted.length && sorted[j].s === sorted[i].s) { if (sorted[j].y) tpGroup++; j++; }
        tp += tpGroup;
        ap += (tpGroup / totalPos) * (tp / j);
        i = j;
    }
    return ap;
}

/** Wilson 95% 区間 */
export function wilson(k: number, n: number): [number, number] {
    if (!n) return [NaN, NaN];
    const z = 1.96, p = k / n, d = 1 + z * z / n;
    const c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [(c - m) / d, (c + m) / d];
}

function evaluate(rows: Row[], key: string, thresholds: number[]) {
    const valid = rows.filter(r => typeof r[key] === 'number');
    const pos = valid.filter(r => r.label === 'weather').map(r => r[key] as number);
    const neg = valid.filter(r => r.label === 'none').map(r => r[key] as number);
    return {
        n: valid.length, positives: pos.length, negatives: neg.length, missing: rows.length - valid.length,
        auc: auc(pos, neg),
        ap: averagePrecision(valid.map(r => ({ s: r[key] as number, y: r.label === 'weather' }))),
        baseRate: pos.length / (pos.length + neg.length),
        at: thresholds.map(t => {
            const tp = pos.filter(s => s >= t).length, fp = neg.filter(s => s >= t).length;
            return {
                threshold: t, caught: tp, missed: pos.length - tp, recall: tp / pos.length, recallCI: wilson(tp, pos.length),
                falseAlarms: fp, falseAlarmRate: fp / neg.length, precision: tp + fp ? tp / (tp + fp) : NaN,
            };
        }),
    };
}

const SCORERS: Record<string, number[]> = {
    engineA: [25, 65],            // 25%以上=「遅延」表示, 65%以上=「運転見合わせ」表示
    engineA_depthFixed: [25, 65],
    engineB: [25, 50, 75],        // watch / high / severe
    maxGust: [15, 20, 25],
    maxSnowHour: [1, 2, 3],
    maxRainHour: [10, 20],
};

function main() {
    const [inPath, outPath] = process.argv.slice(2);
    const rows = JSON.parse(readFileSync(inPath, 'utf8')) as Row[];
    const subsets: Record<string, Row[]> = {
        all: rows,
        winter: rows.filter(r => r.winter),
        nonWinter: rows.filter(r => !r.winter),
        winterDay1Only: rows.filter(r => r.winter && r.lead === 'day1'),
    };
    const result: Record<string, Record<string, ReturnType<typeof evaluate>>> = {};
    for (const [name, subset] of Object.entries(subsets)) {
        result[name] = {};
        for (const [key, th] of Object.entries(SCORERS)) result[name][key] = evaluate(subset, key, th);
    }
    if (outPath) writeFileSync(outPath, JSON.stringify(result, null, 1));
    const f = (x: number) => Number.isFinite(x) ? x.toFixed(2) : ' - ';
    for (const [name, byKey] of Object.entries(result)) {
        const any = Object.values(byKey)[0];
        console.log(`\n=== ${name}: 陽性 ${any.positives} / 陰性 ${any.negatives}`);
        for (const [key, e] of Object.entries(byKey)) {
            console.log(`${key.padEnd(20)} AUC ${f(e.auc)}  AP ${f(e.ap)}  ` + e.at.map(a =>
                `[≥${a.threshold}: 検出 ${a.caught}/${e.positives} 誤警報 ${a.falseAlarms} (${f(a.falseAlarmRate)})]`).join(' '));
        }
    }
}

if (process.argv[1]?.endsWith('metrics.ts')) main();
