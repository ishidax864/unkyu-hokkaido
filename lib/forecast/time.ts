/** All journey dates are Japan civil time, independent of the browser/server timezone. */
export function japanDate(now = new Date()): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
}

export function japanTime(now = new Date()): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(now);
}

export function addDays(date: string, days: number): string {
    return japanDate(new Date(Date.parse(`${date}T12:00:00+09:00`) + days * 86_400_000));
}

export function isForecastDate(date: unknown, now = new Date()): date is string {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T12:00:00+09:00`);
    return Number.isFinite(parsed.getTime()) && japanDate(parsed) === date &&
        date >= japanDate(now) && date <= addDays(japanDate(now), 6);
}

export function isClockTime(time: unknown): time is string {
    return typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}
