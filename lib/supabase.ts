import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError } from './errors';
import { JRStatus } from './types';
import { withRetry } from './retry';
import { calculateAccuracyScore } from './prediction-engine/scoring';
import { logger } from './logger';

// 環境変数
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 🆕 サーバーサイド専用

// データベース型定義
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
            monitoring_logs: {
                Row: MonitoringLogDB;
                Insert: Omit<MonitoringLogDB, 'id' | 'created_at'>;
                Update: Partial<Omit<MonitoringLogDB, 'id' | 'created_at'>>;
            };
            user_feedback: {
                Row: UserFeedbackDB;
                Insert: Omit<UserFeedbackDB, 'id' | 'created_at'>;
                Update: Partial<Omit<UserFeedbackDB, 'id' | 'created_at'>>;
            };
        };
    };
}

// クライアント保持用
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClient: SupabaseClient<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminSupabaseClient: SupabaseClient<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): SupabaseClient<any> | null {
    if (!supabaseUrl || !supabaseAnonKey) {
        logger.warn('Supabase credentials not configured');
        return null;
    }

    if (!supabaseClient) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseClient = createClient<any>(supabaseUrl, supabaseAnonKey, {
                auth: { persistSession: false },
            });
            logger.debug('Supabase client initialized');
        } catch (error) {
            logger.error('Failed to initialize Supabase client', { error });
            return null;
        }
    }
    return supabaseClient;
}

