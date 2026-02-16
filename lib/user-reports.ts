// ユーザー報告関連の型定義と集計ロジック
// Supabase統合版

import {
    isSupabaseAvailable,
    saveReportToSupabase,
    getRecentReports,
    getReportStats,
    type UserReportDB
} from './supabase';
import { logger } from './logger';

// 報告タイプ
export type ReportType = 'stopped' | 'delayed' | 'crowded' | 'normal' | 'resumed';

// ユーザー報告インターフェース
export interface UserReport {
    id: string;
    routeId: string;
    reportType: ReportType;
    comment?: string;
    createdAt: string;
    expiresAt: string;
    upvotes: number;
}

// リアルタイム路線状況（ユーザー報告を集計）
export interface CrowdsourcedStatus {
    routeId: string;
    reportCount: number;
    stoppedReports: number;
    delayedReports: number;
    normalReports: number;
    consensusStatus: 'stopped' | 'delayed' | 'normal' | 'unknown';
    lastReportAt: string;
    trendingComments: string[];
    source: 'supabase' | 'localStorage';
    last15minCounts?: {
        stopped: number;
        delayed: number;
        crowded: number;
        resumed: number;
        total: number;
    };
}

// 代替手段の型定義
export interface AlternativeRouteLog {
    id: string;
    originalRouteId: string;
    selectedAlternative: AlternativeType;
    timestamp: string;
    affiliateClicked?: boolean;
    affiliateProvider?: string;
}

export type AlternativeType =
    | { type: 'train'; routeId: string; routeName: string }
    | { type: 'taxi'; provider: 'go' | 'didi' | 'uber' }
    | { type: 'bus'; routeId?: string }
    | { type: 'bicycle'; provider: 'docomo' | 'hello' }
    | { type: 'walk' }
    | { type: 'wait' };

// アフィリエイト設定
export interface AffiliateProvider {
    id: string;
    name: string;
    type: 'taxi' | 'bicycle' | 'hotel' | 'cafe';
    logoUrl: string;
    deepLink: string;
    webUrl: string;
    affiliateTag: string;
    enabled: boolean;
}

// PR表記用の定数
export const PR_LABEL = "PR";

// Note: Affiliate link arrays (TAXI_AFFILIATES, etc.) have been moved to lib/affiliates.ts
const REPORTS_STORAGE_KEY = 'unkyu-ai-user-reports';

// 簡易的なIPハッシュ生成（プライバシー保護）
function generateIpHash(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
}

// ID生成
function generateReportId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ユーザー報告を保存（API経由）
export async function saveUserReport(report: Omit<UserReport, 'id' | 'expiresAt' | 'upvotes'>): Promise<UserReport> {
    const newReport: UserReport = {
        ...report,
        id: generateReportId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        upvotes: 0,
    };

    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                routeId: report.routeId,
                reportType: report.reportType,
                comment: report.comment
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to submit report via API');
        }

        // 成功したらローカルにもキャッシュとして保存
        saveToLocalStorage(newReport);
        return newReport;
    } catch (error) {
        logger.error('Report API submission failed, falling back to LocalStorage', { error });
        // フォールバック: ローカルストレージに保存
        saveToLocalStorage(newReport);
        return newReport;
    }
}

// ローカルストレージへの保存
function saveToLocalStorage(report: UserReport): void {
    if (typeof window === 'undefined') return;

    try {
        const existing = getLocalStorageReports();
        existing.push(report);
        localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(existing));
    } catch (error) {
        logger.error('LocalStorage save error:', error);
    }
}

// ローカルストレージから報告を取得
function getLocalStorageReports(): UserReport[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
        if (!stored) return [];

        const reports: UserReport[] = JSON.parse(stored);
        const now = new Date().toISOString();

        // 期限切れの報告を除外
        const validReports = reports.filter(r => r.expiresAt > now);

        // クリーンアップ
        if (validReports.length !== reports.length) {
            localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(validReports));
        }

        return validReports;
    } catch {
        return [];
    }
}

// 路線ごとのクラウドソーシング状況を集計
export async function aggregateCrowdsourcedStatusAsync(routeId: string): Promise<CrowdsourcedStatus> {
    // Supabaseから取得を試行
    if (isSupabaseAvailable()) {
        const statsResult = await getReportStats(routeId);
        if (statsResult.success && statsResult.data.total > 0) {
            const reportsResult = await getRecentReports(routeId, 2);
            if (reportsResult.success) {
                return buildCrowdsourcedStatus(routeId, statsResult.data, reportsResult.data, 'supabase');
            }
        }
    }

    // フォールバック: ローカルストレージ
    return aggregateCrowdsourcedStatus(routeId);
}

