export interface CommunityReport {
    route_id: string; report_type: string; created_at: string;
    ip_hash?: string | null; comment?: string | null;
    station_id?: string | null; direction_station_id?: string | null;
}
export interface CommunitySnapshot {
    available: boolean;
    checkedAt: string;
    latestAt: string | null;
    total: number;
    counts: { stopped: number; delayed: number; normal: number; crowded: number };
    signal: 'disruption' | 'moving' | 'mixed' | 'insufficient';
    comments: { text: string; createdAt: string }[];
}
export function summarizeReports(reports: CommunityReport[], now = new Date(), location?: {stationId?: string; directionStationId?: string}): CommunitySnapshot {
    const counts = { stopped: 0, delayed: 0, normal: 0, crowded: 0 };
    const seen = new Set<string>();
    const recent = reports.filter(row => {
        if (location?.stationId && row.station_id !== location.stationId) return false;
        if (location?.directionStationId && row.direction_station_id !== location.directionStationId) return false;
        const age = now.getTime() - Date.parse(row.created_at);
        return Number.isFinite(age) && age >= 0 && age <= 15 * 60_000 && Object.hasOwn(counts, row.report_type);
    }).sort((a, b) => b.created_at.localeCompare(a.created_at)).filter(row => {
        // At most the latest report per source across the selected journey.
        // IP is a coarse anti-repeat signal, not an identity or a person count.
        if (!row.ip_hash) return true;
        if (seen.has(row.ip_hash)) return false;
        seen.add(row.ip_hash); return true;
    });
    for (const row of recent) counts[row.report_type as keyof typeof counts]++;
    const adverse = counts.stopped + counts.delayed;
    const corroborated = recent.filter(row => row.ip_hash).length >= 3;
    const signal = adverse && counts.normal ? 'mixed' : !corroborated ? 'insufficient' : adverse >= 3 ? 'disruption' : counts.normal >= 3 ? 'moving' : 'insufficient';
    return { available: true, checkedAt: now.toISOString(), latestAt: recent[0]?.created_at || null,
        total: recent.length, counts, signal,
        comments: recent.filter(r => r.comment).slice(0, 3).map(r => ({ text: r.comment!.slice(0, 200), createdAt: r.created_at })) };
}
