import { getAdminSupabaseClient } from '@/lib/repos/client';
import type { RecoveryIncident } from './recovery';

/** Read only independently reviewed incidents. Legacy recovery_time is an
 * announced estimate, not a measured resumption and must never be a label. */
export async function loadRecoveryEvidence(routeId: string, now = new Date()): Promise<{
    incidents: RecoveryIncident[]; startedAt: string | null; cause: string; available: boolean;
}> {
    const empty = { incidents: [], startedAt: null, cause: 'unknown', available: false };
    const client = getAdminSupabaseClient();
    if (!client) return empty;
    try {
        const { data, error } = await client.from('verified_recovery_incidents')
            .select('id,route_id,cause,started_at,resumed_at,verified,verified_at,storm_id')
            .eq('route_id', routeId).eq('verified', true)
            .lt('started_at', now.toISOString())
            .order('started_at', { ascending: false }).limit(500)
            .abortSignal(AbortSignal.timeout(3000));
        if (error || !data) return empty;
        // Open records need an explicit verification within the past hour; stale
        // unclosed records must not determine the onset of a later incident.
        const active = data.find(row => !row.resumed_at && now.getTime() - Date.parse(row.started_at) < 72 * 3_600_000 && row.verified_at && Date.parse(row.verified_at) <= now.getTime() && now.getTime() - Date.parse(row.verified_at) < 3_600_000);
        return { incidents: data.filter(row => row.resumed_at) as RecoveryIncident[],
            startedAt: active?.started_at || null, cause: active?.cause || 'unknown', available: true };
    } catch { return empty; }
}
