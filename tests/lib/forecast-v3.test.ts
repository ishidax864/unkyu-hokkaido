import { describe, expect, it, vi, afterEach } from 'vitest';
import { addDays, isClockTime, isForecastDate, japanDate, japanTime } from '@/lib/forecast/time';
import { assessWeather } from '@/lib/forecast/risk';
import { hourFeatures, probability, levelOf, featureVector, FEATURE_NAMES, MODEL } from '@/lib/forecast/core';
import { estimateRecovery, officialRecoveryTime, type RecoveryIncident } from '@/lib/forecast/recovery';
import { summarizeReports } from '@/lib/forecast/community';
import { classifyOfficialObservation, hasExplicitAreaAllClear } from '@/lib/official-observation';
import type { WeatherForecast } from '@/lib/types';

const now = new Date('2026-01-15T03:00:00Z');
const calm: WeatherForecast = { date: '2026-01-15', targetTime: '12:00', weather: '晴れ', temperature: -5, tempMin: -5, tempMax: -5,
    windSpeed: 3, windGust: 5, snowfall: 0, snowDepth: 0.6, precipitation: 0, warnings: [] };
const point = (hours = [calm]) => ({ point: { name: '札幌', lat: 43, lon: 141 }, hours, fetchedAt: now.toISOString() });

afterEach(() => vi.useRealTimers());
describe('Japan civil time and forecast boundaries', () => {
    it('crosses UTC midnight using the Japan date', () => { expect(japanDate(new Date('2026-01-15T16:00:00Z'))).toBe('2026-01-16'); expect(japanTime(new Date('2026-01-15T15:00:00Z'))).toBe('00:00'); });
    it.each(['25:00','12:60','9:00','00:99','',null])('rejects invalid clock %s', value => expect(isClockTime(value)).toBe(false));
    it('only allows today and the following six days', () => { expect(isForecastDate('2026-01-21', now)).toBe(true); expect(isForecastDate('2026-01-22', now)).toBe(false); expect(isForecastDate('2026-01-14', now)).toBe(false); });
    it('rejects invalid calendar dates and handles year boundaries', () => { expect(isForecastDate('2026-02-30', new Date('2026-02-28T00:00:00Z'))).toBe(false); expect(addDays('2026-12-31', 1)).toBe('2027-01-01'); });
});
/** 2026-01-14 13:00 〜 2026-01-15 12:00 の連続24時間(静穏)。override で一部の時刻を書き換える。 */
const day = (override: (h: WeatherForecast, i: number) => Partial<WeatherForecast> = () => ({})) => Array.from({ length: 24 }, (_, i) => {
    const t = new Date(Date.parse('2026-01-14T13:00:00+09:00') + i * 3_600_000 + 9 * 3_600_000).toISOString();
    const h: WeatherForecast = { ...calm, date: t.slice(0, 10), targetTime: t.slice(11, 16) };
    return { ...h, ...override(h, i) };
});
const pAt = (hours: WeatherForecast[]) => probability(hourFeatures(hours, calm.date, '12:00')!);

