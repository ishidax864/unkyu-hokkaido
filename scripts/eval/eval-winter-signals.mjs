// 真冬の札幌圏(2025-12-11〜2026-02-19)で、気象庁の警報・注意報と降雪の実測が運休日を見分けられるかを確認する。
// Usage: node scripts/eval/eval-winter-signals.mjs
import { readFileSync } from 'node:fs';
const J = p => JSON.parse(readFileSync(p, 'utf8'));
const obs = J('data/historical/jma-backfill/observations-daily.json').days.filter(d => d.station === '札幌');
const warn = J('data/historical/jma-backfill/warnings.json').entries.filter(e => e.area === '札幌市');
const research = J('data/historical/research/winter-2025-26-disruptions.json').events;
const SAP = /函館線|千歳線|学園都市線|快速エアポート|札幌圏/;
const events = new Set(research.filter(e => SAP.test(e.lines.join(' ') + e.section)).map(e => e.date));
const ONSET = new Set(['2026-01-25', '2026-02-02', '2026-02-06', '2026-02-19']);
const byDate = Object.fromEntries(obs.map(d => [d.date, d]));
const add = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const active = (types, from, to) => warn.some(e => types.includes(e.type) && Date.parse(e.issuedAt) < to && Date.parse(e.clearedAt ?? '2100-01-01') > from);
const jst = (d, h) => Date.parse(`${d}T${String(h).padStart(2, '0')}:00:00+09:00`);
const WARN = ['大雪警報', '暴風雪警報', '暴風警報'], ADV = ['大雪注意報', '風雪注意報'];
const rows = [];
for (let d = '2025-12-11'; d <= '2026-02-19'; d = add(d, 1)) {
    const o = byDate[d], p1 = byDate[add(d, -1)], p2 = byDate[add(d, -2)];
    rows.push({ d, event: events.has(d), onset: ONSET.has(d),
        snow: o?.snowfallCm ?? 0, snowPrev: p1?.snowfallCm ?? 0, snow3: (o?.snowfallCm ?? 0) + (p1?.snowfallCm ?? 0) + (p2?.snowfallCm ?? 0),
        snow2prev: (p1?.snowfallCm ?? 0) + (p2?.snowfallCm ?? 0), depth: o?.maxSnowDepthCm ?? 0, depthPrev: p1?.maxSnowDepthCm ?? 0, gust: o?.maxGustMs ?? 0,
        warnByMorning: active(WARN, jst(add(d, -1), 12), jst(d, 6)),   // 前日昼〜当日6時に警報が出ていた
        advByMorning: active(ADV, jst(add(d, -1), 12), jst(d, 6)),
        warnPrevEvening: active(WARN, jst(add(d, -1), 12), jst(add(d, -1), 21)), // 前日21時までに警報
        advPrevEvening: active(ADV, jst(add(d, -1), 12), jst(add(d, -1), 21)),
        warnDay: active(WARN, jst(d, 0), jst(d, 24)), advDay: active(ADV, jst(d, 0), jst(d, 24)) });
}
const pos = rows.filter(r => r.event), on = rows.filter(r => r.onset), neg = rows.filter(r => !r.event);
const auc = (P, N, k) => { let s = 0; for (const p of P) for (const n of N) s += p[k] > n[k] ? 1 : p[k] === n[k] ? .5 : 0; return (s / (P.length * N.length)).toFixed(2); };
console.log(`札幌圏 ${rows.length}日: 運休日 ${pos.length}(当日 ${on.length}) 記事なし ${neg.length}`);
console.log('--- 数値の指標 (AUC: 全運休日 / 嵐の当日)');
for (const [k, label] of [['snow', '当日の降雪(実測)'], ['snowPrev', '前日の降雪(実測)'], ['snow2prev', '前2日の降雪(実測)'], ['snow3', '当日含む3日の降雪'], ['depth', '積雪深(当日の最大。嵐の雪を含む)'], ['depthPrev', '前日の積雪深'], ['gust', '最大瞬間風速']])
    console.log(label.padEnd(14), auc(pos, neg, k), '/', auc(on, neg, k));
console.log('--- 警報・注意報 (該当日数: 全運休日 / 嵐の当日 / 記事なしの日)');
for (const [k, label] of [['warnPrevEvening', '前日21時までに警報'], ['warnByMorning', '当日6時までに警報'], ['warnDay', '当日中に警報'], ['advPrevEvening', '前日21時までに大雪・風雪注意報'], ['advByMorning', '当日6時までに注意報'], ['advDay', '当日中に注意報']])
    console.log(label.padEnd(18), `${pos.filter(r => r[k]).length}/${pos.length}`, `${on.filter(r => r[k]).length}/${on.length}`, `${neg.filter(r => r[k]).length}/${neg.length} (${Math.round(neg.filter(r => r[k]).length / neg.length * 100)}%)`);
console.log('--- しきい値 (実測): 運休日 / 当日 / 記事なし');
for (const [k, t] of [['snow', 15], ['snow', 20], ['snow', 30], ['snow3', 30], ['snow3', 40], ['snow3', 50], ['snow2prev', 20], ['snow2prev', 30]])
    console.log(`${k}>=${t}`.padEnd(14), `${pos.filter(r => r[k] >= t).length}/${pos.length}`, `${on.filter(r => r[k] >= t).length}/${on.length}`, `${neg.filter(r => r[k] >= t).length}/${neg.length}`);
console.log('--- 運休日'); for (const r of pos) console.log(r.d, r.onset ? '当日' : '後日', `雪${r.snow} 前日${r.snowPrev} 3日${r.snow3} 深${r.depth} 突風${r.gust}`, r.warnPrevEvening ? '前夜警報' : '', r.warnByMorning ? '朝警報' : '', r.warnDay ? '当日警報' : '', r.advPrevEvening ? '前夜注意報' : '');
console.log('--- 記事なしで雪20cm以上 or 警報:', neg.filter(r => r.snow >= 20 || r.warnDay).map(r => `${r.d.slice(5)}(雪${r.snow}${r.warnDay ? '警' : ''})`).join(' '));
console.log('--- 組み合わせ。積雪深は前日の値(前日時点で分かる情報だけ) (運休日 / 当日 / 記事なし)');
for (const T of [50, 60, 70, 85]) {
    const combos = { [`前日の積雪${T}cm以上`]: r => r.depthPrev >= T, [`前日の積雪${T}cm以上 かつ 前夜に注意報`]: r => r.depthPrev >= T && r.advPrevEvening };
    for (const [label, f] of Object.entries(combos)) console.log(label.padEnd(26), `${pos.filter(f).length}/${pos.length}`, `${on.filter(f).length}/${on.length}`, `${neg.filter(f).length}/${neg.length} (${Math.round(neg.filter(f).length / neg.length * 100)}%)`);
}
console.log('嵐の当日の前日積雪:', on.map(r => `${r.d.slice(5)}=${r.depthPrev}cm`).join(' '), '| 前夜注意報のみ:', `${on.filter(r => r.advPrevEvening).length}/${on.length}`, `${neg.filter(r => r.advPrevEvening).length}/${neg.length}`);
