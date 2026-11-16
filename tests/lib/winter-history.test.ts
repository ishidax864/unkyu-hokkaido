// @vitest-environment node
import { describe, expect, it } from 'vitest';
import catalog from '@/data/historical/winter-events.json';
import { exactRecoveryHours, winterCaseReferences, winterCatalogSummary } from '@/lib/forecast/historical';

describe('Winter evidence, not fabricated training labels', () => {
    it('keeps planned resumptions and rescue trains out of duration labels and references', () => {
        const excluded = catalog.events.filter(e => e.outcome === 'planned' || e.serviceLevel === 'rescue');
        const references = winterCaseReferences(catalog.events.map(e => e.routeId));
        expect(excluded.length).toBe(7);
        for (const event of excluded) {
            expect(exactRecoveryHours(event)).toBeNull();
            expect(references.find(item => item.id === event.id)).toBeUndefined();
        }
    });
    it('retains an imprecise afternoon as imprecise instead of manufacturing an hour', () => {
        const event = catalog.events.find(e => e.id === '20251214-engaru-abashiri')!;
        expect(event.resumptionLabel).toBe('午後 再開');
        expect(exactRecoveryHours(event)).toBeNull();
    });
    it('uses the actual restart column instead of the abandoned plan for the airport line', () => {
        const event = catalog.events.find(e => e.id === '20220206-airport')!;
        expect(event.resumedAt).toBe('2022-02-09T06:00:00+09:00');
        expect(exactRecoveryHours(event)).toBe(66);
        expect(event.serviceLevel).toBe('limited');
    });
    it('does not confuse five correlated segments with five independent snowstorms', () => {
        expect(winterCatalogSummary()).toMatchObject({ storms:5, exactDurationRows:7, exactDurationStorms:2, actualSegmentReopenings:16 });
    });
    it('does not expose post-event reports as information known at prediction time', () => {
        expect(winterCaseReferences(['jr-hokkaido.chitose'], new Date('2022-02-07T00:00:00Z'))).toEqual([]);
        expect(winterCaseReferences(['jr-hokkaido.chitose'], new Date('2022-07-01T00:00:00Z')).length).toBeGreaterThan(0);
    });
    it('has unique records and traceable official sources, with no inferred normal days', () => {
        expect(new Set(catalog.events.map(e=>e.id)).size).toBe(catalog.events.length);
        for(const event of catalog.events) {
            const source=catalog.sources.find(s=>s.id===event.sourceId)!;
            expect(['www.jrhokkaido.co.jp', 'www.mlit.go.jp']).toContain(new URL(source.url).hostname);
            expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
            expect(event.sourcePage).toBeGreaterThan(0);
            expect(event.startDate).toMatch(/^\d{4}-(12|01|02|03)-/);
        }
    });
});