describe('Weather risk core is time-specific and conservative with missing input', () => {
    it('does not treat accumulated snow depth as new snowfall', () => {
        expect(pAt(day(() => ({ snowDepth: 1.5 })))).toBe(pAt(day()));
        expect(pAt(day((_, i) => i === 23 ? { snowfall: 5, precipitation: 7 } : {}))).toBeGreaterThan(pAt(day()));
    });
    it('does not match a different day at the same hour', () => expect(assessWeather([point(day())], 1, '2026-01-16', '12:00').level).toBe('unknown'));
    it('does not call missing point coverage low risk', () => { const result = assessWeather([point(day())], 2, calm.date, '12:30'); expect(result.level).toBe('unknown'); expect(result.score).toBeNull(); });
    it('evaluates each point coherently, rather than synthesizing maxima from different points', () => {
        const rainy = day((_, i) => i === 23 ? { precipitation: 8 } : {});
        const snowy = day((_, i) => i >= 18 ? { snowfall: 1, precipitation: 1.4 } : {});
        const both = assessWeather([{ ...point(rainy), point: { name: '雨', lat: 43, lon: 141 } }, { ...point(snowy), point: { name: '雪', lat: 43.1, lon: 141 } }], 2, calm.date, '12:00');
        const expected = Math.max(pAt(rainy), pAt(snowy));
        expect(both.score).toBe(Math.round(expected * 100));
        expect(both.location).toBe(pAt(rainy) >= pAt(snowy) ? '雨' : '雪');
    });
    it('never lowers risk when snow, rain or wind increases (all weights are non-negative)', () => {
        for (const name of FEATURE_NAMES) expect(MODEL.weights[name]).toBeGreaterThanOrEqual(0);
        for (let v = 0; v < 30; v++) {
            expect(pAt(day((_, i) => i === 23 ? { snowfall: v + 1, precipitation: (v + 1) / 0.7 } : {})))
                .toBeGreaterThanOrEqual(pAt(day((_, i) => i === 23 ? { snowfall: v, precipitation: v / 0.7 } : {})));
            expect(pAt(day(() => ({ windSpeed: v + 1, windGust: v + 6 })))).toBeGreaterThanOrEqual(pAt(day(() => ({ windSpeed: v, windGust: v + 5 }))));
        }
    });
    it('includes prior-night snowfall, excluding future snow', () => {
        const priorNight = day((_, i) => i < 12 ? { snowfall: 3, precipitation: 4.3 } : {});
        expect(hourFeatures(priorNight, calm.date, '12:00')!.snow24).toBeCloseTo(36);
        expect(pAt(priorNight)).toBeGreaterThan(pAt(day()));
        const future = [...day(), { ...calm, targetTime: '13:00', snowfall: 100, precipitation: 140 }];
        expect(pAt(future)).toBe(pAt(day()));
    });
    it('treats a missing or duplicated hour as incomplete, and winter incompleteness as unknown unless already high', () => {
        const gap = day().filter((_, i) => i !== 5);
        expect(hourFeatures(gap, calm.date, '12:00')!.complete24).toBe(false);
        const dup = [...day(), day()[3]];
        expect(hourFeatures(dup, calm.date, '12:00')!.complete24).toBe(false);
        expect(assessWeather([point(gap)], 1, calm.date, '12:00').level).toBe('unknown');
        expect(assessWeather([point(day())], 1, calm.date, '12:00').level).toBe('low');
    });
    it('raises a strong-gust forecast to at least watch, independently of the fitted weights', () => {
        const gust = assessWeather([point(day((_, i) => i === 23 ? { windSpeed: 15, windGust: 26 } : {}))], 1, calm.date, '12:00');
        expect(gust.level).toBe('watch');
        expect(gust.reasons[0]).toContain('26.0 m/s');
        expect(assessWeather([point(day((_, i) => i === 23 ? { windSpeed: 12, windGust: 24 } : {}))], 1, calm.date, '12:00').level).toBe('low');
    });
    it('maps probability to levels with ordered thresholds', () => {
        const t = MODEL.thresholds;
        expect(t.watch).toBeLessThan(t.high);
        expect(t.high).toBeLessThan(t.severe);
        expect(levelOf(0)).toBe('low');
        expect(levelOf(t.severe)).toBe('severe');
        expect(Object.keys(featureVector(hourFeatures(day(), calm.date, '12:00')!)).sort()).toEqual([...FEATURE_NAMES].sort());
    });
});
describe('Official observations must distinguish intent from actual resumption', () => {
    it('regression: an actual legacy normal-labelled bulletin was still suspended', () => expect(classifyOfficialObservation('根室線で運転を見合わせています。運転再開見込みは9時30分頃を予定しています。')).toBe('suspended'));
    it('keeps the current stoppage when the next sentence announces tomorrow’s reopening', () => expect(classifyOfficialObservation('千歳線で運転を見合わせています。明日13時に再開予定です。')).toBe('suspended'));
    it('does not manufacture normal from an empty or unmatched bulletin', () => { expect(classifyOfficialObservation('')).toBe('unknown'); expect(classifyOfficialObservation('ご利用ありがとうございます')).toBe('unknown'); expect(hasExplicitAreaAllClear('')).toBe(false); });
    it('recognizes explicit all-clear while rejecting contradictory bulletins', () => { expect(hasExplicitAreaAllClear('現在、遅れに関する情報はありません。')).toBe(true); expect(hasExplicitAreaAllClear('現在、遅れに関する情報はありません。一部運休')).toBe(false); });
    it('keeps plans and mixed-section resumption unknown', () => { expect(classifyOfficialObservation('明日は千歳線を運休します')).toBe('unknown'); expect(classifyOfficialObservation('一部列車を運休しています。小樽方面は再開しました')).toBe('unknown'); });
    it('extracts announced times and rejects completed/past/ambiguous times', () => {
        expect(officialRecoveryTime('13時30分頃に運転再開を見込んでいます', now)).toBe('2026-01-15T04:30:00.000Z');
        expect(officialRecoveryTime('運転再開見込みは13時30分頃を予定しています。', now)).toBe('2026-01-15T04:30:00.000Z');
        expect(officialRecoveryTime('13時30分に運転再開しました', now)).toBeNull();
        expect(officialRecoveryTime('11時30分頃に運転再開を見込んでいます', now)).toBeNull();
        expect(officialRecoveryTime('明日13時30分頃に運転再開を見込んでいます', now)).toBe('2026-01-16T04:30:00.000Z');
        expect(officialRecoveryTime('1月16日13時30分頃に運転再開を見込んでいます', now)).toBe('2026-01-16T04:30:00.000Z');
        expect(officialRecoveryTime('13時頃に運転再開を予定していました。現在、再開の見通しは立っていません。', now)).toBeNull();
        expect(officialRecoveryTime('13時に再開予定。別区間は14時に再開予定。', now)).toBeNull();
    });
});
describe('Recovery evidence and remaining duration', () => {
    const base = { disrupted: true, officialText: '運転を見合わせています', routeId: 'line', cause: 'snow', incidents: [], now };
    const events: RecoveryIncident[] = Array.from({ length: 6 }, (_, i) => ({ id: `${i}`, storm_id: `storm-${i}`, route_id: 'line', cause: 'snow',
        started_at: `2026-01-0${i+1}T00:00:00Z`, resumed_at: `2026-01-0${i+1}T0${i+2}:00:00Z`, verified: true }));
    it('prioritizes all-day announcements over historical averages', () => expect(estimateRecovery({ ...base, officialText: '本日は終日運休します', incidents: events }).kind).toBe('all-day'));
    it('does not turn a future all-day cancellation into today’s state', () => {
        for (const future of ['明日','1月16日']) expect(estimateRecovery({ ...base, officialText: `現在運転を見合わせています。${future}は終日運休します。` }).kind).toBe('unknown');
    });
    it('uses official estimates ahead of model estimates', () => expect(estimateRecovery({ ...base, officialExpectedAt: '2026-01-15T04:00:00Z', incidents: events }).kind).toBe('official'));
    it('refuses to invent an onset from the fetch timestamp', () => expect(estimateRecovery({ ...base, incidents: events }).kind).toBe('unknown'));
    it('requires enough verified independent outcomes', () => { expect(estimateRecovery({ ...base, startedAt: '2026-01-15T02:00:00Z', incidents: events.slice(0, 4) }).kind).toBe('unknown'); expect(estimateRecovery({ ...base, startedAt: '2026-01-15T02:00:00Z', incidents: events.map(e => ({ ...e, verified: false })) }).kind).toBe('unknown'); });
    it('conditions the estimate on elapsed outage time', () => { const result = estimateRecovery({ ...base, startedAt: '2026-01-15T02:00:00Z', incidents: events }); expect(result.kind).toBe('historical'); expect(result.remainingMinutes).toEqual({ lower: 120, upper: 300 }); expect(result.sampleCount).toBe(6); });
    it('does not turn six segments from one storm into six independent samples', () => {
        expect(estimateRecovery({ ...base, startedAt: '2026-01-15T02:00:00Z', incidents: events.map(e => ({ ...e, storm_id: 'one-storm' })) })).toMatchObject({ kind: 'unknown', sampleCount: 1 });
        expect(estimateRecovery({ ...base, startedAt: '2026-01-15T02:00:00Z', incidents: events.map(e => ({ ...e, storm_id: null })) }).kind).toBe('unknown');
    });
    it('excludes duplicate/future/other-route outcomes', () => {
        const invalid = events.flatMap(e => [ { ...e, route_id: 'other' }, { ...e, resumed_at: '2027-01-01T00:00:00Z' } ]);
        expect(estimateRecovery({ ...base, startedAt: '2026-01-15T02:00:00Z', incidents: [events[0], events[0], ...invalid] }).kind).toBe('unknown');
    });
});
describe('Community observations', () => {
    const report = { route_id: 'line', report_type: 'stopped', created_at: '2026-01-15T02:59:00Z', ip_hash: 'a' };
    it('does not treat absence as normal', () => expect(summarizeReports([], now).signal).toBe('insufficient'));
    it('counts one latest report per sender and ignores future/expired entries', () => {
        const result = summarizeReports([report,report,{...report,ip_hash:'b',created_at:'2026-01-15T02:40:00Z'},{...report,ip_hash:'c',created_at:'2026-01-15T04:00:00Z'}],now);
        expect(result.total).toBe(1); expect(result.signal).toBe('insufficient');
    });
    it('corroborates three sources and displays contradictory reports as mixed', () => {
        const reports = ['a','b','c'].map(ip_hash => ({...report,ip_hash}));
        expect(summarizeReports(reports,now).signal).toBe('disruption');
        expect(summarizeReports([...reports,{...report,ip_hash:'d',report_type:'normal'}],now).signal).toBe('mixed');
    });
    it('does not expose source hashes', () => expect(JSON.stringify(summarizeReports([report],now))).not.toContain('ip_hash'));
});
