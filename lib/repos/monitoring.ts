import { DatabaseError } from '../errors';
import { withRetry } from '../retry';
import { logger } from '../logger';
import { getAdminSupabaseClient, getSupabaseClient, DbResult, MonitoringLogDB } from './client';

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
