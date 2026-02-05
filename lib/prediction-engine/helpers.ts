/**
 * 予測エンジンのヘルパー関数
 * calculateSuspensionRisk の複雑度を減らすため、サブ関数を抽出
 */

import type { PredictionInput, RiskFactor, VulnerabilityData } from '../types';

import {
    COMPOUND_RISK_THRESHOLD,
    COMPOUND_RISK_BASE_SCORE,
    COMPOUND_RISK_BONUS_SCORE,
    MIN_WINTER_RISK,
    WINTER_RISK_COEFFICIENT,
    WINTER_START_MONTH,
    WINTER_END_MONTH,
    WINTER_MIN_DISPLAY_THRESHOLD,
    MAX_PREDICTION_WITHOUT_OFFICIAL_DATA,
    MAX_PREDICTION_WITH_CANCELLATION,
    MAX_PREDICTION_WITH_DELAY,
    MAX_PREDICTION_WITH_USER_CONSENSUS,
    HISTORICAL_DATA_WEIGHT,
    TREND_INCREASING_BONUS,
    TREND_DECREASING_PENALTY,
    USER_CONSENSUS_MIN_REPORTS,
} from './constants';

// =====================
// 型定義
// =====================


export interface RiskEvaluationResult {
    totalScore: number;
    reasonsWithPriority: Array<{ reason: string; priority: number }>;
    hasRealTimeData: boolean;
}

export interface ProbabilityCalculationResult {
    probability: number;
    maxProbability: number;
}

// =====================
// 複合リスク計算
// =====================

/**
 * 風と雪の複合効果を計算
 * @param wind 風速（m/s）
 * @param snow 積雪（cm）
 * @param vuln 路線脆弱性データ
 * @returns 複合リスクスコア
 */
export function calculateCompoundRisk(
    wind: number,
    snow: number,
    vuln: VulnerabilityData
): number {
    let compound = 0;

    // 風と雪の閾値に対する比率
    const windRatio = wind / vuln.windThreshold;
    const snowRatio = snow / vuln.snowThreshold;

    // 両方が閾値の70%以上なら複合効果発動
    if (windRatio >= COMPOUND_RISK_THRESHOLD && snowRatio >= COMPOUND_RISK_THRESHOLD) {
        compound = COMPOUND_RISK_BASE_SCORE * (windRatio * snowRatio);
    }

    // 両方が閾値超えなら大幅加算
    if (windRatio >= 1.0 && snowRatio >= 1.0) {
        compound += COMPOUND_RISK_BONUS_SCORE;
    }

    return Math.round(compound);
}

// =====================
// 冬季リスク計算
// =====================

/**
 * 冬季ベースリスクを計算（11月〜3月）
 * @param targetDate 予測対象日
 * @param vuln 路線脆弱性データ
 * @returns 冬季リスクスコアと表示フラグ
 */
export function calculateWinterRisk(
    targetDate: string,
    vuln: VulnerabilityData
): {
    score: number;
    shouldDisplay: boolean;
} {
    const month = new Date(targetDate).getMonth() + 1;
    const isWinter = month >= WINTER_START_MONTH || month <= WINTER_END_MONTH;

    if (!isWinter) {
        return { score: 0, shouldDisplay: false };
    }

    // 路線脆弱性に応じて5-10%のベースリスク
    const winterBaseRisk = MIN_WINTER_RISK + (vuln.vulnerabilityScore - 0.8) * WINTER_RISK_COEFFICIENT;
    const shouldDisplay = winterBaseRisk < WINTER_MIN_DISPLAY_THRESHOLD;

    return {
        score: winterBaseRisk,
        shouldDisplay,
    };
}

// =====================
// 確率上限の決定
// =====================

/**
 * 予測確率の上限を決定
 * JR公式情報やユーザー報告の状況に応じて上限を調整
 * @param input 予測入力データ
 * @returns 確率上限値
 */
export function determineMaxProbability(input: PredictionInput): number {
    let maxProbability = MAX_PREDICTION_WITHOUT_OFFICIAL_DATA;

    // JR公式情報がある場合
    if (input.jrStatus) {
        if (input.jrStatus.status === 'cancelled' || input.jrStatus.status === 'suspended') {
            maxProbability = MAX_PREDICTION_WITH_CANCELLATION;
        } else if (input.jrStatus.status === 'delay') {
            maxProbability = MAX_PREDICTION_WITH_DELAY;
        }
    }

    // ユーザー報告で運休コンセンサスがあれば上限緩和
    if (
        input.crowdsourcedStatus?.consensusStatus === 'stopped' &&
        input.crowdsourcedStatus.reportCount >= USER_CONSENSUS_MIN_REPORTS
    ) {
        maxProbability = Math.max(maxProbability, MAX_PREDICTION_WITH_USER_CONSENSUS);
    }

    return maxProbability;
}

// =====================
// リスク要因の評価
// =====================

