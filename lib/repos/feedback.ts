import { DatabaseError } from '../errors';
import { withRetry } from '../retry';
import { logger } from '../logger';
import { getAdminSupabaseClient, getSupabaseClient, DbResult, UserFeedbackDB } from './client';

// フィードバックの保存
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

// フィードバックの一覧取得（管理者用）
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

// フィードバックのステータス更新（管理者用）
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
