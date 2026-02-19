import { describe, it, expect } from 'vitest';
import { extractNumericalStatus, ROUTE_DEFINITIONS } from '../../lib/jr-status';

describe('JR Status Parser - Numerical Extraction', () => {
    it('should extract delay minutes correctly from various patterns', () => {
        expect(extractNumericalStatus('30分程度の遅れ').delayMinutes).toBe(30);
        expect(extractNumericalStatus('約45分の遅延').delayMinutes).toBe(45);
        expect(extractNumericalStatus('１５分遅れ').delayMinutes).toBe(15); // 全角
        expect(extractNumericalStatus('線路点検の影響で、一部の列車に120分以上の遅れが出ています。').delayMinutes).toBe(120);
    });

    it('should extract recovery time correctly', () => {
        expect(extractNumericalStatus('20時30分頃に運転再開を見込んでいます').recoveryTime).toBe('20:30');
        expect(extractNumericalStatus('現在は9時00分頃の再開を予定。').recoveryTime).toBe('09:00');
        expect(extractNumericalStatus('１８時００分頃再開見込み').recoveryTime).toBe('18:00'); // 全角
    });

    it('should return empty object for text with no numerical status', () => {
        const result = extractNumericalStatus('平常通り運転しています。');
        expect(result.delayMinutes).toBeUndefined();
        expect(result.recoveryTime).toBeUndefined();
    });
});

describe('JR Status Parser - Route Identification', () => {
    it('should have unique route IDs for all definitions', () => {
        const ids = ROUTE_DEFINITIONS.map(r => r.routeId);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should define valid areas for all routes', () => {
        ROUTE_DEFINITIONS.forEach(route => {
            expect(route.validAreas).toBeDefined();
            expect(route.validAreas?.length).toBeGreaterThan(0);
        });
    });

    it('should include correct keywords for major routes', () => {
        const chitose = ROUTE_DEFINITIONS.find(r => r.routeId === 'jr-hokkaido.chitose');
        expect(chitose?.keywords).toContain('千歳線');
        expect(chitose?.keywords).toContain('新千歳空港');

        const hakodateMain = ROUTE_DEFINITIONS.find(r => r.routeId === 'jr-hokkaido.hakodate-main');
        expect(hakodateMain?.keywords).toContain('函館線');
        expect(hakodateMain?.keywords).toContain('小樽');
    });
});
