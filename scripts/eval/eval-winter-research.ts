/**
 * 真冬(2025-12-11〜2026-02-19)の札幌圏で、risk-core を前日予報だけで再生し、報道から調べた運休日と比べる。
 * 学習に使っていない期間なので、冬の誤警報の多さと見逃しの確認になる(ラベルは報道ベースで、小さな運休は漏れ得る)。
 * Usage: npx tsx scripts/eval/eval-winter-research.ts <wxDir> [emit.json]
 * emit.json を指定すると、fit-core.ts に追加で渡せる学習行(嵐の当日=陽性、後遺症の日は除外、記事のない日=陰性)を書き出す。
 */
import { readFileSync } from 'node:fs';
import { ROUTE_COORDINATES, getWeatherName } from '../../lib/weather';
import { hourFeatures, probability, levelOf, featureVector, FEATURE_NAMES } from '../../lib/forecast/core';
import { writeFileSync } from 'node:fs';
import { auc } from './metrics';
import research from '../../data/historical/research/winter-2025-26-disruptions.json';
import type { WeatherForecast } from '../../lib/types';

const dir = process.argv[2];
const SAPPORO = ['jr-hokkaido.hakodate-main', 'jr-hokkaido.chitose', 'jr-hokkaido.sassho'];
const SAPPORO_WORDS = /函館線|千歳線|学園都市線|快速エアポート|札幌圏/;
/** 嵐の当日(それ以外の運休日は、除雪が追いつかない等の「後遺症」の日) */
const ONSET_DAYS = new Set(['2026-01-25', '2026-02-02', '2026-02-06', '2026-02-19']);

function series(p: { lat: number; lon: number }): WeatherForecast[] {
    const h = JSON.parse(readFileSync(`${dir}/day1_${p.lat},${p.lon}.json`, 'utf8')).hourly;
    return h.time.map((t: string, i: number) => ({ date: t.slice(0, 10), targetTime: t.slice(11, 16), weather: getWeatherName(h.weather_code[i]), tempMax: 0, tempMin: 0,
        precipitation: h.precipitation[i], windSpeed: h.wind_speed_10m[i], windGust: h.wind_gusts_10m[i], snowfall: h.snowfall[i], warnings: [] }));
}

function main() {
    const points = SAPPORO.flatMap(r => ROUTE_COORDINATES[r]);
    const all = points.filter((p, i) => points.findIndex(q => q.lat === p.lat && q.lon === p.lon) === i).map(series);
    const events = new Map<string, { scale: string; cancelled: number | null }>();
    for (const e of research.events) if (SAPPORO_WORDS.test(e.lines.join(' ') + e.section)) events.set(e.date, { scale: e.scale, cancelled: e.trainsCancelled });
    const rows: { date: string; p: number; snow24: number; snow72: number; event: boolean; onset: boolean }[] = [];
    for (let t = Date.parse('2025-12-11T00:00:00Z'); t <= Date.parse('2026-02-19T00:00:00Z'); t += 86_400_000) {
        const date = new Date(t).toISOString().slice(0, 10);
        let p = 0, snow24 = 0, snow72 = 0;
        for (const s of all) {
            for (let h = 5; h <= 23; h++) {
                const f = hourFeatures(s, date, `${String(h).padStart(2, '0')}:00`);
                if (f) { p = Math.max(p, probability(f)); snow24 = Math.max(snow24, f.snow24); }
            }
            const i = s.findIndex(x => x.date === date && x.targetTime === '23:00');
            if (i >= 71) snow72 = Math.max(snow72, s.slice(i - 71, i + 1).reduce((a, x) => a + (x.snowfall ?? 0), 0));
        }
        rows.push({ date, p, snow24, snow72, event: events.has(date), onset: ONSET_DAYS.has(date) });
    }
    const pos = rows.filter(r => r.event), neg = rows.filter(r => !r.event);
    const count = (list: typeof rows, lv: string[]) => list.filter(r => lv.includes(levelOf(r.p, r.date))).length;
    console.log(`札幌圏 ${rows.length}日: 運休日 ${pos.length}(嵐の当日 ${pos.filter(r => r.onset).length}) / それ以外 ${neg.length}`);
    console.log(`AUC 全運休日 ${auc(pos.map(r => r.p), neg.map(r => r.p)).toFixed(2)} | 嵐の当日のみ ${auc(pos.filter(r => r.onset).map(r => r.p), neg.map(r => r.p)).toFixed(2)}`);
    console.log(`参考 AUC(3日間の降雪合計) 全運休日 ${auc(pos.map(r => r.snow72), neg.map(r => r.snow72)).toFixed(2)} | 24時間降雪 ${auc(pos.map(r => r.snow24), neg.map(r => r.snow24)).toFixed(2)}`);
    for (const [name, lv] of [['注意以上', ['watch', 'high', 'severe']], ['警戒以上', ['high', 'severe']], ['高い', ['severe']]] as const)
        console.log(`${name}: 運休日 ${count(pos, [...lv])}/${pos.length} (当日 ${count(pos.filter(r => r.onset), [...lv])}/${pos.filter(r => r.onset).length}) | 運休記事のない日 ${count(neg, [...lv])}/${neg.length} (${Math.round(count(neg, [...lv]) / neg.length * 100)}%)`);
    if (process.argv[3]) {
        const emit: Record<string, unknown>[] = [];
        for (const routeId of SAPPORO) {
            const ss = ROUTE_COORDINATES[routeId].map(series);
            for (const r of rows) {
                if (r.event && !r.onset) continue; // 後遺症の日は気象予報では説明できないので学習に使わない
                const coreVectors: number[][] = [];
                for (const s of ss) for (let h = 5; h <= 23; h++) {
                    const f = hourFeatures(s, r.date, `${String(h).padStart(2, '0')}:00`);
                    if (f) { const x = featureVector(f); coreVectors.push(FEATURE_NAMES.map(n => x[n])); }
                }
                emit.push({ routeId: routeId === 'jr-hokkaido.sassho' ? 'jr-hokkaido.gakuentoshi' : routeId, date: r.date, label: r.onset ? 'weather' : 'none', source: 'research-2025-26', lead: 'day1', winter: true, coreVectors });
            }
        }
        writeFileSync(process.argv[3], JSON.stringify(emit));
        console.log('emitted', emit.length, 'rows');
    }
    console.log('運休日の内訳:');
    for (const r of pos) console.log(` ${r.date} ${r.onset ? '当日' : '後日'} ${levelOf(r.p, r.date).padEnd(6)} p=${(r.p * 100).toFixed(1).padStart(5)}% 24h雪 ${r.snow24.toFixed(1).padStart(5)}cm 72h雪 ${r.snow72.toFixed(1).padStart(5)}cm 運休 ${events.get(r.date)!.cancelled ?? '?'}本`);
    console.log('記事のない日で「警戒以上」:', neg.filter(r => ['high', 'severe'].includes(levelOf(r.p, r.date))).map(r => `${r.date.slice(5)}(${r.snow24.toFixed(0)}cm)`).join(' '));
}
main();
