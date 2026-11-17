// 「前日の積雪 T cm 以上 かつ 前夜(前日12〜21時)に大雪・風雪の注意報か警報」を、札幌圏の5冬で確かめる。
// 区切り(60cm)は2025-26年の冬だけで決めたので、ほかの4冬は「決めたあとに初めて当てるデータ」になる。
// 運休日は報道ベース。2023-25年の2冬は記事がほとんど見つからず、運休のない日の割合は当てにならない。
// Usage: node scripts/eval/eval-snow-load-5winters.mjs
import { readFileSync } from 'node:fs';
const J = p => JSON.parse(readFileSync(p, 'utf8'));
const B = 'data/historical/jma-backfill/', R = 'data/historical/research/';
const obs = [...J(B + 'observations-daily.json').days, ...J(B + 'observations-daily-2021-25.json').days].filter(d => d.station === '札幌');
const warn = [...J(B + 'warnings.json').entries, ...J(B + 'warnings-2021-25.json').entries].filter(e => e.area === '札幌市');
const SAP = /函館線|千歳線|学園都市線|快速エアポート|札幌圏/;
const files = ['winter-2021-23-disruptions.json', 'winter-2023-25-disruptions.json', 'winter-2025-26-disruptions.json'].map(f => J(R + f));
const events = new Set(files.flatMap(f => f.events.filter(e => e.sapporoArea ?? SAP.test(e.lines.join(' ') + e.section)).map(e => e.date)));
const onsets = new Set([...files.flatMap(f => f.onsetDates ?? []), '2026-01-25', '2026-02-02', '2026-02-06', '2026-02-19']);
const byDate = Object.fromEntries(obs.map(d => [d.date, d]));
const add = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const jst = (d, h) => Date.parse(`${d}T${String(h).padStart(2, '0')}:00:00+09:00`);
const active = (types, from, to) => warn.some(e => types.includes(e.type) && Date.parse(e.issuedAt) < to && Date.parse(e.clearedAt ?? '2100-01-01') > from);
const ALERT = ['大雪注意報', '風雪注意報', '大雪警報', '暴風雪警報'];
const WINTERS = [['2021-22', '2021-12-01', '2022-03-31'], ['2022-23', '2022-12-01', '2023-03-31'], ['2023-24', '2023-12-01', '2024-03-31'], ['2024-25', '2024-12-01', '2025-03-31'], ['2025-26', '2025-12-11', '2026-02-19']];
const rows = [];
for (const [w, from, to] of WINTERS) for (let d = from; d <= to; d = add(d, 1)) {
    const p = byDate[add(d, -1)];
    rows.push({ w, d, event: events.has(d), onset: onsets.has(d), depthPrev: p?.maxSnowDepthCm ?? 0, snow: byDate[d]?.snowfallCm ?? 0,
        alert: active(ALERT, jst(add(d, -1), 12), jst(add(d, -1), 21)), warnMorning: active(['大雪警報', '暴風雪警報'], jst(add(d, -1), 12), jst(d, 6)) });
}
const fmt = (list, f) => `${list.filter(f).length}/${list.length}`;
const table = (T) => {
    const rule = r => r.depthPrev >= T && r.alert;
    console.log(`\n=== 前日の積雪 ${T}cm以上 かつ 前夜に注意報・警報`);
    console.log('冬       嵐の当日  運休日全体  それ以外の日        (参考)注意報だけ  積雪だけ');
    for (const [w] of WINTERS) {
        const L = rows.filter(r => r.w === w), on = L.filter(r => r.onset), ev = L.filter(r => r.event), ne = L.filter(r => !r.event);
        console.log(w.padEnd(8), fmt(on, rule).padEnd(9), fmt(ev, rule).padEnd(11), `${fmt(ne, rule)} (${Math.round(ne.filter(rule).length / ne.length * 100)}%)`.padEnd(19), fmt(on, r => r.alert).padEnd(6), `${Math.round(ne.filter(r => r.alert).length / ne.length * 100)}%`.padEnd(8), fmt(on, r => r.depthPrev >= T));
    }
    const held = rows.filter(r => r.w !== '2025-26'), on = held.filter(r => r.onset), ne2 = held.filter(r => !r.event && ['2021-22', '2022-23'].includes(r.w));
    console.log(`決めたあとに当てた4冬の合計: 嵐の当日 ${fmt(on, rule)} / 2021-23年のそれ以外の日 ${fmt(ne2, rule)} (${Math.round(ne2.filter(rule).length / ne2.length * 100)}%)`);
};
for (const T of [40, 60, 80]) table(T);
console.log('\n--- 嵐の当日の内訳 (前日の積雪 / 前夜の注意報・警報 / 朝までに警報 / 当日の降雪)');
for (const r of rows.filter(r => r.onset)) console.log(r.d, `${String(r.depthPrev).padStart(3)}cm`, r.alert ? '注意報あり' : '注意報なし', r.warnMorning ? '警報' : '    ', `雪${r.snow}cm`, r.depthPrev >= 60 && r.alert ? '→ 該当' : '→ 見逃し');
