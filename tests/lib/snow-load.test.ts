import { describe, it, expect } from 'vitest';
import { snowLoad, withSnowLoad, SNOW_LOAD_DEPTH_CM } from '@/lib/forecast/snow-load';
import type { WarningSnapshot } from '@/lib/jma-warnings';
import type { ObservedSnow } from '@/lib/forecast/observed-snow';

const warn = (codes: string[], available = true): WarningSnapshot => ({ available, checkedAt: '', url: '',
    alerts: codes.map(code => ({ code, name: code === '12' ? '大雪注意報' : code === '13' ? '風雪注意報' : code === '06' ? '大雪警報' : '雷注意報', area: '石狩地方', areaCode: '016010', issuedAt: '', severity: code === '06' ? 'warning' : 'advisory' })) });
const snow = (depth: number | null): ObservedSnow => ({ available: true, observedAt: '', checkedAt: '', url: '', coverage: { available: 1, total: 1 },
    points: [{ point: '札幌', station: '札幌', stationId: '14163', distanceKm: 1, snowfall24hCm: 3, snowDepthCm: depth }] });

describe('snow load overlay', () => {
    it('needs both a snow advisory/warning and deep snow on the ground', () => {
        expect(snowLoad(warn(['12']), snow(SNOW_LOAD_DEPTH_CM))?.depthCm).toBe(60);
        expect(snowLoad(warn(['12']), snow(59))).toBeNull();
        expect(snowLoad(warn(['14']), snow(100))).toBeNull(); // 雷注意報は対象外
        expect(snowLoad(warn(['06']), snow(80))?.alerts).toEqual(['大雪警報']);
    });
    it('stays silent when warnings or depth are unavailable (never guesses)', () => {
        expect(snowLoad(warn(['12'], false), snow(100))).toBeNull();
        expect(snowLoad(warn(['12']), snow(null))).toBeNull();
        expect(snowLoad(warn(['12']), null)).toBeNull();
    });
    it('raises to at least high, keeps severe, and explains why', () => {
        const load = snowLoad(warn(['12', '13']), snow(92))!;
        const r = withSnowLoad({ level: 'low', reasons: ['取得した気象予報に強い雪・風・雨の兆候はありません'] }, load);
        expect(r.level).toBe('high');
        expect(r.reasons[0]).toContain('92cm');
        expect(r.reasons).toHaveLength(1);
        expect(withSnowLoad({ level: 'severe', reasons: [] }, load).level).toBe('severe');
        expect(withSnowLoad({ level: 'low', reasons: [] }, null).level).toBe('low');
    });
});
