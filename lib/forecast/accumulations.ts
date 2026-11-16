import { addDays, japanDate } from './time';

interface SnowHour { date: string; targetTime?: string; snowfall?: number | null }

/** Open-Meteo hourly accumulation is the PRECEDING hour, timestamped at its end.
 * A JST calendar day therefore uses 01:00 .. next-day 00:00, not 00:00 .. 23:00.
 * Incomplete or duplicated hours are unknown, never a smaller daily total.
 */
export function calendarDaySnowfall(hours: SnowHour[], date: string): number | null {
    const day = new Date(`${date}T12:00:00+09:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day.getTime()) || japanDate(day) !== date) return null;
    const ends = Array.from({ length: 23 }, (_, i) => `${date}T${String(i + 1).padStart(2, '0')}:00`);
    ends.push(`${addDays(date, 1)}T00:00`);
    let total = 0;
    for (const end of ends) {
        const matches = hours.filter(hour => `${hour.date}T${hour.targetTime}` === end);
        if (matches.length !== 1) return null;
        const amount = matches[0].snowfall;
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return null;
        total += amount;
    }
    return Math.round(total * 10) / 10;
}
