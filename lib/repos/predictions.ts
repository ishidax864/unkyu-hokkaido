import { DatabaseError } from '../errors';
import { withRetry } from '../retry';
import { logger } from '../logger';
import { getAdminSupabaseClient, getSupabaseClient, DbResult, PredictionHistoryDB } from './client';

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

// 精度向上（公的情報の寄与）の統計を取得（管理者用）
export async function getAccuracyImpactStats(): Promise<DbResult<{
    total: number;
    influenced: number;
    ratio: number;
}>> {
    const client = getAdminSupabaseClient() || getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await client
            .from('prediction_history')
            .select('is_official_influenced')
            .gte('created_at', since);

        if (error) throw error;

        const total = data?.length || 0;
        const influenced = data?.filter(p => p.is_official_influenced === true).length || 0;

        return {
            success: true,
            data: { total, influenced, ratio: total > 0 ? (influenced / total) * 100 : 0 }
        };
    } catch (error) {
        logger.error('Failed to fetch accuracy impact stats', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// 平均的中スコアを取得（管理者用）
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
            data: { averageScore: Math.round(average * 10) / 10, scoredCount: total }
        };
    } catch (error) {
        logger.error('Failed to fetch average accuracy score', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