/**
 * 全リスク要因を評価してスコアと理由を集計
 * @param input 予測入力データ
 * @param vuln 路線脆弱性データ
 * @param riskFactors リスク要因の配列
 * @returns 評価結果
 */
export function evaluateRiskFactors(
    input: PredictionInput,
    vuln: VulnerabilityData,
    riskFactors: RiskFactor[]
): RiskEvaluationResult {
    let totalScore = 0;
    const reasonsWithPriority: Array<{ reason: string; priority: number }> = [];
    let hasRealTimeData = false;

    // JR公式情報があれば優先
    if (input.jrStatus && input.jrStatus.status !== 'normal') {
        hasRealTimeData = true;
    }

    // ユーザー報告があれば反映
    if (input.crowdsourcedStatus && input.crowdsourcedStatus.reportCount >= 3) {
        hasRealTimeData = true;
    }

    // 各リスク要因を評価
    for (const factor of riskFactors) {
        if (factor.condition(input, vuln)) {
            const weight = factor.weight(input, vuln);
            const score = weight * vuln.vulnerabilityScore;
            totalScore += score;

            reasonsWithPriority.push({
                reason: factor.reason(input),
                priority: factor.priority,
            });
        }
    }

    return {
        totalScore,
        reasonsWithPriority,
        hasRealTimeData,
    };
}

// =====================
// 履歴データによる補正
// =====================

/**
 * 過去の運休履歴データを使って予測を補正
 * @param currentProbability 現在の予測確率
 * @param maxProbability 確率上限
 * @param historicalData 履歴データ
 * @returns 補正後の確率と追加理由
 */
export function applyHistoricalDataAdjustment(
    currentProbability: number,
    maxProbability: number,
    historicalData: PredictionInput['historicalData']
): {
    adjustedProbability: number;
    additionalReasons: Array<{ reason: string; priority: number }>;
} {
    const additionalReasons: Array<{ reason: string; priority: number }> = [];

    // 履歴データがない、または運休率が0の場合は補正なし
    if (!historicalData?.suspensionRate || historicalData.suspensionRate === 0) {
        return {
            adjustedProbability: currentProbability,
            additionalReasons,
        };
    }

    // 現在の予測スコアと履歴データを組み合わせ
    const baseWeight = 1 - HISTORICAL_DATA_WEIGHT;
    const historicalAdjustment = historicalData.suspensionRate;
    let adjustedProbability =
        currentProbability * baseWeight + historicalAdjustment * HISTORICAL_DATA_WEIGHT;

    // トレンドによる微調整
    if (historicalData.recentTrend === 'increasing') {
        // 運休が増加傾向 → 加算
        adjustedProbability = Math.min(
            Math.round(adjustedProbability + TREND_INCREASING_BONUS),
            maxProbability
        );
        additionalReasons.push({
            reason: `過去30日の傾向：運休が増加傾向（週平均${historicalData.avgSuspensionsPerWeek}件）`,
            priority: 9,
        });
    } else if (historicalData.recentTrend === 'decreasing') {
        // 運休が減少傾向 → 減算
        adjustedProbability = Math.max(
            Math.round(adjustedProbability - TREND_DECREASING_PENALTY),
            0
        );
    } else {
        // 安定傾向
        adjustedProbability = Math.round(adjustedProbability);
        if (historicalData.suspensionRate > 20) {
            additionalReasons.push({
                reason: `過去30日の運休率：${historicalData.suspensionRate.toFixed(1)}%（${historicalData.totalReports}件の報告）`,
                priority: 9,
            });
        }
    }

    return {
        adjustedProbability,
        additionalReasons,
    };
}

// =====================
// 情報鮮度による重み減衰
// =====================

/**
 * JR公式情報の更新時刻から鮮度を計算
 * @param updatedAt 更新日時（ISO 8601形式）
 * @returns 鮮度による重み（0.3〜1.0）
 */
export function getRecencyWeight(updatedAt: string | undefined): number {
    if (!updatedAt) return 0.5;

    const age = Date.now() - new Date(updatedAt).getTime();
    const minutes = age / (1000 * 60);

    if (minutes <= 5) return 1.0;
    if (minutes <= 15) return 0.9;
    if (minutes <= 30) return 0.75;
    if (minutes <= 60) return 0.5;
    return 0.3;
}

// =====================
// 運休理由の判定
// =====================

/**
 * 天候条件から運休理由を判定
 * @param wind 風速（m/s）
 * @param snow 積雪（cm）
 * @param rain 降水量（mm）
 * @returns 運休理由テキスト
 */
export function determineSuspensionReason(
    wind: number,
    snow: number,
    rain: number
): string {
    if (snow >= 3) {
        return '大雪のため';
    } else if (wind >= 20) {
        return '強風のため';
    } else if (rain >= 30) {
        return '大雨のため';
    } else {
        return '気象条件のため';
    }
}
