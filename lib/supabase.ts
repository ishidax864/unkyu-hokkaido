/**
 * lib/supabase.ts — Re-export barrel
 *
 * 元々887行の God Object だったファイルを、ドメインごとに6つの Repository に分割。
 * 後方互換性のため、既存のインポートは一切変更不要。
 *
 * 分割先:
 *   - repos/client.ts      — クライアント管理、型定義、DbResult
 *   - repos/reports.ts     — ユーザー報告 (save, get, stats, list, historical)
 *   - repos/predictions.ts — 予測履歴 (save, accuracy)
 *   - repos/monitoring.ts  — 監視ログ (save)
 *   - repos/feedback.ts    — フィードバック (save, list, update)
 *   - repos/admin.ts       — 管理統計 (global stats, crawler, ML training, official history)
 */

// ─── 共通インフラ ───
export {
    getSupabaseClient,
    getAdminSupabaseClient,
    isSupabaseAvailable,
} from './repos/client';

export type {
    Database,
    UserReportDB,
    PredictionHistoryDB,
    UserFeedbackDB,
    MonitoringLogDB,
    DbResult,
} from './repos/client';

// ─── ユーザー報告 ───
export {
    saveReportToSupabase,
    getRecentReports,
    getHistoricalSuspensionRate,
    getReportStats,
    getReportsList,
} from './repos/reports';

// ─── 予測履歴 ───
export {
    savePredictionHistory,
    getAccuracyImpactStats,
    getAverageAccuracyScore,
} from './repos/predictions';

// ─── 監視ログ ───
export { saveMonitoringLog } from './repos/monitoring';

// ─── フィードバック ───
export {
    saveFeedback,
    getFeedbackList,
    updateFeedbackStatus,
} from './repos/feedback';

// ─── 管理統計 ───
export {
    getGlobalStats,
    getOfficialRouteHistory,
    getCrawlerStatusSummary,
    getMLTrainingStats,
} from './repos/admin';
