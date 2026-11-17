/**
 * 復旧の見通しに使う事例: リポジトリの集計(data/recovery-stats.json)に、
 * その後に収集が自動で記録した事例(verified_recovery_incidents)を足す。1時間キャッシュ。取得できなければ集計だけを使う。
 */
import { getAdminSupabaseClient } from '@/lib/supabase';
import { RECOVERY_DATA } from './recovery';
import type { CauseKind, DurationSet, RecoveryDataset } from './episodes';
import { logger } from '@/lib/logger';

interface Row { route_id: string; cause: string; started_at: string; resumed_at: string | null; resumption_source_url: string | null }

/** 同じ出来事が複数の線区に出るので、原因が同じで開始が90分以内のものは1件(最長)にまとめる */
export function mergeRows(rows: Row[]): { cause: CauseKind; minutes: number; censored: boolean }[] {
    const out: { cause: CauseKind; onset: number; minutes: number; censored: boolean }[] = [];
    for (const r of [...rows].sort((a, b) => a.started_at.localeCompare(b.started_at))) {
        const onset = Date.parse(r.started_at);
        const censoredAt = r.resumption_source_url?.startsWith('censored:off-hours:') ? Date.parse(r.resumption_source_url.slice('censored:off-hours:'.length)) : NaN;
        const end = r.resumed_at ? Date.parse(r.resumed_at) : censoredAt;
        if (!Number.isFinite(onset) || !Number.isFinite(end) || end <= onset) continue;
        const minutes = Math.round((end - onset) / 60_000), censored = !r.resumed_at;
        const same = out.find(i => i.cause === r.cause && Math.abs(i.onset - onset) <= 90 * 60_000);
        if (same) { if (minutes > same.minutes) { same.minutes = minutes; same.censored = censored; } }
        else out.push({ cause: r.cause as CauseKind, onset, minutes, censored });
    }
    return out;
}

export function extend(base: RecoveryDataset, added: { cause: CauseKind; minutes: number; censored: boolean }[]): RecoveryDataset {
    const copy = (d?: DurationSet): DurationSet => ({ resumed: [...(d?.resumed ?? [])], censored: [...(d?.censored ?? [])] });
    const data: RecoveryDataset = { all: copy(base.all), byCause: Object.fromEntries(Object.entries(base.byCause).map(([k, v]) => [k, copy(v)])) };
    for (const a of added) {
        const set = (data.byCause[a.cause] ??= copy());
        (a.censored ? set.censored : set.resumed).push(a.minutes);
        (a.censored ? data.all.censored : data.all.resumed).push(a.minutes);
    }
    return data;
}

let cache: { expires: number; value: Promise<RecoveryDataset> } | null = null;

export async function loadRecoveryDataset(): Promise<RecoveryDataset> {
    if (cache && cache.expires > Date.now()) return cache.value;
    const value = (async () => {
        const client = getAdminSupabaseClient();
        if (!client) return RECOVERY_DATA;
        const { data, error } = await client.from('verified_recovery_incidents')
            .select('route_id,cause,started_at,resumed_at,resumption_source_url')
            .gt('started_at', RECOVERY_DATA.period.to).order('started_at').limit(2000);
        if (error || !data) { logger.warn('Recovery incidents unavailable', { error: error?.message }); return RECOVERY_DATA; }
        return extend(RECOVERY_DATA, mergeRows(data as Row[]));
    })().catch(() => RECOVERY_DATA);
    cache = { expires: Date.now() + 3_600_000, value };
    return value;
}
