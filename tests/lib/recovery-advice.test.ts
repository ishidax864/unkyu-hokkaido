import { describe, it, expect } from 'vitest';
import { episodesOfUnit, mergeIncidents, kaplanMeier, outlookFor, classifyCause, type Observation, type RecoveryDataset } from '@/lib/engine/episodes';
import { recoveryView } from '@/lib/engine/recovery';
import { advise } from '@/lib/engine/advice';

const t0 = Date.parse('2026-11-10T01:00:00Z'); // 10:00 JST
const obs = (min: number, code: 0 | 1 | 2, title = ''): Observation => ({ at: t0 + min * 60_000, code, title, body: '' });
/** 15分ごとの観測: 0分は平常、15分〜(15+minutes)分が運休、その後平常 */
const run = (minutes: number, title: string): Observation[] => [obs(0, 0), ...Array.from({ length: minutes / 15 }, (_, i) => obs(15 + i * 15, 1, title)), obs(15 + minutes, 0)];
const data: RecoveryDataset = {
    all: { resumed: [20, 30, 45, 60, 60, 90, 90, 120, 150, 180, 240, 300], censored: [400] },
    byCause: { animal: { resumed: [30, 45, 60, 60, 90, 90, 120, 150, 180, 240], censored: [400, 500] }, snow: { resumed: [100, 180], censored: [600] } },
};
const now = new Date(t0 + 60 * 60_000);

describe('episode derivation', () => {
    it('measures onset → cleared when both ends are observed', () => {
        const [e] = episodesOfUnit('05:nemuro', run(90, '鹿との衝突による列車への影響について'));
        expect(e.outcome).toBe('resumed');
        expect(e.onsetKnown && e.endKnown).toBe(true);
        expect((e.end - e.onset) / 60_000).toBe(90);
        expect(e.cause).toBe('animal');
    });
    it('marks off-hours and observation gaps as censored, never as resumed', () => {
        expect(episodesOfUnit('05:nemuro', [obs(0, 0), obs(15, 1), obs(30, 2)])[0].outcome).toBe('off-hours');
        expect(episodesOfUnit('05:nemuro', [obs(0, 0), obs(15, 1), obs(300, 0)])[0].outcome).toBe('gap');
        expect(episodesOfUnit('05:nemuro', [obs(0, 0), obs(15, 1)])[0].outcome).toBe('open');
    });
    it('does not trust an onset first seen after a long gap', () => {
        expect(episodesOfUnit('05:nemuro', [obs(0, 0), obs(200, 1), obs(215, 0)])[0].onsetKnown).toBe(false);
        expect(mergeIncidents(episodesOfUnit('05:nemuro', [obs(0, 0), obs(200, 1), obs(215, 0)]))).toEqual([]);
    });
    it('merges the same incident reported under several units, keeping the longest', () => {
        const a = episodesOfUnit('01:express', run(60, '大雪による列車への影響について'));
        const b = episodesOfUnit('02:express', run(120, '大雪による列車への影響について'));
        const merged = mergeIncidents([...a, ...b]);
        expect(merged).toHaveLength(1);
        expect(merged[0].minutes).toBe(120);
        expect(merged[0].cause).toBe('snow');
    });
    it('classifies causes from JR titles', () => {
        expect(classifyCause('熊との衝突による列車への影響について')).toBe('animal');
        expect(classifyCause('踏切支障による列車への影響について')).toBe('crossing');
        expect(classifyCause('強風による列車への影響について')).toBe('wind');
        expect(classifyCause('列車への影響について', '函館線 白石駅構内にて、架線に付着したビニールの除去作業')).toBe('equipment');
        expect(classifyCause('列車への影響について')).toBe('other');
    });
});

describe('Kaplan–Meier outlook', () => {
    it('counts censored cases as "lasted at least this long"', () => {
        const withCensor = kaplanMeier({ resumed: [30, 60], censored: [600, 600] })!;
        expect(withCensor.within.h2).toBe(0.5);
        expect(withCensor.p75).toBeNull(); // 4件中2件は解消を観測できていない
    });
    it('conditions on elapsed time: remaining time does not shrink to zero', () => {
        const fresh = kaplanMeier(data.byCause.animal!, 0)!;
        const after = kaplanMeier(data.byCause.animal!, 90)!;
        expect(after.n).toBeLessThan(fresh.n);
        expect(after.median).toBeGreaterThan(0);
    });
    it('does not borrow the pooled record for snow when snow cases are too few', () => {
        expect(outlookFor(data, 'snow', 0)).toBeNull();
        expect(outlookFor(data, 'animal', 0)?.pool).toBe('cause');
        expect(outlookFor(data, 'other', 0)?.pool).toBe('all');
    });
});

