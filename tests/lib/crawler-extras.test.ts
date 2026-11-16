import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ getAdminSupabaseClient: () => null }));

import { collectExtras, EXTRA_SOURCES } from '@/lib/crawler';

function fakeDb(lastHash: Record<string, string>) {
    const inserted: Record<string, unknown>[] = [];
    const client = {
        from: () => ({
            select: () => ({ eq: (_: string, id: string) => ({ order: () => ({ limit: async () => ({ data: lastHash[id] ? [{ content_hash: lastHash[id] }] : [] }) }) }) }),
            insert: async (row: Record<string, unknown>) => { inserted.push(row); lastHash[row.area_id as string] = row.content_hash as string; return { error: null }; },
        }),
    };
    return { client: client as never, inserted };
}

describe('collectExtras', () => {
    it('saves each source once, then reports unchanged for identical content', async () => {
        const f = vi.fn(async (url: string) => new Response(String(url).includes('chuo-bus') ? '<rss/>' : '﻿{"today":[{"kukan":1,"status":1}]}'));
        const db = fakeDb({});
        const first = await collectExtras(db.client, f as unknown as typeof fetch);
        expect(Object.values(first).every(v => v === 'saved')).toBe(true);
        expect(db.inserted).toHaveLength(EXTRA_SOURCES.length);
        expect(db.inserted.find(r => r.area_id === 'bus:chuo')!.raw_json).toEqual({ text: '<rss/>' });
        const second = await collectExtras(db.client, f as unknown as typeof fetch);
        expect(Object.values(second).every(v => v === 'unchanged')).toBe(true);
        expect(db.inserted).toHaveLength(EXTRA_SOURCES.length);
    });
    it('records a failure reason per source without throwing', async () => {
        const f = vi.fn(async (url: string) => String(url).includes('jma') ? new Response('x', { status: 503 }) : new Response('{"a":1}'));
        const out = await collectExtras(fakeDb({}).client, f as unknown as typeof fetch);
        expect(out['jma:016000']).toBe('error: HTTP 503');
        expect(out.map).toBe('saved');
    });
});
