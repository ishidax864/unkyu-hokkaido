import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError } from './errors';
import { withRetry } from './retry';
import { logger } from './logger';

// 環境変数
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// データベース型定義（将来的にSupabase CLIで自動生成可能）
export interface Database {
    public: {
        Tables: {
            user_reports: {
                Row: UserReportDB;
                Insert: Omit<UserReportDB, 'id' | 'created_at'>;
                Update: Partial<Omit<UserReportDB, 'id' | 'created_at'>>;
            };
            prediction_history: {
                Row: PredictionHistoryDB;
                Insert: Omit<PredictionHistoryDB, 'id' | 'created_at'>;
                Update: Partial<Omit<PredictionHistoryDB, 'id' | 'created_at'>>;
            };
        };
    };
}

// クライアント生成（遅延初期化、型付きクライアント）
let supabaseClient: SupabaseClient<any> | null = null;

export function getSupabaseClient(): SupabaseClient<any> | null {
    if (!supabaseUrl || !supabaseAnonKey) {
        logger.warn('Supabase credentials not configured');
        return null;
    }

    if (!supabaseClient) {
        try {
            supabaseClient = createClient<any>(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: false,
                },
            });
            logger.debug('Supabase client initialized');
        } catch (error) {
            logger.error('Failed to initialize Supabase client', { error });
            return null;
        }
    }

    return supabaseClient;
}

// Supabaseが利用可能かチェック
export function isSupabaseAvailable(): boolean {
    return !!(supabaseUrl && supabaseAnonKey);
}

// 外部公開用の型定義
export interface UserReportDB {
    id?: string;
    route_id: string;
    report_type: 'stopped' | 'delayed' | 'crowded' | 'normal';
    comment?: string;
    created_at?: string;
    ip_hash?: string;
}

export interface PredictionHistoryDB {
    id?: string;
    route_id: string;
    route_name: string;
    probability: number;
    status: string;
    weather_factors: string[];
    created_at?: string;
}

// Result型（エラーハンドリング用）
export type DbResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

// ユーザー報告の保存（リトライ対応）
export async function saveReportToSupabase(report: UserReportDB): Promise<DbResult<boolean>> {
    const client = getSupabaseClient();
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
                        // スパム防止エラーは再試行しない
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
    const client = getSupabaseClient();
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

// 🆕 過去30日の運休頻度を取得（履歴分析）
export async function getHistoricalSuspensionRate(
    routeId: string,
    daysBack: number = 30
): Promise<DbResult<{
    totalReports: number;
    suspensionRate: number;
    avgSuspensionsPerWeek: number;
    recentTrend: 'increasing' | 'decreasing' | 'stable';
}>> {
    const client = getSupabaseClient();
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

                // 運休報告数をカウント
                const suspendedReports = data.filter((r) => r.report_type === 'stopped').length;
                const suspensionRate = (suspendedReports / data.length) * 100;
                const avgSuspensionsPerWeek = (suspendedReports / daysBack) * 7;

                // トレンド分析：前半と後半を比較
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

// 予測履歴の保存（リトライ対応）
export async function savePredictionHistory(prediction: PredictionHistoryDB): Promise<DbResult<boolean>> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const result = await withRetry(
            async () => {
                const { error } = await client
                    .from('prediction_history')
                    .insert({
                        route_id: prediction.route_id,
                        route_name: prediction.route_name,
                        probability: prediction.probability,
                        status: prediction.status,
                        weather_factors: prediction.weather_factors,
                    });

                if (error) {
                    throw new DatabaseError(
                        `Failed to save prediction history: ${error.message}`,
                        'write',
                        { code: error.code }
                    );
                }

                return true;
            },
            { maxRetries: 2, initialDelay: 500 }
        );

        logger.debug('Prediction history saved', { routeId: prediction.route_id });
        return { success: true, data: result };
    } catch (error) {
        logger.error('Failed to save prediction history', { error, prediction });
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
    const client = getSupabaseClient();
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

// 🆕 監視ログ（AI vs 実績）
export interface MonitoringLogDB {
    id?: string;
    route_id: string;
    route_name: string;
    predicted_status: string;
    predicted_probability: number;
    actual_status: string;
    actual_status_text?: string;
    is_match: boolean;
    weather_summary?: string; // e.g. "Wind: 15m/s, Snow: 0cm"
    created_at?: string;
}

// 監視ログの保存（リトライ対応）
export async function saveMonitoringLog(log: MonitoringLogDB): Promise<DbResult<boolean>> {
    const client = getSupabaseClient();
    if (!client) {
        // Fallback to console if no DB
        logger.info('[MONITORING] (No DB) ' + JSON.stringify(log));
        return { success: true, data: true };
    }

    try {
        const result = await withRetry(
            async () => {
                const { error } = await client
                    .from('monitoring_logs')
                    .insert({
                        route_id: log.route_id,
                        route_name: log.route_name,
                        predicted_status: log.predicted_status,
                        predicted_probability: log.predicted_probability,
                        actual_status: log.actual_status,
                        actual_status_text: log.actual_status_text,
                        is_match: log.is_match,
                        weather_summary: log.weather_summary
                    });

                if (error) {
                    // Table might not exist yet, log warning and return success to not block API
                    if (error.code === '42P01') { // undefined_table
                        logger.warn('Monitoring table missing', { error });
                        return true;
                    }
                    throw new DatabaseError(
                        `Failed to save monitoring log: ${error.message}`,
                        'write',
                        { code: error.code }
                    );
                }

                return true;
            },
            { maxRetries: 1, initialDelay: 500 }
        );

        logger.info('Monitoring log saved', { routeId: log.route_id, match: log.is_match });
        return { success: true, data: result };
    } catch (error) {
        logger.error('Failed to save monitoring log', { error, log });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