describe('recovery view', () => {
    it('prefers the official announced time', () => {
        const v = recoveryView({ notices: [{ title: '鹿との衝突による列車への影響について', body: '運転再開は12時30分頃を見込んでいます。' }], onset: t0, now, data });
        expect(v.kind).toBe('official');
        expect(v.expectedMinutes).toBe(90);
    });
    it('reports all-day suspension as not recovering today', () => {
        const v = recoveryView({ notices: [{ title: '大雪による列車への影響について', body: '石北線は終日運休とします。' }], onset: t0, now, data });
        expect(v.kind).toBe('all-day');
        expect(v.expectedMinutes).toBe(Infinity);
    });
    it('falls back to the empirical record with its sample size', () => {
        const v = recoveryView({ notices: [{ title: '鹿との衝突による列車への影響について', body: '一部の列車に遅れが出ています。' }], onset: t0, now, data });
        expect(v.kind).toBe('empirical');
        expect(v.elapsedMinutes).toBe(60);
        expect(v.sample!.n).toBeGreaterThanOrEqual(8);
        expect(v.detail).toContain('件');
        expect(v.detail).toContain('実績からの目安');
    });
    it('says unknown for snow without enough cases, with no invented time', () => {
        const v = recoveryView({ notices: [{ title: '大雪による列車への影響について', body: '運転を見合わせています。' }], onset: null, now, data });
        expect(v.kind).toBe('unknown');
        expect(v.expectedMinutes).toBeNull();
        expect(v.remaining).toBeNull();
    });
});

describe('advice', () => {
    const rec = (over: Partial<ReturnType<typeof recoveryView>>) => ({ ...recoveryView({ notices: [], onset: null, now, data: { all: { resumed: [], censored: [] }, byCause: {} } }), ...over });
    it('normal day: go; high risk: prepare alternatives first', () => {
        expect(advise({ disrupted: false, recovery: null, risk: 'low', hour: 9 }).action).toBe('go');
        expect(advise({ disrupted: false, recovery: null, risk: 'high', hour: 9 }).action).toBe('prepare');
        expect(advise({ disrupted: false, recovery: null, risk: 'unknown', hour: 9 }).action).toBe('check-again');
    });
    it('short official wait: stay in the station; 30–120 min: warm place nearby', () => {
        expect(advise({ disrupted: true, recovery: rec({ kind: 'official', expectedMinutes: 20 }), risk: 'low', hour: 10 }).action).toBe('wait-here');
        const nearby = advise({ disrupted: true, recovery: rec({ kind: 'official', expectedMinutes: 70 }), risk: 'low', hour: 10 });
        expect(nearby.action).toBe('wait-nearby');
        expect(nearby.emphasize[0]).toBe('cafe');
    });
    it('an empirical 30 minutes with a long tail is not a promise: do not say "wait in the station"', () => {
        const a = advise({ disrupted: true, recovery: rec({ kind: 'empirical', expectedMinutes: 30, remaining: { lower: 15, median: 30, upper: 150 } }), risk: 'low', hour: 10 });
        expect(a.action).toBe('wait-nearby');
    });
    it('tells the user how often similar cases ran past three hours', () => {
        const a = advise({ disrupted: true, recovery: rec({ kind: 'empirical', expectedMinutes: 90, remaining: { lower: 45, median: 90, upper: 200 }, sample: { n: 40, pool: 'cause', within: { m30: 0.1, h1: 0.3, h2: 0.6, h3: 0.78 } } }), risk: 'low', hour: 10 });
        expect(a.action).toBe('wait-nearby');
        expect(a.message).toContain('約2割');
        const official = advise({ disrupted: true, recovery: rec({ kind: 'official', expectedMinutes: 90 }), risk: 'low', hour: 10 });
        expect(official.message).not.toContain('割');
    });
    it('long or all-day: switch by day, secure a room late at night', () => {
        expect(advise({ disrupted: true, recovery: rec({ kind: 'empirical', expectedMinutes: 200 }), risk: 'low', hour: 13 }).action).toBe('switch');
        expect(advise({ disrupted: true, recovery: rec({ kind: 'empirical', expectedMinutes: 200 }), risk: 'low', hour: 22 }).action).toBe('stay');
        expect(advise({ disrupted: true, recovery: rec({ kind: 'all-day', expectedMinutes: Infinity }), risk: 'low', hour: 22 }).emphasize[0]).toBe('hotel');
    });
    it('unknown outlook: never tells the user to keep waiting on the platform', () => {
        const a = advise({ disrupted: true, recovery: rec({ kind: 'unknown', expectedMinutes: null }), risk: 'low', hour: 12 });
        expect(a.action).toBe('decide');
        expect(a.emphasize[0]).toBe('alternatives');
    });
    it('switches when waiting would miss the deadline', () => {
        const a = advise({ disrupted: true, recovery: rec({ kind: 'official', expectedMinutes: 60 }), risk: 'low', hour: 10, minutesToDeadline: 90, rideMinutes: 40 });
        expect(a.action).toBe('switch');
    });
});
