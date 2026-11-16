/**
 * 既存の予測エンジンを「当時入手できた予報」だけで再生し、路線×日の実績ラベルと比較する。
 * JR公式の運行情報・利用者投稿・過去統計は入力しない(答えの混入防止)。
 *
 * Usage: npx tsx scripts/eval/score-engines.ts <labels.json> <wxDir> <out.json>
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROUTE_COORDINATES, getWeatherName } from '../../lib/weather';
import { calculateSuspensionRisk } from '../../lib/prediction-engine';
import { assessWeather } from '../../lib/forecast/risk';
import { hourFeatures, featureVector, FEATURE_NAMES } from '../../lib/forecast/core';
import catalog from '../../data/historical/winter-events.json';
import type { WeatherForecast } from '../../lib/types';
import type { PointForecast } from '../../lib/forecast/types';

type Label = 'weather' | 'other' | 'unknown' | 'none';
interface RouteDay { routeId: string; date: string; label: Label; source: string; lead: 'day1' | 'day0' }

const COORD_ID: Record<string, string> = { 'jr-hokkaido.gakuentoshi': 'jr-hokkaido.sassho' };
const SAPPORO_AREA = ['jr-hokkaido.hakodate-main', 'jr-hokkaido.chitose', 'jr-hokkaido.gakuentoshi'];
const HOURS = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, '0')}:00`); // 05:00–23:00 の運行時間帯

/** lib/weather.ts fetchWeatherSeries と同じ変換(単位: 風 m/s, 降雪 cm/h, 積雪深 m)。 */
function toSeries(hourly: Record<string, (number | null)[]>, depthInCm: boolean, priorDepth?: Map<string, number>): WeatherForecast[] {
    const h = hourly as Record<string, number[]> & { time: string[] };
    if (priorDepth) {
        // 前日予報アーカイブには積雪深が無い。対象日の前日21時点の積雪深(予測時点で既知)を1日通して使う。
        h.snow_depth = h.time.map((t: string) => priorDepth.get(addDays(t.slice(0, 10), -1) + 'T21:00') ?? NaN);
    }
    const out: WeatherForecast[] = [];
    h.time.forEach((time: string, i: number) => {
        const req = [h.temperature_2m[i], h.precipitation[i], h.wind_speed_10m[i], h.wind_gusts_10m[i], h.snowfall[i], h.snow_depth[i], h.weather_code[i]];
        if (!req.every(v => typeof v === 'number' && Number.isFinite(v))) return;
        const depth = depthInCm ? h.snow_depth[i] * 100 : h.snow_depth[i];
        out.push({
            date: time.slice(0, 10), targetTime: time.slice(11, 16),
            weather: getWeatherName(h.weather_code[i]), weatherCode: h.weather_code[i],
            temperature: h.temperature_2m[i], tempMax: h.temperature_2m[i], tempMin: h.temperature_2m[i],
            precipitation: h.precipitation[i], windSpeed: h.wind_speed_10m[i], windGust: h.wind_gusts_10m[i],
            snowfall: h.snowfall[i], snowDepth: depth,
            snowDepthChange: !priorDepth && i > 0 && Number.isFinite(h.snow_depth[i - 1]) ? (h.snow_depth[i] - h.snow_depth[i - 1]) * 100 : undefined,
            windDirection: h.wind_direction_10m?.[i], pressure: h.pressure_msl?.[i], warnings: [],
        });
    });
    return out;
}

function addDays(date: string, n: number) {
    return new Date(new Date(date + 'T00:00:00Z').getTime() + n * 86400_000).toISOString().slice(0, 10);
}

