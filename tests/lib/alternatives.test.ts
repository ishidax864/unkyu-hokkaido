import { describe, it, expect } from 'vitest';
import { findAlternatives } from '@/lib/engine/alternatives';
import { CORRIDORS, STAYS, SUBWAY } from '@/data/alternatives/catalog';
import { getStationById } from '@/lib/hokkaido-data';
import { LINE_BY_SLUG } from '@/lib/registry/lines';

const now = new Date('2026-11-17T03:00:00Z');

describe('alternatives catalog', () => {
    it('references only existing stations and lines, with https links', () => {
        for (const c of CORRIDORS) {
            for (const h of c.hubs) expect(getStationById(h), h).toBeTruthy();
            for (const o of c.options) expect(o.url.startsWith('http')).toBe(true);
        }
        for (const id of Object.keys(STAYS)) expect(getStationById(id), id).toBeTruthy();
        for (const s of SUBWAY) for (const l of s.lineSlugs) expect(LINE_BY_SLUG.has(l)).toBe(true);
    });
    it('lists no-reservation options before reservation-required ones', () => {
        for (const c of CORRIDORS) {
            const firstRequired = c.options.findIndex(o => o.reservation === 'required');
            if (firstRequired >= 0) expect(c.options.slice(firstRequired).some(o => o.reservation === 'none')).toBe(false);
        }
    });
});

describe('findAlternatives', () => {
    it('Sapporo ↔ Asahikawa in either direction gives the highway bus', () => {
        expect(findAlternatives('sapporo', 'asahikawa', ['doo-hakodate-chitose'], now).options[0].name).toContain('あさひかわ');
        const back = findAlternatives('asahikawa', 'sapporo', ['doo-hakodate-chitose'], now);
        expect(back.options[0].name).toContain('あさひかわ');
        expect(back.stays?.station).toBe('旭川'); // いまいる駅の近く
    });
    it('airport journeys get the airport bus and a place to stay where the traveller is', () => {
        const v = findAlternatives('shin-chitose-airport', 'sapporo', ['airport'], now);
        expect(v.corridor).toContain('新千歳空港');
        expect(v.stays?.places.some(p => p.name.includes('温泉'))).toBe(true);
    });
    it('inside Sapporo offers the parallel subway line', () => {
        const v = findAlternatives('sapporo', 'ainosato-kyoiku-dai', ['gakuen-toshi'], now);
        expect(v.options.some(o => o.mode === 'subway' && o.name.includes('南北線'))).toBe(true);
    });
    it('does not invent options for corridors it does not know', () => {
        const v = findAlternatives('obihiro', 'kushiro', ['nemuro'], now);
        expect(v.options).toEqual([]);
        expect(v.stays?.station).toBe('帯広');
    });
    it('hides timetable-derived numbers after the winter timetable change', () => {
        expect(findAlternatives('sapporo', 'otaru', [], now).timesValid).toBe(true);
        expect(findAlternatives('sapporo', 'otaru', [], new Date('2026-12-11T03:00:00Z')).timesValid).toBe(false);
    });
});
