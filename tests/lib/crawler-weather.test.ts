import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ getAdminSupabaseClient: () => null }));

import { fetchAreaWeather } from '@/lib/crawler';

const areas = [
    { id: '01', lat: 43.06, lon: 141.35 },
    { id: '02', lat: 42.9, lon: 141.6 },
];
const point = (t: number) => ({ current: { temperature_2m: t, wind_speed_10m: 10, wind_gusts_10m: 20, snowfall: 0.5, snow_depth: 0.1 } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const noSleep = async () => {};

describe('fetchAreaWeather', () => {
    it('fetches all areas in one request and maps by order', async () => {
        const f = vi.fn(async () => json([point(1), point(2)]));
        const { byArea, attempts } = await fetchAreaWeather(areas, f as unknown as typeof fetch, noSleep);
        expect(f).toHaveBeenCalledTimes(1);
        expect(String((f.mock.calls[0] as unknown[])[0])).toContain('latitude=43.06%2C42.9');
        expect(byArea['01'].temperature).toBe(1);
        expect(byArea['02'].temperature).toBe(2);
        expect(byArea['02'].evidence?.payload).toEqual(point(2));
        expect(attempts).toEqual([{ status: 200 }]);
    });

    it('retries on 429 and records the reason', async () => {
        const f = vi.fn()
            .mockResolvedValueOnce(new Response('limit', { status: 429, headers: { 'retry-after': '60' } }))
            .mockResolvedValueOnce(json([point(1), point(2)]));
        const { byArea, attempts } = await fetchAreaWeather(areas, f as unknown as typeof fetch, noSleep);
        expect(f).toHaveBeenCalledTimes(2);
        expect(attempts[0]).toEqual({ status: 429, retryAfter: '60' });
        expect(byArea['01'].evidence).toBeDefined();
    });

    it('retries timeouts, gives up after 3 attempts with no evidence', async () => {
        const err = Object.assign(new Error('t'), { name: 'TimeoutError' });
        const f = vi.fn(async () => { throw err; });
        const { byArea, attempts } = await fetchAreaWeather(areas, f as unknown as typeof fetch, noSleep);
        expect(f).toHaveBeenCalledTimes(3);
        expect(attempts).toEqual([{ error: 'timeout' }, { error: 'timeout' }, { error: 'timeout' }]);
        expect(byArea['01'].evidence).toBeUndefined();
        expect(byArea['01'].temperature).toBeNull();
    });

    it('does not retry a 400 or a location count mismatch', async () => {
        const bad = vi.fn(async () => json({ error: true }, 400));
        expect((await fetchAreaWeather(areas, bad as unknown as typeof fetch, noSleep)).attempts).toHaveLength(1);
        const short = vi.fn(async () => json([point(1)]));
        const r = await fetchAreaWeather(areas, short as unknown as typeof fetch, noSleep);
        expect(short).toHaveBeenCalledTimes(1);
        expect(r.byArea['01'].evidence).toBeUndefined();
    });
});
