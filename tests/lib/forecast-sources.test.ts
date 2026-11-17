// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { officialPublishedAt } from '@/lib/official-observation';

// 保存済み予報(Supabase)は使わず、外部取得の動きだけを確かめる
vi.mock('@/lib/repos/client', async orig => ({ ...(await orig() as object), getAdminSupabaseClient: () => null }));

const now = new Date('2026-01-15T03:00:00Z');
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });

function feed(honbun: string, time = '2026年1月15日 11時50分現在') {
    return new Response(JSON.stringify({ time, today: { gaikyo: [{ honbun }] } }));
}
describe('Official feed boundaries', () => {
    it('retains the recovery sentence belonging to a single-route bulletin', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => feed('千歳線で運転を見合わせています。運転再開見込みは13時30分頃を予定しています。')));
        const { fetchJRHokkaidoStatus } = await import('@/lib/jr-status');
        const status = (await fetchJRHokkaidoStatus()).find(r => r.routeId === 'jr-hokkaido.chitose');
        expect(status?.status).toBe('suspended');
        expect(status?.rawText).toContain('13時30分');
        expect(status?.publishedAt).toBe('2026-01-15T02:50:00.000Z');
    });
    it('rejects stale all-clear instead of stamping it as current', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => feed('現在、遅れに関する情報はありません。', '2026年1月13日 11時50分現在')));
        const { fetchJRHokkaidoStatus } = await import('@/lib/jr-status');
        expect(await fetchJRHokkaidoStatus()).toEqual([]);
    });
    it('does not invent normal when all official requests fail', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
        const { fetchJRHokkaidoStatus } = await import('@/lib/jr-status');
        await expect(fetchJRHokkaidoStatus()).rejects.toThrow('unavailable');
    });
    it('does not use one area to claim a route is normal when another area failed', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('area_02') ? new Response('', { status: 503 }) : feed('現在、遅れに関する情報はありません。')));
        const { fetchJRHokkaidoStatus, ROUTE_DEFINITIONS } = await import('@/lib/jr-status');
        const affected = ROUTE_DEFINITIONS.filter(r => r.validAreas?.includes('02')).map(r => r.routeId);
        expect((await fetchJRHokkaidoStatus()).some(r => affected.includes(r.routeId))).toBe(false);
    });
    it('rejects invalid dates and preserves JST at midnight', () => {
        expect(officialPublishedAt('2026年2月30日 09時00分現在')).toBeNull();
        expect(officialPublishedAt('2026年1月15日 00時05分現在')).toBe('2026-01-14T15:05:00.000Z');
    });
});

describe('Weather fetch reuse and missing values', () => {
    const payload = { hourly: { time: ['2026-01-15T12:00', '2026-01-15T13:00'], temperature_2m: [-5, -5], precipitation: [0, 0], wind_speed_10m: [4, null], wind_gusts_10m: [6, 7], snowfall: [2, 3], snow_depth: [0.7, 0.8], weather_code: [71, 71] } };
    it('uses one request for concurrent consumers and preserves hourly snowfall vs snow depth', async () => {
        const fetcher = vi.fn(async (_url: string) => new Response(JSON.stringify(payload))); vi.stubGlobal('fetch', fetcher);
        const { fetchWeatherSeries } = await import('@/lib/weather');
        const [a,b] = await Promise.all([fetchWeatherSeries({ lat:43,lon:141 }),fetchWeatherSeries({ lat:43,lon:141 })]);
        expect(fetcher).toHaveBeenCalledTimes(1); expect(a).toEqual(b);
        expect(a.hours).toHaveLength(1); // Missing wind at 13:00 never becomes zero wind.
        expect(a.hours[0]).toMatchObject({ snowfall: 2, snowDepth: 0.7, windSpeed: 4 });
        expect(fetcher.mock.calls[0][0]).toContain('wind_speed_unit=ms');
    });
    it('does not retain failed fetches in cache', async () => {
        const fetcher = vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response(JSON.stringify(payload))); vi.stubGlobal('fetch', fetcher);
        const { fetchWeatherSeries } = await import('@/lib/weather');
        await expect(fetchWeatherSeries({lat:43,lon:141})).rejects.toThrow();
        expect((await fetchWeatherSeries({lat:43,lon:141})).hours).toHaveLength(1);
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});

const crawl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/crawler', () => ({ runJRCrawler: crawl }));
const health = vi.hoisted(() => vi.fn());
vi.mock('@/lib/collection-monitor', () => ({ readCollectionHealth: health }));
describe('Crawler authentication and failure reporting', () => {
    it('rejects spoofed x-vercel-cron without a bearer secret', async () => {
        vi.stubEnv('CRON_SECRET','test-secret');
        const { GET } = await import('@/app/api/cron/crawl/route');
        const response = await GET(new NextRequest('https://example.test/api/cron/crawl',{headers:{'x-vercel-cron':'1'}}));
        expect(response.status).toBe(401); expect(crawl).not.toHaveBeenCalled();
    });
    it('returns a failure status when an authenticated collection is incomplete', async () => {
        vi.stubEnv('CRON_SECRET','test-secret'); health.mockResolvedValueOnce({state:'failed'});
        const { GET } = await import('@/app/api/cron/crawl/route');
        const response = await GET(new NextRequest('https://example.test/api/cron/crawl',{headers:{authorization:'Bearer test-secret'}}));
        expect(response.status).toBe(503); expect(crawl).not.toHaveBeenCalled();
    });
    it('legacy scheduled calls monitor the external collector without inserting a second batch', async () => {
        vi.stubEnv('CRON_SECRET','test-secret'); health.mockResolvedValueOnce({state:'healthy'});
        const { GET } = await import('@/app/api/cron/crawl/route');
        expect((await GET(new NextRequest('https://example.test/api/cron/crawl',{headers:{authorization:'Bearer test-secret'}}))).status).toBe(200);
        expect(crawl).not.toHaveBeenCalled();
    });
});
