// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { collectionHealth } from '@/lib/collection-health';

const clientMocks = vi.hoisted(() => ({ admin: vi.fn(), anon: vi.fn() }));
vi.mock('@/lib/repos/client', () => ({ getAdminSupabaseClient: clientMocks.admin, getSupabaseClient: clientMocks.anon }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T16:05:00Z')); vi.clearAllMocks(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllEnvs(); });

function statisticsClient(fail = false) {
    const selected: Array<{ fields: string; options?: { count?: string; head?: boolean } }> = [];
    const starts: string[] = [];
    const counts: Record<string, number> = { normal: 57574, delayed: 159, suspended: 860 };
    return {
        selected, starts,
        client: { from: vi.fn(() => {
            let fields = '', options: { count?: string; head?: boolean } | undefined, status = '', today = false;
            const query = {
                select(value: string, config?: typeof options) { fields = value; options = config; selected.push({ fields, options }); return query; },
                eq(_key: string, value: string) { status = value; return query; },
                gte(_key: string, value: string) { today = true; starts.push(value); return query; },
                order() { return query; }, limit() { return query; }, maybeSingle() { return query; }, single() { return query; },
                then(resolve: (value: unknown) => unknown) {
                    if (fail) return Promise.resolve({ error: { code: '42501' }, data: null, count: null }).then(resolve);
                    // Simulate the REST row cap: fetching labels is not an all-table count.
                    const data = fields === 'train_status' ? Array.from({ length: 1000 }, () => ({ train_status: 'normal' })) : null;
                    const count = options?.count === 'exact' ? status ? counts[status] : today ? 22 : 58593 : null;
                    return Promise.resolve({ data, count, error: null }).then(resolve);
                },
            };
            return query;
        }) },
    };
}

describe('Private training statistics', () => {
    it('counts all rows beyond the REST row cap and uses the Japanese calendar day', async () => {
        const mock = statisticsClient(); clientMocks.admin.mockReturnValue(mock.client);
        const { getMLTrainingStats } = await import('@/lib/repos/admin');
        const result = await getMLTrainingStats();
        expect(result).toMatchObject({ success: true, data: { totalRows: 58593, todayRows: 22, statusBreakdown: { normal: 57574, delayed: 159, suspended: 860 } } });
        expect(mock.starts).toEqual(['2026-10-12T15:00:00.000Z']);
        expect(mock.selected.filter(query => query.options?.head)).toHaveLength(5);
    });
    it('does not fall back to the browser key when the server key is absent', async () => {
        clientMocks.admin.mockReturnValue(null);
        const { getMLTrainingStats } = await import('@/lib/repos/admin');
        expect((await getMLTrainingStats()).success).toBe(false);
        expect(clientMocks.anon).not.toHaveBeenCalled();
    });
    it('returns a failure instead of zero rows when permission or a query fails', async () => {
        clientMocks.admin.mockReturnValue(statisticsClient(true).client);
        const { getMLTrainingStats } = await import('@/lib/repos/admin');
        expect((await getMLTrainingStats()).success).toBe(false);
    });
    it('requires admin credentials before exposing the new statistics endpoint', async () => {
        const { middleware } = await import('@/middleware');
        expect(middleware(new NextRequest('https://example.test/api/admin/ml-stats')).status).toBe(401);
        vi.stubEnv('ADMIN_USER', 'test-admin'); vi.stubEnv('ADMIN_PASSWORD', 'test-only-password');
        expect(middleware(new NextRequest('https://example.test/api/admin/ml-stats', { headers: { authorization: `Basic ${btoa('test-admin:wrong')}` } })).status).toBe(401);
    });
});

describe('Collector completion, failure and silence', () => {
    const now = new Date('2026-10-12T13:20:00Z');
    const completed = { started_at: '2026-10-12T13:15:02Z', finished_at: '2026-10-12T13:15:04Z', status: 'success' };
    it('recognizes a recent successful collection', () => expect(collectionHealth(completed, now).state).toBe('healthy'));
    it('reports an actual collector failure', () => expect(collectionHealth({ ...completed, status: 'error' }, now).state).toBe('failed'));
    it('does not count a dispatch without completion as healthy', () => expect(collectionHealth({ ...completed, status: 'running', finished_at: null }, now).state).toBe('running'));
    it('detects a stuck run after ten minutes', () => expect(collectionHealth({ ...completed, status: 'running', finished_at: null }, new Date('2026-10-12T13:25:02Z')).state).toBe('stale'));
    it('detects missing scheduled runs after thirty minutes even when the last one succeeded', () => expect(collectionHealth(completed, new Date('2026-10-12T13:45:02Z')).state).toBe('stale'));
    it('keeps missing or invalid evidence unknown', () => {
        expect(collectionHealth(null, now).state).toBe('unknown');
        expect(collectionHealth({ ...completed, finished_at: null }, now).state).toBe('unknown');
        expect(collectionHealth({ ...completed, started_at: 'invalid' }, now).state).toBe('unknown');
        expect(collectionHealth({ ...completed, finished_at: '2026-10-12T13:14:00Z' }, now).state).toBe('unknown');
    });
});
