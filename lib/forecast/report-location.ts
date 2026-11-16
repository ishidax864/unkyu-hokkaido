import { getStationById } from '@/lib/hokkaido-data';

export function validReportLocation(routeId: string, stationId: unknown, directionStationId: unknown): boolean {
    const valid = (value: unknown) => value == null || value === '' ||
        (typeof value === 'string' && !!getStationById(value)?.lines.includes(routeId));
    return valid(stationId) && valid(directionStationId) && !(stationId && stationId === directionStationId);
}
