import { readFileSync, readdirSync } from 'node:fs';
import { ROUTE_COORDINATES, getWeatherName } from '../../lib/weather';
import { hourFeatures, probability, levelOf } from '../../lib/forecast/core';
import type { WeatherForecast } from '../../lib/types';
const dir = process.argv[2];
const files = readdirSync(dir);
function series(p: { lat: number; lon: number }): WeatherForecast[] {
  const h = JSON.parse(readFileSync(`${dir}/day1_${p.lat},${p.lon}.json`, 'utf8')).hourly;
  return h.time.map((t: string, i: number) => ({ date: t.slice(0, 10), targetTime: t.slice(11, 16), weather: getWeatherName(h.weather_code[i]), tempMax: 0, tempMin: 0, precipitation: h.precipitation[i], windSpeed: h.wind_speed_10m[i], windGust: h.wind_gusts_10m[i], snowfall: h.snowfall[i], warnings: [] }));
}
const counts: Record<string, Record<string, number>> = {};
const sapporo: string[] = [];
for (const [route, pts] of Object.entries(ROUTE_COORDINATES)) {
  const ss = pts.map(series);
  for (let d = new Date('2025-12-11'); d <= new Date('2026-02-19'); d = new Date(d.getTime() + 86400000)) {
    const date = d.toISOString().slice(0, 10);
    let p = 0;
    for (const s of ss) for (let h = 5; h <= 23; h++) { const f = hourFeatures(s, date, `${String(h).padStart(2, '0')}:00`); if (f) p = Math.max(p, probability(f)); }
    const lv = levelOf(p, date); counts[route] ??= { low: 0, watch: 0, high: 0, severe: 0 }; counts[route][lv]++;
    if (route === 'jr-hokkaido.hakodate-main') sapporo.push(`${date.slice(5)}:${lv[0]}`);
  }
}
let tot = { low: 0, watch: 0, high: 0, severe: 0 } as Record<string, number>;
for (const [r, c] of Object.entries(counts)) { console.log(r.replace('jr-hokkaido.', '').padEnd(15), JSON.stringify(c)); for (const k in c) tot[k] += c[k]; }
const n = Object.values(tot).reduce((a, b) => a + b, 0);
console.log('total', JSON.stringify(tot), 'high+severe share', ((tot.high + tot.severe) / n * 100).toFixed(1) + '%', 'watch+ share', ((n - tot.low) / n * 100).toFixed(1) + '%');
console.log('hakodate-main:', sapporo.join(' '));