function main() {
    const [labelsPath, wxDir, outPath] = process.argv.slice(2);
    const collected = (JSON.parse(readFileSync(labelsPath, 'utf8')) as Array<{ routeId: string; date: string; label: Label }>)
        .map(x => ({ ...x, source: 'collected', lead: 'day1' as const }));
    const catalogDays: RouteDay[] = [];
    for (const e of catalog.events as Array<{ routeId: string; startDate: string; outcome: string }>) {
        if (e.outcome !== 'actual') continue;
        const year = +e.startDate.slice(0, 4);
        if (year < 2022) continue; // 2016年は当時の予報アーカイブが無い
        const routes = e.routeId === 'sapporo-area' ? SAPPORO_AREA : [e.routeId === 'jr-hokkaido.sassho' ? 'jr-hokkaido.gakuentoshi' : e.routeId];
        for (const routeId of routes) catalogDays.push({ routeId, date: e.startDate, label: 'weather', source: 'catalog', lead: year >= 2025 ? 'day1' : 'day0' });
    }
    const days = new Map<string, RouteDay>();
    for (const d of [...collected, ...catalogDays]) {
        const key = `${d.routeId}|${d.date}`;
        const cur = days.get(key);
        if (!cur || (d.label === 'weather' && cur.label !== 'weather')) days.set(key, d);
    }

    // 予報の読み込み
    const files = readdirSync(wxDir);
    const load = (kind: string, p: { lat: number; lon: number }, cm: boolean) => {
        const f = files.find(x => x === `${kind}_${p.lat},${p.lon}.json`);
        if (!f) return null;
        let prior: Map<string, number> | undefined;
        if (kind === 'day1') {
            const sd = files.find(x => x === `sd_${p.lat},${p.lon}.json`);
            if (!sd) return null;
            const j = JSON.parse(readFileSync(path.join(wxDir, sd), 'utf8')).hourly as { time: string[]; snow_depth: (number | null)[] };
            prior = new Map(j.time.flatMap((t, i) => typeof j.snow_depth[i] === 'number' ? [[t, j.snow_depth[i] as number]] : []));
        }
        return toSeries(JSON.parse(readFileSync(path.join(wxDir, f), 'utf8')).hourly, cm, prior);
    };
    const cache = new Map<string, WeatherForecast[] | null>();
    const series = (kind: string, p: { lat: number; lon: number }, cm = false) => {
        const key = `${kind}|${p.lat},${p.lon}|${cm}`;
        if (!cache.has(key)) cache.set(key, load(kind, p, cm));
        return cache.get(key)!;
    };

    const rows: Array<Record<string, unknown>> = [];
    let skipped = 0;
    for (const d of days.values()) {
        if (d.label === 'unknown' || d.label === 'other') continue; // 原因不明・気象以外は評価対象外
        const coords = ROUTE_COORDINATES[COORD_ID[d.routeId] ?? d.routeId];
        if (!coords) { skipped++; continue; }
        const primary = series(d.lead, coords[0]);
        const primaryCm = series(d.lead, coords[0], true);
        const all = coords.map(p => series(d.lead, p));
        if (!primary || !primaryCm || all.some(s => !s)) { skipped++; continue; }
        const dayHours = (s: WeatherForecast[]) => s.filter(h => h.date === d.date && HOURS.includes(h.targetTime!));
        if (dayHours(primary).length < HOURS.length) { skipped++; continue; }

        // エンジンA: /api/prediction/v2 と同じく代表1地点・翌日以降扱い(surroundingHours無し)・JR情報無し
        const engineA = (s: WeatherForecast[]) => Math.max(...dayHours(s).map(w => calculateSuspensionRisk({
            weather: w, routeId: d.routeId, routeName: d.routeId, targetDate: d.date, targetTime: w.targetTime, jrStatus: null,
        }).probability));
        // エンジンB: 現在の lib/forecast/risk.ts(旅程API)。2026-11-16以降は新しい中核(学習データ内の値なので交差検証ではない)
        const points: PointForecast[] = coords.map((p, i) => ({ point: { name: p.name, lat: p.lat, lon: p.lon }, hours: all[i]!, fetchedAt: '' }));
        const bLevels = HOURS.map(t => assessWeather(points, coords.length, d.date, t));
        const bScores = bLevels.map(r => r.score).filter((x): x is number => x !== null);
        const allDay = all.flatMap(s => dayHours(s!));
        // 新しい中核用: 地点×運行時間帯ごとの特徴ベクトル(本番と同じ hourFeatures/featureVector)
        const coreVectors: number[][] = [];
        let incomplete = 0;
        for (const s of all) for (const t of HOURS) {
            const f = hourFeatures(s!, d.date, t);
            if (!f) continue;
            if (!f.complete24) incomplete++;
            const x = featureVector(f);
            coreVectors.push(FEATURE_NAMES.map(n => x[n]));
        }
        rows.push({
            routeId: d.routeId, date: d.date, label: d.label, source: d.source, lead: d.lead,
            winter: [11, 12, 1, 2, 3].includes(+d.date.slice(5, 7)),
            engineA: engineA(primary),
            engineA_depthFixed: engineA(primaryCm),
            engineB: bScores.length ? Math.max(...bScores) : null,
            engineB_unknownHours: bLevels.filter(r => r.level === 'unknown').length,
            maxGust: Math.max(...allDay.map(h => h.windGust ?? 0)),
            maxWind: Math.max(...allDay.map(h => h.windSpeed)),
            maxSnowHour: Math.max(...allDay.map(h => h.snowfall ?? 0)),
            maxRainHour: Math.max(...allDay.map(h => h.precipitation)),
            coreVectors, coreIncompleteHours: incomplete,
        });
    }
    writeFileSync(outPath, JSON.stringify(rows));
    console.log(`scored ${rows.length} route-days, skipped ${skipped}`);
}

main();
