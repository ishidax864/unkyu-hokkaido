/**
 * 中核モデル (lib/forecast/core.ts) の係数を当てはめ、嵐(週)ごとに分けた交差検証で評価する。
 *
 * - 学習: 路線×日の「特徴の1日最大値」でロジスティック回帰 (L2, 重みは0以上に制約)。
 * - 評価: 本番と同じく「各時刻・各地点の確率の最大値」をその日のスコアにする。
 * - 分割: 同じ嵐の日が学習と評価にまたがらないよう、ISO週単位で1週ずつ外す。
 * - 比較: 同じ行で既存エンジンA/Bと単純な目安も採点する。
 *
 * Usage: npx tsx scripts/eval/fit-core.ts <scores.json> <coefficients.json> <report.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { FEATURE_NAMES } from '../../lib/forecast/core';
import { auc, averagePrecision, wilson } from './metrics';

interface Row { routeId: string; date: string; label: 'weather' | 'none'; winter: boolean; lead: string; coreVectors: number[][]; [k: string]: unknown }
interface Model { bias: number; w: number[] }

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const dot = (m: Model, x: number[]) => x.reduce((s, xi, j) => s + m.w[j] * xi, m.bias);
/** 本番と同じ: 時刻・地点ごとの確率の最大値 */
const dayScore = (m: Model, r: Row) => sigmoid(Math.max(...r.coreVectors.map(v => dot(m, v))));

/** 学習。bags[i] は1日分の(時刻×地点)ベクトル。mode='max' は本番と同じ「最悪の時刻」で学習する。 */
export function fit(bags: number[][][], y: number[], lambda: number, iters = 3000, mode: 'max' | 'dailyMax' = 'max', allowed: boolean[] = FEATURE_NAMES.map(() => true)): Model {
    const d = bags[0][0].length;
    const dailyMaxes = mode === 'dailyMax' ? bags.map(bag => bag[0].map((_, j) => Math.max(...bag.map(v => v[j])))) : [];
    const pick = (m: Model, bag: number[][], i: number) => {
        if (mode === 'dailyMax') return dailyMaxes[i];
        let best = bag[0], bestZ = dot(m, best);
        for (let k = 1; k < bag.length; k++) { const z = dot(m, bag[k]); if (z > bestZ) { bestZ = z; best = bag[k]; } }
        return best;
    };
    const m: Model = { bias: Math.log((y.filter(v => v).length + 0.5) / (y.length + 1)), w: allowed.map(a => a ? 0.01 : 0) };
    // Adam + 射影 (重み >= 0)
    const mW = new Array(d + 1).fill(0), vW = new Array(d + 1).fill(0);
    const lr = 0.05, b1 = 0.9, b2 = 0.999, eps = 1e-8;
    for (let t = 1; t <= iters; t++) {
        const g = new Array(d + 1).fill(0);
        for (let i = 0; i < bags.length; i++) {
            const x = pick(m, bags[i], i);
            const err = sigmoid(dot(m, x)) - y[i];
            g[d] += err;
            for (let j = 0; j < d; j++) g[j] += err * x[j];
        }
        for (let j = 0; j <= d; j++) {
            g[j] /= bags.length;
            if (j < d) g[j] += lambda * m.w[j];
            mW[j] = b1 * mW[j] + (1 - b1) * g[j];
            vW[j] = b2 * vW[j] + (1 - b2) * g[j] * g[j];
            const step = lr * (mW[j] / (1 - b1 ** t)) / (Math.sqrt(vW[j] / (1 - b2 ** t)) + eps);
            if (j < d) m.w[j] = allowed[j] ? Math.max(0, m.w[j] - step) : 0;
            else m.bias -= step;
        }
    }
    return m;
}

