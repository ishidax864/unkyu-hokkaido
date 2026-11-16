export interface CollectionRun {
    started_at: string;
    finished_at: string | null;
    status: string;
}
export interface CollectionHealth {
    state: 'healthy' | 'running' | 'failed' | 'stale' | 'unknown';
    startedAt: string | null;
    finishedAt: string | null;
}

/** A successful cron dispatch is insufficient; use the collector's own completion. */
export function collectionHealth(run: CollectionRun | null, now = new Date()): CollectionHealth {
    const result = { startedAt: run?.started_at ?? null, finishedAt: run?.finished_at ?? null };
    if (!run) return { ...result, state: 'unknown' };
    const age = now.getTime() - Date.parse(run.started_at);
    if (!Number.isFinite(age) || age < 0) return { ...result, state: 'unknown' };
    if (age >= 30 * 60_000) return { ...result, state: 'stale' };
    if (run.status === 'error') return { ...result, state: 'failed' };
    if (run.status === 'running') return { ...result, state: age >= 10 * 60_000 ? 'stale' : 'running' };
    const finished = Date.parse(run.finished_at ?? '');
    if (run.status !== 'success' || !Number.isFinite(finished) || finished < Date.parse(run.started_at) || finished > now.getTime()) {
        return { ...result, state: 'unknown' };
    }
    return { ...result, state: 'healthy' };
}
