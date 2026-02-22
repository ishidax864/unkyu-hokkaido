import { DatabaseError } from '../errors';
import { withRetry } from '../retry';
import { logger } from '../logger';
import { getAdminSupabaseClient, getSupabaseClient, DbResult, UserReportDB } from './client';

// ユーザー報告の保存（リトライ対応）
export async function saveReportToSupabase(report: UserReportDB): Promise<DbResult<boolean>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const result = await withRetry(
            async () => {
                const { error } = await client
                    .from('user_reports')
                    .insert({
                        route_id: report.route_id,
                        report_type: report.report_type,
                        comment: report.comment,
                        ip_hash: report.ip_hash,
                    });

                if (error) {
                    throw new DatabaseError(
                        `Failed to insert user report: ${error.message}`,
                        'write',
                        { code: error.code, details: error.details }
                    );
                }

                return true;
            },
            {
                maxRetries: 2,
                initialDelay: 500,
                shouldRetry: (error) => {
                    if (error instanceof DatabaseError) {
                        if (error.message.includes('Too many reports')) {
                            return false;
                        }
                        return true;
                    }
                    return false;
                },
            }
        );

        logger.info('User report saved successfully', { routeId: report.route_id });
        return { success: true, data: result };
    } catch (error) {
        logger.error('Failed to save user report', { error, report });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// 最近のユーザー報告を取得（リトライ対応）
export async function getRecentReports(
    routeId: string,
    hoursBack: number = 2
): Promise<DbResult<UserReportDB[]>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const result = await withRetry(
            async () => {
                const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

                const { data, error } = await client
                    .from('user_reports')
                    .select('*')
                    .eq('route_id', routeId)
                    .gte('created_at', since)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) {
                    throw new DatabaseError(
                        `Failed to fetch user reports: ${error.message}`,
                        'read',
                        { code: error.code }
                    );
                }

                return data || [];
            },
            { maxRetries: 2, initialDelay: 300 }
        );

        logger.debug('User reports fetched successfully', { routeId, count: result.length });
        return { success: true, data: result };
    } catch (error) {
        logger.error('Failed to fetch user reports', { error, routeId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// 過去30日の運休頻度を取得（履歴分析）
export async function getHistoricalSuspensionRate(
    routeId: string,
    daysBack: number = 30
): Promise<DbResult<{
    totalReports: number;
    suspensionRate: number;
    avgSuspensionsPerWeek: number;
    recentTrend: 'increasing' | 'decreasing' | 'stable';
}>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const result = await withRetry(
            async () => {
                const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

                const { data, error } = await client
                    .from('user_reports')
                    .select('report_type, created_at')
                    .eq('route_id', routeId)
                    .gte('created_at', since)
                    .order('created_at', { ascending: true });

                if (error) {
                    throw new DatabaseError(
                        `Failed to fetch historical data: ${error.message}`,
                        'read',
                        { code: error.code }
                    );
                }

                if (!data || data.length === 0) {
                    return {
                        totalReports: 0,
                        suspensionRate: 0,
                        avgSuspensionsPerWeek: 0,
                        recentTrend: 'stable' as const,
                    };
                }

                const suspendedReports = data.filter((r) => r.report_type === 'stopped').length;
                const suspensionRate = (suspendedReports / data.length) * 100;
                const avgSuspensionsPerWeek = (suspendedReports / daysBack) * 7;

                const midpoint = Math.floor(data.length / 2);
                const firstHalf = data.slice(0, midpoint);
                const secondHalf = data.slice(midpoint);

                const firstHalfRate =
                    firstHalf.filter((r) => r.report_type === 'stopped').length / firstHalf.length;
                const secondHalfRate =
                    secondHalf.filter((r) => r.report_type === 'stopped').length / secondHalf.length;

                let recentTrend: 'increasing' | 'decreasing' | 'stable';
                if (secondHalfRate > firstHalfRate * 1.2) {
                    recentTrend = 'increasing';
                } else if (secondHalfRate < firstHalfRate * 0.8) {
                    recentTrend = 'decreasing';
                } else {
                    recentTrend = 'stable';
                }

                return {
                    totalReports: data.length,
                    suspensionRate: Math.round(suspensionRate * 10) / 10,
                    avgSuspensionsPerWeek: Math.round(avgSuspensionsPerWeek * 10) / 10,
                    recentTrend,
                };
            },
            { maxRetries: 2, initialDelay: 300 }
        );

        logger.debug('Historical suspension rate calculated', { routeId, ...result });
        return { success: true, data: result };
    } catch (error) {
        logger.error('Failed to calculate historical suspension rate', { error, routeId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// 集計: 路線別報告数（リトライ対応）
export async function getReportStats(routeId: string): Promise<DbResult<{
    total: number;
    stopped: number;
    delayed: number;
    normal: number;
}>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const result = await withRetry(
            async () => {
                const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

                const { data, error } = await client
                    .from('user_reports')
                    .select('report_type')
                    .eq('route_id', routeId)
                    .gte('created_at', since);

                if (error) {
                    throw new DatabaseError(
                        `Failed to fetch report stats: ${error.message}`,
                        'read',
                        { code: error.code }
                    );
                }

                const stats = {
                    total: data?.length || 0,
                    stopped: 0,
                    delayed: 0,
                    normal: 0,
                };

                data?.forEach((row) => {
                    if (row.report_type === 'stopped') stats.stopped++;
                    else if (row.report_type === 'delayed') stats.delayed++;
                    else if (row.report_type === 'normal') stats.normal++;
                });

                return stats;
            },
            { maxRetries: 2, initialDelay: 300 }
        );

        logger.debug('Report stats fetched', { routeId, ...result });
        return { success: true, data: result };
    } catch (error) {
        logger.error('Failed to fetch report stats', { error, routeId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }

}

// ユーザー報告の一覧取得（管理者用）
export async function getReportsList(limit: number = 50): Promise<DbResult<UserReportDB[]>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await client
            .from('user_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw new DatabaseError(`Failed to fetch reports: ${error.message}`, 'read', { code: error.code });
        }

        return { success: true, data: data || [] };
    } catch (error) {
        logger.error('Failed to fetch reports list', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