function isoWeek(date: string) {
    const d = new Date(date + 'T00:00:00Z');
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const FOLDS = 10;

function crossValidate(rows: Row[], lambda: number, mode: 'max' | 'dailyMax', allowed: boolean[]) {
    // 週を10分割に割り当てる(同じ週=同じ嵐は必ず同じ側)
    const weeks = [...new Set(rows.map(r => isoWeek(r.date)))].sort();
    const foldOf = new Map(weeks.map((w, i) => [w, i % FOLDS]));
    const oof = new Map<Row, number>();
    for (let g = 0; g < FOLDS; g++) {
        const train = rows.filter(r => foldOf.get(isoWeek(r.date)) !== g);
        const test = rows.filter(r => foldOf.get(isoWeek(r.date)) === g);
        if (!train.some(r => r.label === 'weather')) continue;
        const m = fit(train.map(r => r.coreVectors), train.map(r => +(r.label === 'weather')), lambda, 600, mode, allowed);
        for (const r of test) oof.set(r, dayScore(m, r));
    }
    return oof;
}

function summarize(rows: Row[], score: (r: Row) => number | null, falseAlarmTargets = [0.15, 0.04, 0.01]) {
    const valid = rows.filter(r => typeof score(r) === 'number');
    const pos = valid.filter(r => r.label === 'weather').map(r => score(r)!);
    const neg = valid.filter(r => r.label === 'none').map(r => score(r)!).sort((a, b) => a - b);
    return {
        positives: pos.length, negatives: neg.length,
        auc: auc(pos, neg), ap: averagePrecision(valid.map(r => ({ s: score(r)!, y: r.label === 'weather' }))),
        // 平常日の誤警報率を揃えたときの検出数 (方式間で公平に比べるため)
        atFalseAlarm: falseAlarmTargets.map(fa => {
            const th = neg[Math.min(neg.length - 1, Math.floor((1 - fa) * neg.length))];
            const caught = pos.filter(s => s > th).length;
            return { falseAlarmTarget: fa, caught, recall: caught / pos.length, recallCI: wilson(caught, pos.length) };
        }),
    };
}

function main() {
    const [inPath, coefPath, reportPath] = process.argv.slice(2);
    const rows = (JSON.parse(readFileSync(inPath, 'utf8')) as Row[]).filter(r => (r.label === 'weather' || r.label === 'none') && r.coreVectors.length);
    console.log(`rows ${rows.length}, positives ${rows.filter(r => r.label === 'weather').length}`);

    // 特徴の組み合わせも候補にする(陽性が少ないため、少ない特徴のほうが安定する可能性)
    const SETS: Record<string, string[]> = {
        precipOnly: ['precip1'],
        precipSnow24: ['precip1', 'snow24'],
        precipSnow24Rain24: ['precip1', 'snow24', 'rain24'],
        precipSnowBoth: ['precip1', 'snow1', 'snow24', 'rain24'],
        all: [...FEATURE_NAMES],
    };
    const configs = Object.entries(SETS).map(([name, feats]) => ({
        l: 0.001, mode: 'max' as const, key: name, allowed: FEATURE_NAMES.map(n => feats.includes(n)),
    }));
    const cv: Record<string, Map<Row, number>> = {};
    for (const c of configs) {
        cv[c.key] = crossValidate(rows, c.l, c.mode, c.allowed);
        const s = summarize(rows, r => cv[c.key].get(r) ?? null);
        const w = summarize(rows.filter(r => r.winter), r => cv[c.key].get(r) ?? null);
        const nw = summarize(rows.filter(r => !r.winter), r => cv[c.key].get(r) ?? null);
        console.log(`${c.key.padEnd(20)} CV AUC ${s.auc.toFixed(3)} AP ${s.ap.toFixed(3)} | winter ${w.auc.toFixed(3)} | nonWinter ${nw.auc.toFixed(3)} | 誤警報15%/4%/1%で検出 ${s.atFalseAlarm.map(a => a.caught).join('/')}`);
    }
    // 設定の選択もCV結果を見て行うため、報告値はわずかに楽観的
    const bestCfg = configs.reduce((a, b) => summarize(rows, r => cv[b.key].get(r) ?? null).auc > summarize(rows, r => cv[a.key].get(r) ?? null).auc ? b : a);
    const best = bestCfg.l;

    const subsets: Record<string, Row[]> = { all: rows, winter: rows.filter(r => r.winter), nonWinter: rows.filter(r => !r.winter) };
    const scorers: Record<string, (r: Row) => number | null> = {
        newCore_cv: r => cv[bestCfg.key].get(r) ?? null,
        engineA: r => r.engineA as number,
        engineB: r => (r.engineB as number | null),
        maxSnowHour: r => r.maxSnowHour as number,
        maxGust: r => r.maxGust as number,
        maxRainHour: r => r.maxRainHour as number,
    };
    const report: Record<string, Record<string, ReturnType<typeof summarize>>> = {};
    for (const [name, subset] of Object.entries(subsets)) {
        report[name] = {};
        console.log(`\n=== ${name}`);
        for (const [k, f] of Object.entries(scorers)) {
            const s = summarize(subset, f);
            report[name][k] = s;
            console.log(`${k.padEnd(14)} AUC ${s.auc.toFixed(2)} AP ${s.ap.toFixed(2)}  ` +
                s.atFalseAlarm.map(a => `誤警報${Math.round(a.falseAlarmTarget * 100)}%で検出 ${a.caught}/${s.positives}`).join('  '));
        }
    }

    // 全データで最終当てはめ。レベルの閾値は平常日の誤警報率 15% / 4% / 1% に合わせる
    const final = fit(rows.map(r => r.coreVectors), rows.map(r => +(r.label === 'weather')), best, 1500, bestCfg.mode, bestCfg.allowed);
    const negScores = rows.filter(r => r.label === 'none').map(r => dayScore(final, r)).sort((a, b) => a - b);
    const q = (p: number) => negScores[Math.min(negScores.length - 1, Math.floor(p * negScores.length))];
    const round = (x: number, n = 4) => Math.round(x * 10 ** n) / 10 ** n;
    const coefficients = {
        version: 'risk-core-1.0',
        fittedAt: new Date().toISOString(),
        note: 'Generated by scripts/eval/fit-core.ts. Do not edit by hand.',
        training: {
            rows: rows.length, positives: rows.filter(r => r.label === 'weather').length,
            period: [rows.map(r => r.date).sort()[0], rows.map(r => r.date).sort().at(-1)],
            lambda: best, objective: bestCfg.mode, featureSet: bestCfg.key, cv: `${FOLDS}-fold by ISO week`,
        },
        bias: round(final.bias),
        weights: Object.fromEntries(FEATURE_NAMES.map((n, j) => [n, round(final.w[j])])),
        thresholds: { watch: round(Math.max(q(0.85), 0.01)), high: round(q(0.96)), severe: round(q(0.99)) },
    };
    writeFileSync(coefPath, JSON.stringify(coefficients, null, 1) + '\n');
    writeFileSync(reportPath, JSON.stringify({ config: { key: bestCfg.key, lambda: bestCfg.l, mode: bestCfg.mode }, report }, null, 1));
    console.log('\nfinal', JSON.stringify({ bias: coefficients.bias, weights: coefficients.weights, thresholds: coefficients.thresholds }));
}

if (process.argv[1]?.endsWith('fit-core.ts')) main();
