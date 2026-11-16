import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAreaFeed, parseJstStamp, resolveDateText, type FeedSnapshot, type AreaFeed } from '@/lib/sources/jr-feed';
import { lineOfficial, combine } from '@/lib/engine/status';
import { LINES, LINE_BY_SLUG } from '@/lib/registry/lines';
import { STATUS_UNITS, UNIT_BY_ID } from '@/lib/registry/units';
import type { JrAreaId } from '@/lib/registry/units';

/** 保存済みの実際のJRフィード(crawler_logs から抽出) */
function fixture(name: string) {
    const f = JSON.parse(readFileSync(path.join(__dirname, '../fixtures/jr-feed', `${name}.json`), 'utf8'));
    const feed = parseAreaFeed(f.raw, f.area as JrAreaId, f.fetchedAt)!;
    return { feed, fetchedAt: new Date(f.fetchedAt) as Date };
}
const snap = (...feeds: AreaFeed[]): FeedSnapshot => ({ feeds: Object.fromEntries(feeds.map(f => [f.area, f])), errors: {}, fetchedAt: feeds[0]?.fetchedAt ?? '' });
const line = (slug: string) => LINE_BY_SLUG.get(slug)!;

describe('JR feed parsing', () => {
    it('reads the publish stamp and rejects impossible dates', () => {
        expect(parseJstStamp('2026年11月16日 18時29分現在')).toBe('2026-11-16T09:29:00.000Z');
        expect(parseJstStamp('2026年02月30日 10時00分現在')).toBeNull();
        expect(parseJstStamp('')).toBeNull();
    });
    it('resolves dateText across the year boundary', () => {
        expect(resolveDateText('1/1', '2026-12-31T14:00:00Z')).toBe('2027-01-01');
        expect(resolveDateText('12/31', '2027-01-01T01:00:00Z')).toBe('2026-12-31');
        expect(resolveDateText('2/30', '2026-02-01T00:00:00Z')).toBeNull();
    });
    it('parses a BOM-prefixed string and drops the no-information boilerplate notice', () => {
        const raw = '﻿' + JSON.stringify({ time: '2026年11月16日 18時29分現在', today: { dateText: '11/16', senkuStatus: { soya: 0 }, areaStatus: {}, gaikyo: [{ time: '', title: '', honbun: '現在、遅れに関する情報はありません。', eikyo: {} }], areaComments: [] }, tomorrow: {} });
        const feed = parseAreaFeed(raw, '04', '2026-11-16T09:30:00Z')!;
        expect(feed.today.date).toBe('2026-11-16');
        expect(feed.today.units.soya).toBe('no-info');
        expect(feed.today.notices).toEqual([]);
    });
    it('returns null for an unexpected shape instead of guessing', () => {
        expect(parseAreaFeed('not json', '01', '')).toBeNull();
        expect(parseAreaFeed({ foo: 1 }, '01', '')).toBeNull();
    });
    it('maps code 2 to off-hours (サービス時間外)', () => {
        const { feed } = fixture('offHours');
        expect(Object.values(feed.today.units).every(c => c === 'off-hours')).toBe(true);
    });
});

