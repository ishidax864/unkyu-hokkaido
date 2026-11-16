// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseJMAWarnings, getJourneyWarnings, clearJMACache } from '@/lib/jma-warnings';
import { selectObservedSnow, withObservedSnow } from '@/lib/forecast/observed-snow';
import { withCurrentWarnings, assessWeather } from '@/lib/forecast/risk';
import type { RiskAssessment } from '@/lib/forecast/types';
const now = new Date('2026-01-25T03:30:00Z');
const doc = (code: string, status = '発表', at = '2026-01-25T12:00:00+09:00') => ({ reportDatetime: at,
    warning: { class10Items: [{areaCode:'016010',kinds:[{code,status}]}] } });
const low: RiskAssessment = { level:'low',score:0,reasons:[],location:'札幌',weather:null,coverage:{available:1,total:1} };
const point = {name:'札幌',lat:43.06,lon:141.3283};
afterEach(() => {vi.useRealTimers(); vi.unstubAllGlobals();clearJMACache();});
describe('Actual JMA r8 warning schema', () => {
    it('reads codes without nonexistent name fields and retains separate hazard documents', () => {
        expect(parseJMAWarnings([doc('06'),doc('05')],now)?.map(a=>a.name)).toEqual(['大雪警報','暴風警報']);
        expect(parseJMAWarnings([doc('36')],now)?.[0].severity).toBe('emergency');
    });
    it('ignores released hazards even when their last announcement is old', () => {
        expect(parseJMAWarnings([doc('06','解除','2025-12-01T00:00:00+09:00'),doc('12')],now)).toHaveLength(1);
    });
    it('does not call a legacy response, malformed document, stale active alert or unknown code clear', () => {
        for(const value of [{areaTypes:[]},[],[doc('99')],[doc('06','発表','2025-12-01T00:00:00+09:00')],[doc('06','発表','2027-01-01T00:00:00+09:00')]]) expect(parseJMAWarnings(value,now)).toBeNull();
    });
    it('requires every relevant office and coalesces concurrent requests', async () => {
        vi.useFakeTimers();vi.setSystemTime(now);
        const fetcher = vi.fn(async (url:string) => url.includes('015000') ? new Response('',{status:503}) : new Response(JSON.stringify([doc('06')])));
        vi.stubGlobal('fetch',fetcher);
        const [a,b]=await Promise.all([getJourneyWarnings(['jr-hokkaido.chitose']),getJourneyWarnings(['jr-hokkaido.sassho'])]);
        expect(a.available).toBe(false);expect(a.alerts).toHaveLength(1);expect(b.available).toBe(true);
        expect(fetcher.mock.calls.filter(([url])=>url.includes('016000'))).toHaveLength(1);
        expect(fetcher.mock.calls.every(([url])=>url.includes('/data/r8/'))).toBe(true);
    });
    it('raises a low near-term forecast when warnings exist but never leaks current warnings to tomorrow', () => {
        const snapshot={available:true,checkedAt:now.toISOString(),alerts:parseJMAWarnings([doc('06')],now)!,url:''};
        expect(withCurrentWarnings(low,snapshot,now.getTime(),now).level).toBe('severe');
        expect(withCurrentWarnings(low,snapshot,now.getTime()+86400_000,now)).toEqual(low);
        expect(withCurrentWarnings(low,{...snapshot,available:false,alerts:[]},now.getTime(),now).level).toBe('unknown');
    });
});
describe('Observed snow is distinct from the forecast', () => {
    it('accepts only complete quality-zero measurements nearby, not snow depth', () => {
        const raw={'14163':{snow24h:[48,0],snow:[100,0]}};
        expect(selectObservedSnow(raw,'2026-01-25T12:00:00+09:00',[point],now)).toMatchObject({available:true,points:[{station:'札幌',snowfall24hCm:48}]});
        for(const row of [{snow24h:[48,1]},{snow24h:[null,0]},{snow24h:[-1,0]},{snow:[100,0]}]) expect(selectObservedSnow({'14163':row},'2026-01-25T12:00:00+09:00',[point],now).available).toBe(false);
        expect(selectObservedSnow(raw,'2026-01-25T10:00:00+09:00',[point],now).available).toBe(false);
        expect(selectObservedSnow(raw,'2026-01-25T12:00:00+09:00',[{...point,lat:45}],now).available).toBe(false);
    });
    it('does not report low risk after 48cm of observed snow, without pretending to validate a forecast', () => {
        const snow=selectObservedSnow({'14163':{snow24h:[48,0]}},'2026-01-25T12:00:00+09:00',[point],now);
        expect(withObservedSnow(low,snow,now.getTime(),now).level).toBe('severe');
        expect(withObservedSnow(low,snow,now.getTime()+86400_000,now)).toEqual(low);
        expect(withObservedSnow(low,{...snow,points:[],available:false},now.getTime(),now).level).toBe('unknown');
    });
    it('incomplete winter accumulation cannot reassure; duplicate hours cannot amplify snowfall', () => {
        const calm={date:'2026-01-25',targetTime:'12:00',weather:'晴れ',tempMax:0,tempMin:0,precipitation:0,windSpeed:0,snowfall:0,warnings:[]};
        expect(assessWeather([{point,hours:[calm],fetchedAt:now.toISOString()}],1,calm.date,'12:00').level).toBe('unknown');
        const snow={...calm,snowfall:2};
        expect(assessWeather([{point,hours:Array(24).fill(snow),fetchedAt:now.toISOString()}],1,calm.date,'12:00').level).toBe('unknown');
    });
});
