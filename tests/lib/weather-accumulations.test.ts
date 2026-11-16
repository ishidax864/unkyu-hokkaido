// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { calendarDaySnowfall } from '@/lib/forecast/accumulations';

const sample = () => [
    // This amount belongs to the previous calendar day and must be excluded.
    { date: '2026-01-31', targetTime: '00:00', snowfall: 100 },
    ...Array.from({ length: 23 }, (_, i) => ({ date: '2026-01-31', targetTime: `${String(i + 1).padStart(2, '0')}:00`, snowfall: 1 })),
    // This is the last hour of Jan 31, even though its ending timestamp is Feb 1.
    { date: '2026-02-01', targetTime: '00:00', snowfall: 5 },
];

describe('Comparable daily snowfall windows', () => {
    it('uses the precipitation interval instead of the timestamp date, including at month boundaries', () => {
        expect(calendarDaySnowfall(sample(), '2026-01-31')).toBe(28);
    });
    it('does not treat a missing final hour or duplicate hour as a complete day', () => {
        expect(calendarDaySnowfall(sample().slice(0, -1), '2026-01-31')).toBeNull();
        expect(calendarDaySnowfall([...sample(), sample()[1]], '2026-01-31')).toBeNull();
    });
    it('does not replace null or invalid snow with zero', () => {
        for (const value of [null, undefined, NaN, -1]) {
            const hours: {date: string; targetTime: string; snowfall?: number | null}[] = sample();
            hours[5].snowfall = value;
            expect(calendarDaySnowfall(hours, '2026-01-31')).toBeNull();
        }
    });
    it('accepts a complete dry day and rejects an invalid civil date', () => {
        expect(calendarDaySnowfall(sample().map(hour => ({ ...hour, snowfall: 0 })), '2026-01-31')).toBe(0);
        expect(calendarDaySnowfall(sample(), '2026-02-30')).toBeNull();
    });
});