describe('Official line status from real snapshots', () => {
    it('all-clear feed is "no information", never a promise of normal service', () => {
        const { feed, fetchedAt } = fixture('normal');
        const r = lineOfficial(line('sapporo-hakodate-chitose'), snap(feed), '2026-11-16', fetchedAt);
        expect(r.state).toBe('no-info');
        expect(r.notices).toEqual([]);
    });
    it('a disrupted unit makes the line disrupted, with the matching notice', () => {
        const { feed, fetchedAt } = fixture('disrupted');
        const r = lineOfficial(line('nemuro'), snap(feed), feed.today.date!, fetchedAt);
        expect(r.state).toBe('disrupted');
        expect(r.notices.length).toBeGreaterThan(0);
        expect(r.notices.every(n => !n.areaWide)).toBe(true);
        expect(r.notices.some(n => (n.title + n.body).includes('根室線'))).toBe(true);
        expect(lineOfficial(line('senmo'), snap(feed), feed.today.date!, fetchedAt).state).toBe('no-info');
    });
    it('multi-line bulletin flags each affected Sapporo unit', () => {
        const { feed, fetchedAt } = fixture('multiline');
        for (const slug of ['airport', 'sapporo-hakodate-chitose', 'gakuen-toshi']) {
            // 学園都市線は 01 と 02 の両方の単位を持つ。02 のフィードが無い分は「不明」が混ざっても運休が優先される
            expect(lineOfficial(line(slug), snap(feed), feed.today.date!, fetchedAt).state).toBe('disrupted');
        }
    });
    it('uses the tomorrow block for a planned suspension after midnight (operating-day rollover)', () => {
        const { feed, fetchedAt } = fixture('tomorrowPlanned');
        expect(feed.today.date).toBe('2026-11-12');
        expect(feed.tomorrow.date).toBe('2026-11-13');
        const soya = line('soya');
        expect(lineOfficial(soya, snap(feed), '2026-11-13', fetchedAt).state).toBe('disrupted');
        expect(lineOfficial(soya, snap(feed), '2026-11-12', fetchedAt).state).toBe('no-info');
        const later = lineOfficial(soya, snap(feed), '2026-11-14', fetchedAt);
        expect(later.state).toBe('unknown');
        expect(later.reason).toBe('date-mismatch');
    });
    it('treats the 03–05h stale feed as unknown with the nightly-pause reason', () => {
        const { feed, fetchedAt } = fixture('nightlyStale');
        const r = lineOfficial(line('muroran'), snap(feed), feed.today.date!, fetchedAt);
        expect(r.state).toBe('unknown');
        expect(r.reason).toBe('nightly-pause');
    });
    it('a stale feed during the day is unknown, never normal', () => {
        const { feed } = fixture('normal');
        const r = lineOfficial(line('sapporo-hakodate-chitose'), snap(feed), '2026-11-16', new Date(Date.parse(feed.publishedAt!) + 45 * 60_000));
        expect(r.state).toBe('unknown');
        expect(r.reason).toBe('stale');
    });
    it('a missing area feed is unknown', () => {
        const r = lineOfficial(line('soya'), snap(), '2026-11-16', new Date());
        expect(r.state).toBe('unknown');
        expect(r.reason).toBe('missing');
    });
    it('off-hours overnight is reported as such, not as normal', () => {
        const { feed, fetchedAt } = fixture('rollover');
        const r = lineOfficial(line('hakodate-liner'), snap(feed), feed.today.date!, fetchedAt);
        expect(r.state).toBe('off-hours');
    });
});

describe('Registry integrity', () => {
    it('every line unit exists in the JR master, and no abolished 留萌線', () => {
        for (const l of LINES) for (const u of l.units) expect(UNIT_BY_ID.has(u)).toBe(true);
        expect(LINES.some(l => l.name.includes('留萌'))).toBe(false);
        expect(STATUS_UNITS.some(u => (u.key as string) === 'rumoi')).toBe(false);
    });
    it('every JR unit is shown by some line', () => {
        const used = new Set(LINES.flatMap(l => l.units));
        for (const u of STATUS_UNITS) expect(used.has(`${u.area}:${u.key}`)).toBe(true);
    });
    it('slugs are unique and every non-express line has weather points', () => {
        expect(new Set(LINES.map(l => l.slug)).size).toBe(LINES.length);
        for (const l of LINES) if (l.slug !== 'express') expect(l.weatherPoints.length).toBeGreaterThan(0);
    });
    it('combine: disruption dominates, unknown beats no-info', () => {
        expect(combine(['no-info', 'disrupted', 'unknown'])).toBe('disrupted');
        expect(combine(['no-info', 'unknown'])).toBe('unknown');
        expect(combine(['off-hours', 'no-info'])).toBe('no-info');
        expect(combine([])).toBe('unknown');
    });
});
