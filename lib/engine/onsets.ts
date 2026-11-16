/**
 * いま続いている運休・大幅な遅れが「いつから」かを、15分ごとの保存フィード(crawler_logs)から求める。
 * 取得できなければ空(経過時間は不明として扱う)。5分キャッシュ。
 */
import { getAdminSupabaseClient } from '@/lib/supabase';
import { seriesFromLogs, episodesOfUnit } from './episodes';
import type { UnitId } from '@/lib/registry/units';
import { logger } from '@/lib/logger';

let cache: { expires: number; value: Promise<Map<UnitId, number>> } | null = null;

export async function getCurrentOnsets(now = new Date()): Promise<Map<UnitId, number>> {
    if (process.env.JR_FEED_FIXTURE && process.env.NODE_ENV !== 'production') {
        // 画面確認用: 差し込んだフィードの運休は「50分前から」とする
        const { STATUS_UNITS, unitId } = await import('@/lib/registry/units');
        return new Map(STATUS_UNITS.map(u => [unitId(u), now.getTime() - 50 * 60_000]));
    }
    if (cache && cache.expires > Date.now()) return cache.value;
    const value = (async () => {
        const onsets = new Map<UnitId, number>();
        const client = getAdminSupabaseClient();
        if (!client) return onsets;
        const since = new Date(now.getTime() - 30 * 3_600_000).toISOString();
        const { data, error } = await client.from('crawler_logs').select('fetched_at,area_id,raw_json')
            .gte('fetched_at', since).in('area_id', ['01', '02', '03', '04', '05']).not('raw_json', 'is', null).order('fetched_at').limit(1000);
        if (error || !data) { logger.warn('Onset lookup unavailable', { error: error?.message }); return onsets; }
        for (const [unit, series] of seriesFromLogs(data)) {
            const last = episodesOfUnit(unit, series).at(-1);
            // まだ続いていて、開始を15分刻みで観測できたものだけ。最後の観測が古ければ使わない
            if (last && last.outcome === 'open' && last.onsetKnown && now.getTime() - last.end <= 45 * 60_000) onsets.set(unit, last.onset);
        }
        return onsets;
    })().catch(e => { logger.warn('Onset lookup failed', { error: String(e) }); return new Map<UnitId, number>(); });
    cache = { expires: Date.now() + 300_000, value };
    return value;
}
