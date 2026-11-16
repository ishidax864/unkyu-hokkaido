/**
 * 評価用気象: 各路線の代表地点について「当時入手できた予報」を取得してキャッシュする。
 * - day1: Open-Meteo previous-runs API の *_previous_day1 (前日に発表された予報)。2025-12以降。
 * - day0: historical-forecast API (当日発表の予報の連結)。2022年の補助検証用。
 * 実測・再解析は使わない(答えの混入を避ける)。
 *
 * Usage: npx tsx scripts/eval/fetch-forecasts.ts <outDir>
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROUTE_COORDINATES } from '../../lib/weather';

const VARS = ['temperature_2m', 'precipitation', 'wind_speed_10m', 'wind_gusts_10m', 'snow_depth', 'weather_code', 'snowfall', 'wind_direction_10m', 'pressure_msl'];
async function main() {
const outDir = process.argv[2];
if (!outDir) throw new Error('outDir required');
mkdirSync(outDir, { recursive: true });

const RANGES = [
    { kind: 'day1', host: 'previous-runs-api.open-meteo.com', start: '2025-12-10', end: '2026-11-16', suffix: '_previous_day1' },
    { kind: 'day0', host: 'historical-forecast-api.open-meteo.com', start: '2022-02-03', end: '2022-02-24', suffix: '' },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const points = new Map<string, { lat: number; lon: number }>();
for (const list of Object.values(ROUTE_COORDINATES)) for (const p of list) points.set(`${p.lat},${p.lon}`, p);

for (const range of RANGES) for (const [key, p] of points) {
    const file = path.join(outDir, `${range.kind}_${key}.json`);
    if (existsSync(file)) continue;
    const url = `https://${range.host}/v1/forecast?latitude=${p.lat}&longitude=${p.lon}` +
        `&hourly=${VARS.map(v => v + range.suffix).join(',')}&start_date=${range.start}&end_date=${range.end}` +
        '&timezone=Asia%2FTokyo&wind_speed_unit=ms';
    for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(url, { signal: AbortSignal.timeout(60000) }).catch(e => ({ ok: false, status: String(e?.cause?.code ?? e) } as const));
        if (res.ok && 'json' in res) {
            const data = await res.json();
            // 変数名から接尾辞を外し、取得元と取得時刻を残す
            const hourly: Record<string, unknown[]> = {};
            for (const [k, v] of Object.entries(data.hourly as Record<string, unknown[]>)) hourly[k.replace(range.suffix, '')] = v;
            writeFileSync(file, JSON.stringify({ kind: range.kind, url, fetchedAt: new Date().toISOString(), hourly }));
            console.log('ok', range.kind, key);
            break;
        }
        console.log('retry', res.status, range.kind, key);
        await sleep(5000 * (attempt + 1));
    }
    await sleep(400);
}
}

main().catch(e => { console.error(e); process.exit(1); });
