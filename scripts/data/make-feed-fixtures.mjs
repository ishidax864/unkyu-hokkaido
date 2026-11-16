// 保存済みの生フィード(crawler_logs)から、テスト用の代表的な実例を選んで tests/fixtures/jr-feed/ に保存する。
// Usage: node scripts/data/make-feed-fixtures.mjs <crawler_logs.ndjson>
import { readFileSync, writeFileSync } from 'node:fs';
const rows = readFileSync(process.argv[2], 'utf8').trim().split('\n').map(l => JSON.parse(l));
const stamp = r => { const m = (r.raw_json?.time || '').match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})時(\d{1,2})分/); return m ? Date.parse(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}T${m[4].padStart(2,'0')}:${m[5].padStart(2,'0')}:00+09:00`) : NaN; };
const jst = iso => new Date(Date.parse(iso) + 9 * 36e5).toISOString();
const text = (b) => (b?.gaikyo || []).map(g => (g.title || '') + (g.honbun || '')).join(' ');
const pick = {
  normal: rows.findLast(r => r.area_id === '01' && Object.values(r.raw_json?.today?.senkuStatus || {}).every(v => v === 0) && (Date.parse(r.fetched_at) - stamp(r)) < 5 * 6e4),
  disrupted: rows.findLast(r => r.area_id === '05' && r.raw_json?.today?.senkuStatus?.nemuro === 1 && text(r.raw_json.today).includes('根室線') && (Date.parse(r.fetched_at) - stamp(r)) < 5 * 6e4),
  multiline: rows.findLast(r => r.area_id === '01' && r.raw_json?.today?.senkuStatus?.hakochise === 1 && r.raw_json?.today?.senkuStatus?.gakuen === 1 && (Date.parse(r.fetched_at) - stamp(r)) < 5 * 6e4),
  tomorrowPlanned: rows.findLast(r => Object.entries(r.raw_json?.tomorrow?.senkuStatus || {}).some(([k, v]) => v === 1 && r.raw_json.today?.senkuStatus?.[k] === 0) && (Date.parse(r.fetched_at) - stamp(r)) < 5 * 6e4),
  offHours: rows.findLast(r => Object.values(r.raw_json?.today?.senkuStatus || {}).includes(2)),
  rollover: rows.findLast(r => { const h = +jst(r.fetched_at).slice(11, 13); return h >= 0 && h < 3 && r.raw_json?.today?.dateText !== `${+jst(r.fetched_at).slice(5,7)}/${+jst(r.fetched_at).slice(8,10)}`; }),
  nightlyStale: rows.findLast(r => (Date.parse(r.fetched_at) - stamp(r)) > 60 * 6e4),
};
for (const [name, r] of Object.entries(pick)) {
  if (!r) { console.log('MISSING', name); continue; }
  writeFileSync(`tests/fixtures/jr-feed/${name}.json`, JSON.stringify({ area: r.area_id, fetchedAt: r.fetched_at, source: 'crawler_logs ' + r.id, raw: r.raw_json }, null, 1) + '\n');
  console.log(name, r.area_id, jst(r.fetched_at).slice(0, 16), r.raw_json.time, 'today', r.raw_json.today?.dateText, JSON.stringify(Object.fromEntries(Object.entries(r.raw_json.today?.senkuStatus || {}).filter(([, v]) => v))), 'tomorrow', JSON.stringify(Object.fromEntries(Object.entries(r.raw_json.tomorrow?.senkuStatus || {}).filter(([, v]) => v))));
}
