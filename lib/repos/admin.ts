import { DatabaseError } from '../errors';
import { logger } from '../logger';
import { getAdminSupabaseClient, getSupabaseClient, DbResult } from './client';

// 管理用グローバル統計
export async function getGlobalStats(): Promise<DbResult<{
    reportCount: number;
    recentReportCount: number;
    feedbackCount: number;
    partnerCount: number;
}>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const stats = {
            reportCount: 0,
            recentReportCount: 0,
            feedbackCount: 0,
            partnerCount: 0
        };

        const [rRes, rrRes, fRes, pRes] = await Promise.all([
            client.from('user_reports').select('*', { count: 'exact', head: true }),
            client.from('user_reports').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
            client.from('user_feedback').select('*', { count: 'exact', head: true }).eq('status', 'open'),
            client.from('partners').select('*', { count: 'exact', head: true })
        ]);

        if (!rRes.error) stats.reportCount = rRes.count || 0;
        if (!rrRes.error) stats.recentReportCount = rrRes.count || 0;
        if (!fRes.error) stats.feedbackCount = fRes.count || 0;
        if (!pRes.error) stats.partnerCount = pRes.count || 0;

        if (rRes.error && rrRes.error && fRes.error && pRes.error) {
            logger.error('All global stats queries failed', { rErr: rRes.error, fErr: fRes.error });
            throw new DatabaseError('Failed to fetch global stats', 'read');
        }

        return {
            success: true,
            data: stats
        };
    } catch (error) {
        logger.error('Failed to calculate global stats', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// クローラーが取得した公的な運行履歴を取得
export async function getOfficialRouteHistory(
    routeId: string,
    hoursBack: number = 24
): Promise<DbResult<Record<string, unknown>[]>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
        const dateStr = since.split('T')[0];

        const { data, error } = await client
            .from('route_status_history')
            .select('*')
            .eq('route_id', routeId)
            .gte('date', dateStr)
            .order('date', { ascending: false })
            .order('time', { ascending: false })
            .limit(50);

        if (error) {
            throw new DatabaseError(
                `Failed to fetch official status history: ${error.message}`,
                'read',
                { code: error.code }
            );
        }

        return { success: true, data: data || [] };
    } catch (error) {
        logger.error('Failed to fetch official status history', { error, routeId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

export async function getCrawlerStatusSummary(): Promise<DbResult<Record<string, unknown>[]>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        const { data, error } = await client
            .from('crawler_logs')
            .select('area_id, status, fetched_at, error_message')
            .order('fetched_at', { ascending: false });

        if (error) throw error;

        // エリアごとに最新の1件を抽出
        const latestPerArea = new Map();
        (data || []).forEach(log => {
            if (!latestPerArea.has(log.area_id)) {
                latestPerArea.set(log.area_id, log);
            }
        });

        return { success: true, data: Array.from(latestPerArea.values()) };
    } catch (error) {
        logger.error('Failed to fetch crawler status summary', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// ML Training Dataの統計情報を取得（管理者用）
export async function getMLTrainingStats(): Promise<DbResult<{
    totalRows: number;
    todayRows: number;
    statusBreakdown: { normal: number; delayed: number; suspended: number };
    latestWeather: { area_id: string; temperature: number | null; wind_speed: number | null; snowfall: number | null; snow_depth: number | null; recorded_at: string } | null;
    estimatedStorageMB: number;
    oldestRecord: string | null;
}>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalRes, todayRes, statusRes, latestRes, oldestRes] = await Promise.all([
            client.from('ml_training_data').select('id', { count: 'exact', head: true }),
            client.from('ml_training_data').select('id', { count: 'exact', head: true })
                .gte('recorded_at', todayStart.toISOString()),
            client.from('ml_training_data').select('train_status'),
            client.from('ml_training_data')
                .select('area_id, temperature, wind_speed, snowfall, snow_depth, recorded_at')
                .order('recorded_at', { ascending: false })
                .limit(1)
                .single(),
            client.from('ml_training_data')
                .select('recorded_at')
                .order('recorded_at', { ascending: true })
                .limit(1)
                .single(),
        ]);

        const totalRows = totalRes.count || 0;
        const todayRows = todayRes.count || 0;

        const statuses = statusRes.data || [];
        const statusBreakdown = {
            normal: statuses.filter(s => s.train_status === 'normal').length,
            delayed: statuses.filter(s => s.train_status === 'delayed').length,
            suspended: statuses.filter(s => s.train_status === 'suspended').length,
        };

        return {
            success: true,
            data: {
                totalRows,
                todayRows,
                statusBreakdown,
                latestWeather: latestRes.data || null,
                estimatedStorageMB: Math.round(totalRows * 0.2 / 1024 * 100) / 100,
                oldestRecord: oldestRes.data?.recorded_at || null,
            }
        };
    } catch (error) {
        logger.error('Failed to fetch ML training stats', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
