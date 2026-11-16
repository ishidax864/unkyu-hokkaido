import { fetchWeatherSeries } from '../../lib/weather';
async function main() {
  for (const p of [{ lat: 43.0621, lon: 141.3544 }, { lat: 42.7752, lon: 141.6922 }, { lat: 43.7709, lon: 142.3650 }]) {
    try { const s = await fetchWeatherSeries(p); console.log(p, 'ok', s.hours.length, s.hours[0]?.date, s.hours.at(-1)?.date); }
    catch (e) { console.log(p, 'ERR', (e as Error).message, (e as Error & { cause?: { code?: string } }).cause?.code); }
  }
}
main();
