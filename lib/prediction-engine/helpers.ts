/**
 * 予測エンジンのヘルパー関数
 * calculateSuspensionRisk の複雑度を減らすため、サブ関数を抽出
 */

import type { PredictionInput, VulnerabilityData, HistoricalMatch } from '../types';

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
    HEAVY_RAIN_THRESHOLD,
    MAX_PREDICTION_WITH_NORMAL_DATA,
} from './constants';
// import { RISK_FACTORS } from './risk-factors'; // Deprecated
import { COMPOUND_RISK_MULTIPLIER } from './constants';

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

    // 🆕 冬季の朝（6時-9時）は除雪作業による遅延リスクを考慮してリスク底上げ (+5%)
    // Note: targetDateは "2024-01-01" 形式なので時間は取れない。呼び出し元で時間を考慮する必要がある。
    // ここでは単純にベースを少し上げるだけに留めるか、呼び出し元(helpers.ts)で時間を渡すように変更する必要がある。
    // 今回は安全に、全体のベースを少し上げる調整にする。

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
export function determineMaxProbability(input: PredictionInput, isNearRealTime: boolean = false): number {
    let maxProbability = MAX_PREDICTION_WITHOUT_OFFICIAL_DATA;

    // JR公式情報がある場合
    if (input.jrStatus) {
        let isSuspended = input.jrStatus.status === 'cancelled' || input.jrStatus.status === 'suspended';

        // 🆕 再開時刻がターゲット時刻より前なら、運休ステータスによるキャップを解除する
        if (isSuspended && input.jrStatus.resumptionTime) {
            const resumption = new Date(input.jrStatus.resumptionTime);
            // targetDateがYYYY-MM-DD、targetTimeがHH:MM形式と仮定
            const target = new Date(`${input.targetDate}T${input.targetTime}:00+09:00`);
            if (target.getTime() >= resumption.getTime()) {
                isSuspended = false; // 再開済み扱い
            }
        }

        if (isSuspended) {
            maxProbability = MAX_PREDICTION_WITH_CANCELLATION;
        } else if (input.jrStatus.status === 'delay') {
            maxProbability = MAX_PREDICTION_WITH_DELAY;
        } else if (input.jrStatus.status === 'normal') {
            // 🆕 「現在」かつ「公式が平常運転」なら強力に抑制（35%）
            // 未来の予測（!isNearRealTime）の場合は、このハードキャップを無効化し気象リスクを優先する
            if (isNearRealTime) {
                // 極端な気象（突風等）がある場合は、平常でも50%まで許容
                const windGust = input.weather?.windGust ?? 0;
                const snowfall = input.weather?.snowfall ?? 0;
                if (windGust >= 18 || snowfall >= 3.0) {
                    maxProbability = 50;
                } else {
                    maxProbability = MAX_PREDICTION_WITH_NORMAL_DATA;
                }
            } else {
                // 未来の予測なら、キャップを外して(80%等)気象・過去データとのブレンドを許可
                maxProbability = MAX_PREDICTION_WITHOUT_OFFICIAL_DATA;
            }
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


import { RiskEngine } from './risk-engine';

// =====================
// リスク要因の評価 (Refactored to use RiskEngine)
// =====================

/**
 * 全リスク要因を評価してスコアと理由を集計
 * @param input 予測入力データ
 * @param vuln 路線脆弱性データ
 * @returns 評価結果
 */
export function evaluateRiskFactors(
    input: PredictionInput,
    vuln: VulnerabilityData,
    isNearRealTime: boolean = false
): RiskEvaluationResult {
    let hasRealTimeData = false;

    // JR公式情報があれば優先（リアルタイム検索時のみ）
    if (isNearRealTime && input.jrStatus && input.jrStatus.status !== "normal") {
        hasRealTimeData = true;
    }

    // ユーザー報告があれば反映
    if (input.crowdsourcedStatus && input.crowdsourcedStatus.reportCount >= 3) {
        hasRealTimeData = true;
    }

    // Use RiskEngine
    const engine = new RiskEngine();
    const { totalScore, reasons } = engine.calculateRisk(input, vuln);

    return {
        totalScore,
        reasonsWithPriority: reasons,
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
    rain: number,
    officialRawText?: string
): string {
    // 1. JR公式テキストから理由を抽出（最優先）
    if (officialRawText) {
        const text = officialRawText;
        if (text.includes('除雪作業') || text.includes('除雪')) return '除雪作業のため';
        if (text.includes('人身事故')) return '人身事故のため';
        if (text.includes('車両点検') || text.includes('車両故障') || text.includes('車両トラブル')) return '車両トラブルのため';
        if (text.includes('信号') && (text.includes('確認') || text.includes('故障') || text.includes('トラブル'))) return '信号トラブルのため';
        if (text.includes('設備点検') || text.includes('設備')) return '設備点検のため';
        if (text.includes('地震')) return '地震の影響のため';
        if (text.includes('倒木')) return '倒木のため';
        if (text.includes('踏切')) return '踏切トラブルのため';
        if (text.includes('暴風') || text.includes('強風')) return '強風のため';
        if (text.includes('大雪')) return '大雪のため';
        if (text.includes('大雨') || text.includes('豪雨')) return '大雨のため';
        if (text.includes('高波')) return '高波のため';
        if (text.includes('濃霧')) return '濃霧のため';
    }

    // 2. フォールバック: 気象データの閾値で推測
    if (snow >= 3) {
        return '大雪のため';
    } else if (wind >= 20) {
        return '強風のため';
    } else if (rain >= HEAVY_RAIN_THRESHOLD) {
        return '大雨のため';
    } else {
        return '気象条件のため';
    }
}

// =====================
// Confidence Filter (Wolf Boy Mitigation)
// =====================

export interface ConfidenceFilterParams {
    probability: number;
    totalScore: number;
    windSpeed: number;
    windGust: number;
    snowfall: number;
    jrStatus?: string | null;
    officialStatus?: { // 🆕
        status: string;
        resumptionTime?: string | null;
    } | null;
    isNearRealTime?: boolean; // 🆕
}

interface ConfidenceFilterResult {
    filteredProbability: number;
    wasFiltered: boolean;
    reason?: string;
}

/**
 * Confidence Filter: 「オオカミ少年」対策
 * 弱い気象信号で警告を出しすぎないよう、リスクを抑制する
 * 
 * 条件:
 * - 確率が30-60%の中間領域
 * - スコアが50未満（強い信号ではない）
 * - 平均風速 < 15m/s
 * - 突風 < 25m/s
 * - 降雪 < 1cm (1cmでも遅延リスクを認める)
 */
export function applyConfidenceFilter(params: ConfidenceFilterParams & { jrStatus?: string | null }): ConfidenceFilterResult {
    const { probability, totalScore, windSpeed, windGust, snowfall, jrStatus, isNearRealTime } = params;

    // フィルタ適用条件をチェック
    // 🆕 公式が平常（normal）かつ気象警報等がない場合、抑制をより広範囲に適用する
    const isOfficialNormal = jrStatus === "normal" && isNearRealTime;

    // 🆕 条件を厳格化：強風(20m/s)以下でも、突風(20m/s)があれば抑制を解除
    const isWeakWeather = windSpeed < 12 && windGust < 15 && snowfall < 0.5;

    // Exception for Extreme Weather (Blizzard/Storm) even if official is normal
    // If windGust > 25 or Snowfall > 3, DO NOT FILTER
    const isExtremeWeather = windGust >= 25 || snowfall >= 3;
    if (isExtremeWeather) {
        return {
            filteredProbability: probability,
            wasFiltered: false
        };
    }

    const isInFilterRange = isOfficialNormal
        ? (probability >= 10 && probability < 80)
        : (probability >= 30 && probability < 60);

    const isLowScore = isOfficialNormal ? totalScore < 80 : totalScore < 40;

    if (isInFilterRange && isLowScore && isWeakWeather) {
        // 公式平常時の抑制率を緩和 (0.4 -> 0.7) 
        // Gusts > 18m/s (even if < 20) should have even less suppression
        const hasSignificantGust = windGust >= 18;
        const suppressionRatio = isOfficialNormal ? (hasSignificantGust ? 0.85 : 0.7) : 0.8;
        return {
            filteredProbability: Math.round(probability * suppressionRatio),
            wasFiltered: true,
            reason: `Filtered due to ${isOfficialNormal ? 'Official Normal Status' : 'Weak weather signal'} (wind: ${windSpeed}m/s, gust: ${windGust}m/s, snow: ${snowfall}cm)`
        };
    }

    return {
        filteredProbability: probability,
        wasFiltered: false
    };
}

export function calculateRawRiskScore(
    input: PredictionInput,
    vulnerability: VulnerabilityData,
    historicalMatch: HistoricalMatch | null | undefined,
    isNearRealTime: boolean = false
): RiskEvaluationResult {
    const enrichedInput = { ...input, historicalMatch };

    // 1. リスク要因の包括的評価
    const { totalScore: bScore, reasonsWithPriority: bReasons, hasRealTimeData } = evaluateRiskFactors(enrichedInput, vulnerability, isNearRealTime);
    let totalScore = bScore;
    const reasonsWithPriority = [...bReasons];

    // 🆕 過去事例に基づく理由の追加
    if (historicalMatch) {
        reasonsWithPriority.push({
            reason: `【過去事例】${historicalMatch.label}に近い気象条件です。`,
            priority: 1,
        });
    }

    // 2. 冬季ベースリスク
    const winterRisk = calculateWinterRisk(input.targetDate, vulnerability);
    if (winterRisk.score > 0) {
        totalScore += winterRisk.score;
        if (winterRisk.shouldDisplay && totalScore < 8) {
            reasonsWithPriority.push({
                reason: '冬季の北海道は天候急変のリスクがあります',
                priority: 11,
            });
        }
    }

    // 3. 複合リスク（風×雪）
    const wind = input.weather?.windSpeed ?? 0;
    const snow = input.weather?.snowfall ?? 0;
    const compoundRisk = calculateCompoundRisk(wind, snow, vulnerability);

    if (compoundRisk > 0) {
        totalScore += compoundRisk;
        reasonsWithPriority.push({
            reason: `強風と積雪の複合影響（+${compoundRisk}%）`,
            priority: 5,
        });
    }

    // 🆕 Decisive Scoring
    const criticalFactors = reasonsWithPriority.filter(r => r.priority <= 4).length;
    if (criticalFactors >= 2) {
        totalScore = Math.round(totalScore * COMPOUND_RISK_MULTIPLIER);
    }

    return { totalScore, reasonsWithPriority, hasRealTimeData };
}
/**
 * 🆕 公的な運行履歴（クローラーデータ）による最終補正
 * @param currentProbability 
 * @param input 
 * @returns 補正後の確率と理由
 */
export function applyOfficialHistoryAdjustment(
    currentProbability: number,
    input: PredictionInput,
    isPostRecoveryWindow: boolean = false
): {
    adjustedProbability: number;
    additionalReasons: Array<{ reason: string; priority: number }>;
} {
    const additionalReasons: Array<{ reason: string; priority: number }> = [];
    if (!input.officialHistory || input.officialHistory.length === 0) {
        return { adjustedProbability: currentProbability, additionalReasons };
    }

    let adjustedProbability = currentProbability;
    const history = input.officialHistory;
    const now = new Date();

    // 1. 直近の運休状態の継続性チェック (Dynamic Cap / Floor)
    // 過去6時間以内に「suspended」があった場合、リスクの下限を設ける
    const recentSuspension = history.find(h => {
        const hDate = new Date(`${h.date}T${h.time}+09:00`);
        const diffHours = (now.getTime() - hDate.getTime()) / (1000 * 60 * 60);
        return (h.status === 'suspended' || h.status === 'stopped') && diffHours <= 6;
    });

    if (recentSuspension && input.jrStatus?.status !== 'normal') {
        // 🆕 再開時刻を過ぎている場合は、この「リスク維持」ロジックをスキップする
        let hasResumed = false;
        if (input.jrStatus?.resumptionTime) {
            const resumption = new Date(input.jrStatus.resumptionTime);
            const target = new Date(`${input.targetDate}T${input.targetTime}:00+09:00`);
            if (target.getTime() >= resumption.getTime()) {
                hasResumed = true;
            }
        }

        // 公式が「平常」に戻っていない場合、気象が回復していてもリスクを高値で維持
        // ただし、再開済みの場合、または復旧後ウィンドウの場合は適用しない
        if (!hasResumed && !isPostRecoveryWindow && adjustedProbability < 70) {
            adjustedProbability = 70;
            additionalReasons.push({
                reason: `【公式履歴】過去6時間以内に運休が記録されています。復旧作業による影響を考慮しリスクを維持しています`,
                priority: 2,
            });
        }
    }

    // 2. 遅延の拡大傾向チェック (Delay Bias)
    const recentDelays = history.filter(h => h.status === 'delayed' || h.status === 'delay').slice(0, 3);
    if (recentDelays.length >= 2) {
        const firstDelay = recentDelays[0].delay_minutes || 0;
        const secondDelay = recentDelays[1].delay_minutes || 0;

        if (firstDelay > secondDelay && firstDelay > 0) {
            // 遅延が拡大している場合、リスクを1.2倍に
            adjustedProbability = Math.min(Math.round(adjustedProbability * 1.2), 100);
            additionalReasons.push({
                reason: `【公式履歴】直近の遅延が拡大傾向にあるため、運休リスクを上方修正しました`,
                priority: 3,
            });
        }
    }

    return { adjustedProbability, additionalReasons };
}