// 同期版（ローカルストレージのみ）
export function aggregateCrowdsourcedStatus(routeId: string): CrowdsourcedStatus {
    const reports = getLocalStorageReports().filter(r => r.routeId === routeId);

    const stats = {
        total: reports.length,
        stopped: reports.filter(r => r.reportType === 'stopped').length,
        delayed: reports.filter(r => r.reportType === 'delayed').length,
        normal: reports.filter(r => r.reportType === 'normal' || r.reportType === 'resumed').length,
    };

    // コンセンサス判定
    const consensusStatus = determineConsensus(stats);

    // 人気コメント抽出
    const trendingComments = reports
        .filter(r => r.comment)
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, 3)
        .map(r => r.comment!);

    return {
        routeId,
        reportCount: reports.length,
        stoppedReports: stats.stopped,
        delayedReports: stats.delayed,
        normalReports: stats.normal,
        consensusStatus,
        lastReportAt: reports.length > 0
            ? reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt
            : '',
        trendingComments,
        source: 'localStorage',
        last15minCounts: getRecentCounts(reports, 15),
    };
}

// 直近N分の集計
function getRecentCounts(reports: UserReport[], minutes: number) {
    const now = new Date();
    const since = new Date(now.getTime() - minutes * 60 * 1000).toISOString();
    const recent = reports.filter(r => r.createdAt >= since);
    return {
        stopped: recent.filter(r => r.reportType === 'stopped').length,
        delayed: recent.filter(r => r.reportType === 'delayed').length,
        crowded: recent.filter(r => r.reportType === 'crowded').length,
        resumed: recent.filter(r => r.reportType === 'resumed' || r.reportType === 'normal').length,
        total: recent.length
    };
}

// Supabase統計からCrowdsourcedStatusを構築
function buildCrowdsourcedStatus(
    routeId: string,
    stats: { total: number; stopped: number; delayed: number; normal: number },
    reports: UserReportDB[],
    source: 'supabase' | 'localStorage'
): CrowdsourcedStatus {
    return {
        routeId,
        reportCount: stats.total,
        stoppedReports: stats.stopped,
        delayedReports: stats.delayed,
        normalReports: stats.normal,
        consensusStatus: determineConsensus(stats),
        lastReportAt: reports[0]?.created_at || '',
        trendingComments: reports
            .filter(r => r.comment)
            .slice(0, 3)
            .map(r => r.comment!),
        source,
        last15minCounts: getRecentCountsDB(reports, 15),
    };
}

// DB用直近N分集計
function getRecentCountsDB(reports: UserReportDB[], minutes: number) {
    const now = new Date();
    const since = new Date(now.getTime() - minutes * 60 * 1000).toISOString();
    const recent = reports.filter(r => r.created_at! >= since);

    return {
        stopped: recent.filter(r => r.report_type === 'stopped').length,
        delayed: recent.filter(r => r.report_type === 'delayed').length,
        crowded: recent.filter(r => r.report_type === 'crowded').length,
        resumed: recent.filter(r => r.report_type === 'normal').length, // DB has 'normal' mapping for resumed usually
        total: recent.length
    };
}

// コンセンサス判定ロジック
function determineConsensus(stats: { total: number; stopped: number; delayed: number; normal: number }): 'stopped' | 'delayed' | 'normal' | 'unknown' {
    if (stats.total < 3) return 'unknown';

    if (stats.stopped >= stats.total * 0.5) return 'stopped';
    if (stats.delayed >= stats.total * 0.4) return 'delayed';
    if (stats.normal >= stats.total * 0.6) return 'normal';

    return 'unknown';
}

// 報告数に基づく信頼度を計算
export function getReportConfidenceBoost(status: CrowdsourcedStatus): number {
    if (status.reportCount >= 10) return 0.2;
    if (status.reportCount >= 5) return 0.1;
    if (status.reportCount >= 3) return 0.05;
    return 0;
}

// ローカルストレージをクリア（テスト用）
export function clearLocalReports(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(REPORTS_STORAGE_KEY);
    }
}
