import { getAdminSupabaseClient } from '@/lib/repos/client';
import { collectionHealth } from '@/lib/collection-health';

/** Read only the collector's own run log. Monitoring never collects training
 * rows or labels an absent bulletin as normal service. */
export async function readCollectionHealth() {
    const client = getAdminSupabaseClient();
    if (!client) return collectionHealth(null);
    try {
        const {data,error}=await client.from('rail_collection_runs').select('started_at,finished_at,status')
            .order('started_at',{ascending:false}).limit(1).abortSignal(AbortSignal.timeout(4000)).maybeSingle();
        return collectionHealth(error ? null : data);
    } catch { return collectionHealth(null); }
}