/**
 * 🆕 管理者用クライアント取得（SERVICE_ROLE_KEYを使用）
 * RLSをバイパスするため、サーバーサイドでのみ使用すること
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdminSupabaseClient(): SupabaseClient<any> | null {
    if (!supabaseUrl || !supabaseServiceKey) {
        // クライアントサイドや未設定時はnull
        return null;
    }

    if (!adminSupabaseClient) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            adminSupabaseClient = createClient<any>(supabaseUrl, supabaseServiceKey, {
                auth: { persistSession: false },
            });
            logger.debug('Supabase ADMIN client initialized');
        } catch (error) {
            logger.error('Failed to initialize Supabase admin client', { error });
            return null;
        }
    }
    return adminSupabaseClient;
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
    is_official_influenced?: boolean; // 🆕 クローラー等の公的情報が予測に影響を与えたか
    actual_status?: string; // 🆕 実際の運行状況（事後記録）
    accuracy_score?: number; // 🆕 予測の的中スコア (0-100)
    created_at?: string;
}

export interface UserFeedbackDB {
    id?: string;
    type: 'bug' | 'improvement' | 'other';
    content: string;
    email?: string;
    page_url?: string;
    ua_info?: string;
    ip_hash?: string;
    status?: 'open' | 'in_progress' | 'closed';
    created_at?: string;
}

// Result型（エラーハンドリング用）
export type DbResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

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
    const client = getAdminSupabaseClient() || getSupabaseClient();
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
                        is_official_influenced: prediction.is_official_influenced ?? false,
                        actual_status: prediction.actual_status,
                        accuracy_score: prediction.accuracy_score,
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
    delay_minutes?: number; // 🆕
    recovery_time?: string; // 🆕
    created_at?: string;
}

// 監視ログの保存（リトライ対応）
export async function saveMonitoringLog(log: MonitoringLogDB): Promise<DbResult<boolean>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
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
                        weather_summary: log.weather_summary,
                        delay_minutes: log.delay_minutes,
                        recovery_time: log.recovery_time
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

// 🆕 フィードバックの保存
export async function saveFeedback(feedback: UserFeedbackDB): Promise<DbResult<boolean>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        // フォールバック：DB未設定時はコンソールに出力して「成功」とする（UIを壊さないため）
        logger.warn('Supabase not configured. Feedback logged to console instead.', { feedback });
        return { success: true, data: true };
    }

    try {
        const result = await withRetry(
            async () => {
                const { error } = await client
                    .from('user_feedback')
                    .insert({
                        type: feedback.type,
                        content: feedback.content,
                        email: feedback.email,
                        page_url: feedback.page_url,
                        ua_info: feedback.ua_info,
                        ip_hash: feedback.ip_hash
                    });

                if (error) {
                    throw new DatabaseError(
                        `Failed to save feedback: ${error.message}`,
                        'write',
                        { code: error.code }
                    );
                }

                return true;
            },
            { maxRetries: 2, initialDelay: 500 }
        );

        logger.info('User feedback saved successfully', { type: feedback.type });
        return { success: true, data: result };
    } catch (error) {
        logger.error('Failed to save feedback', { error, feedback });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// 🆕 フィードバックの一覧取得（管理者用）
export async function getFeedbackList(limit: number = 50): Promise<DbResult<UserFeedbackDB[]>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await client
            .from('user_feedback')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw new DatabaseError(`Failed to fetch feedback: ${error.message}`, 'read', { code: error.code });
        }

        return { success: true, data: data || [] };
    } catch (error) {
        logger.error('Failed to fetch feedback list', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// 🆕 管理用グローバル統計
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

        // 各統計を個別に取得（一部のテーブルがスキーマキャッシュにない場合でも他を活かすため）
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

        // すべてエラーの場合は設定エラーの可能性あり
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

// 🆕 フィードバックのステータス更新（管理者用）
export async function updateFeedbackStatus(id: string, status: 'open' | 'in_progress' | 'closed'): Promise<DbResult<boolean>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await client
            .from('user_feedback')
            .update({ status })
            .eq('id', id);

        if (error) {
            throw new DatabaseError(`Failed to update feedback status: ${error.message}`, 'write', { code: error.code });
        }

        return { success: true, data: true };
    } catch (error) {
        logger.error('Failed to update feedback status', { error, id, status });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// 🆕 ユーザー報告の一覧取得（管理者用）
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
// 🆕 クローラーが取得した公的な運行履歴を取得
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

        // さらに正確な時間フィルター（created_at または date+time でフィルタリング）
        // 簡易的に返却
        return { success: true, data: data || [] };
    } catch (error) {
        logger.error('Failed to fetch official status history', { error, routeId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// 🆕 クローラーの稼働状況サマリーを取得
export async function getCrawlerStatusSummary(): Promise<DbResult<Record<string, unknown>[]>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        // 各エリアの最新のログを取得
        const { data, error } = await client
            .from('crawler_logs')
            .select('area_id, status, fetched_at, error_message')
            .order('fetched_at', { ascending: false });

        if (error) throw error;

        // エリアごとに最新の1件を抽出（SQLでDISTINCT ONが使えればベストだがJSで行う）
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

// 🆕 精度向上（公的情報の寄与）の統計を取得
export async function getAccuracyImpactStats(): Promise<DbResult<{
    total: number;
    influenced: number;
    ratio: number;
}>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 直近7日間

        const { data, error } = await client
            .from('prediction_history')
            .select('is_official_influenced')
            .gte('created_at', since);

        if (error) throw error;

        const total = data?.length || 0;
        const influenced = data?.filter(p => p.is_official_influenced === true).length || 0;

        return {
            success: true,
            data: {
                total,
                influenced,
                ratio: total > 0 ? (influenced / total) * 100 : 0
            }
        };
    } catch (error) {
        logger.error('Failed to fetch accuracy impact stats', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// 🆕 過去の予測と実績を照合してスコアリングする
export async function matchPredictionsWithActualOutcomes(): Promise<DbResult<{ processedCount: number }>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        // 1. スコアがまだついていない、かつ作成から2時間以上経過した予測を取得（実績が確定している頃合い）
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

        const { data: predictions, error: pError } = await client
            .from('prediction_history')
            .select('*')
            .is('accuracy_score', null)
            .gte('created_at', twelveHoursAgo)
            .lte('created_at', twoHoursAgo);

        if (pError) throw pError;
        if (!predictions || predictions.length === 0) return { success: true, data: { processedCount: 0 } };

        let processedCount = 0;

        for (const pred of predictions) {
            // 2. この路線の、予測時刻付近の公的ステータスを取得
            const predTime = new Date(pred.created_at);
            const dateStr = predTime.toISOString().split('T')[0];

            const { data: actuals, error: aError } = await client
                .from('route_status_history')
                .select('status')
                .eq('route_id', pred.route_id)
                .eq('date', dateStr)
                .order('time', { ascending: false });

            if (aError || !actuals || actuals.length === 0) continue;

            const actualStatus = actuals[0].status;

            // 3. スコア計算 (外部化した共有ロジックを使用)
            const score = calculateAccuracyScore(pred.probability, actualStatus as JRStatus);

            // 4. DB更新
            await client
                .from('prediction_history')
                .update({
                    actual_status: actualStatus,
                    accuracy_score: Math.min(100, Math.max(0, score))
                })
                .eq('id', pred.id);

            processedCount++;
        }

        return { success: true, data: { processedCount } };
    } catch (error) {
        logger.error('Failed to match predictions with outcomes', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// 🆕 平均的中スコアを取得
export async function getAverageAccuracyScore(): Promise<DbResult<{
    averageScore: number;
    scoredCount: number;
}>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await client
            .from('prediction_history')
            .select('accuracy_score')
            .not('accuracy_score', 'is', null)
            .gte('created_at', thirtyDaysAgo);

        if (error) throw error;

        const scores = (data || []).map(p => p.accuracy_score as number);
        const total = scores.length;
        const average = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;

        return {
            success: true,
            data: {
                averageScore: Math.round(average * 10) / 10,
                scoredCount: total
            }
        };
    } catch (error) {
        logger.error('Failed to fetch average accuracy score', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
