import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWeatherSeriesBatch, __resetWeatherCache, STALE_WEATHER_MAX_MS } from '@/lib/weather';

const P = [{ lat: 43, lon: 141 }, { lat: 42, lon: 140 }];
const hourly = () => ({ time: ['2026-01-15T12:00'], temperature_2m: [-3], precipitation: [1], wind_speed_10m: [4], wind_gusts_10m: [8], snow_depth: [0.5], weather_code: [71], snowfall: [0.7], winddirection_10m: [300], pressure_msl: [1010] });
const ok = () => new Response(JSON.stringify(P.map(() => ({ hourly: hourly() }))));

afterEach(() => { vi.useRealTimers(); __resetWeatherCache(); });

describe('weather: keep the last good forecast through an outage', () => {
    it('serves the previous forecast, with its original fetch time, when the source fails', async () => {
        vi.useFakeTimers({ now: new Date('2026-01-15T00:00:00Z') });
        const first = await fetchWeatherSeriesBatch(P, (async () => ok()) as unknown as typeof fetch);
        expect(first.every(s => !(s instanceof Error))).toBe(true);
        vi.setSystemTime(new Date('2026-01-15T01:00:00Z')); // 15分キャッシュ切れ
        const again = await fetchWeatherSeriesBatch(P, (async () => { throw new Error('connect timeout'); }) as unknown as typeof fetch);
        expect(again.every(s => !(s instanceof Error))).toBe(true);
        expect((again[0] as { fetchedAt: string }).fetchedAt).toBe('2026-01-15T00:00:00.000Z');
    });
    it('gives up once the kept forecast is older than the limit (unknown, not stale reassurance)', async () => {
        vi.useFakeTimers({ now: new Date('2026-01-15T00:00:00Z') });
        await fetchWeatherSeriesBatch(P, (async () => ok()) as unknown as typeof fetch);
        vi.setSystemTime(new Date(Date.parse('2026-01-15T00:00:00Z') + STALE_WEATHER_MAX_MS + 60_000));
        const late = await fetchWeatherSeriesBatch(P, (async () => new Response('x', { status: 503 })) as unknown as typeof fetch);
        expect(late.every(s => s instanceof Error)).toBe(true);
    });
    it('with nothing kept, a failure is an error', async () => {
        const r = await fetchWeatherSeriesBatch(P, (async () => { throw new Error('down'); }) as unknown as typeof fetch);
        expect(r.every(s => s instanceof Error)).toBe(true);
    });
});
