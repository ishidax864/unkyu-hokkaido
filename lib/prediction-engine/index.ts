import { PredictionResult, OperationStatus, ConfidenceLevel, PredictionInput } from '../types';
import { getJRStatusWeight, JROperationStatus } from '../jr-status';
import { logger } from '../logger';
import { CrowdsourcedStatus } from '../user-reports';
import { WeatherForecast } from '../types';
import { findHistoricalMatch } from '../historical-data/suspension-patterns';

// Refactored Modules
import {
    RISK_FACTORS,
    ROUTE_VULNERABILITY,
    DEFAULT_VULNERABILITY,
    getTimeMultiplier,
    getSeasonMultiplier
} from './risk-factors';

import {
    calculateCompoundRisk,
    calculateWinterRisk,
    determineMaxProbability,
    evaluateRiskFactors,
    applyHistoricalDataAdjustment,
    determineSuspensionReason,
    applyConfidenceFilter,
    RiskEvaluationResult
} from './helpers';

import {
    HIGH_CONFIDENCE_MIN_FACTORS,
    HIGH_CONFIDENCE_MIN_PROBABILITY,
    MEDIUM_CONFIDENCE_MIN_FACTORS,
    MEDIUM_CONFIDENCE_MIN_PROBABILITY,
    REALTIME_DATA_MIN_FACTORS,
    STATUS_CANCELLED_THRESHOLD,
    STATUS_SUSPENDED_THRESHOLD,
    STATUS_DELAYED_THRESHOLD,
    WEATHER_IMPACT_SEVERE_THRESHOLD,
    WEATHER_IMPACT_MODERATE_THRESHOLD,
    WEATHER_IMPACT_MINOR_THRESHOLD,
    MAX_DISPLAY_REASONS,
    COMPOUND_RISK_MULTIPLIER
} from './constants';

import { predictRecoveryTime, analyzeWeatherTrend } from '../recovery-prediction';
import { calculateResumptionTime } from './resumption';

// ==========================================
// Main Prediction Function
// ==========================================

function getStatusFromProbability(prob: number): OperationStatus {
    if (prob >= STATUS_CANCELLED_THRESHOLD) return '運休';
    if (prob >= STATUS_SUSPENDED_THRESHOLD) return '運転見合わせ';
    if (prob >= STATUS_DELAYED_THRESHOLD) return '遅延';
    return '平常運転';
}

function getConfidence(prob: number, factorCount: number, hasRealData: boolean): ConfidenceLevel {
    if (hasRealData && factorCount >= REALTIME_DATA_MIN_FACTORS) return 'high';
    if (factorCount >= HIGH_CONFIDENCE_MIN_FACTORS || prob >= HIGH_CONFIDENCE_MIN_PROBABILITY) return 'high';
    if (factorCount >= MEDIUM_CONFIDENCE_MIN_FACTORS || prob >= MEDIUM_CONFIDENCE_MIN_PROBABILITY) return 'medium';
    return 'low';
}

function getWeatherImpact(prob: number): '重大' | '中程度' | '軽微' | 'なし' {
    if (prob >= WEATHER_IMPACT_SEVERE_THRESHOLD) return '重大';
    if (prob >= WEATHER_IMPACT_MODERATE_THRESHOLD) return '中程度';
    if (prob >= WEATHER_IMPACT_MINOR_THRESHOLD) return '軽微';
    return 'なし';
}

// メインの予測関数（強化版）
export function calculateSuspensionRisk(input: PredictionInput): PredictionResult {
    const vulnerability = ROUTE_VULNERABILITY[input.routeId] || DEFAULT_VULNERABILITY;

    // 1. リスク要因の包括的評価
    const { totalScore: bScore, reasonsWithPriority: bReasons, hasRealTimeData } = evaluateRiskFactors(input, vulnerability, RISK_FACTORS);
    let totalScore = bScore;
    const reasonsWithPriority = [...bReasons];

    logger.debug('Risk factors evaluated', {
        routeId: input.routeId,
        score: totalScore,
        factorCount: reasonsWithPriority.length
    });

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

    // 🆕 Decisive Scoring: 危険因子が複数ある場合、乗算でリスクを跳ね上げる
    // Priority 4以下（=重要）の要因が2つ以上ある場合、全体スコアを1.5倍にする
    const criticalFactors = reasonsWithPriority.filter(r => r.priority <= 4).length;
    if (criticalFactors >= 2) {
        totalScore = Math.round(totalScore * COMPOUND_RISK_MULTIPLIER);
        logger.debug('Applied compound multiplier', { originalScore: totalScore / COMPOUND_RISK_MULTIPLIER, newScore: totalScore });
    }

    // 3.5 過去の災害事例との照合
    if (input.weather) {
        const historicalMatch = findHistoricalMatch(input.weather);
        if (historicalMatch) {
            // 過去事例に該当する場合、スコアを大幅加算
            totalScore += 20; // ほぼ確実に運休レベルへ
            reasonsWithPriority.push({
                reason: `【過去事例】${historicalMatch.label}に近い気象条件です。このケースでは${historicalMatch.consequences.typicalDurationHours}時間以上の運休が発生しました`,
                priority: 1, // 最優先
            });
        }
    }

    // 4. 時間帯・季節補正
    const timeMultiplier = getTimeMultiplier(input.targetTime);
    const seasonMultiplier = getSeasonMultiplier();
    totalScore = totalScore * timeMultiplier * seasonMultiplier;

    if (timeMultiplier > 1.0) {
        reasonsWithPriority.push({
            reason: `通勤時間帯につき遅延波及リスク上昇`,
            priority: 12,
        });
    }

    // 5. 確率計算と上限適用
    const maxProbability = determineMaxProbability(input);
    let probability = Math.min(Math.round(totalScore), maxProbability);

    // 🆕 Confidence Filter (Wolf Boy Mitigation)
    // 弱い気象信号で警告を出しすぎないよう、リスクを抑制する
    if (input.weather) {
        const filterResult = applyConfidenceFilter({
            probability,
            totalScore,
            windSpeed: input.weather.windSpeed || 0,
            windGust: input.weather.windGust || 0,
            snowfall: input.weather.snowfall || 0
        });

        if (filterResult.wasFiltered) {
            probability = filterResult.filteredProbability;
            logger.debug('Confidence Filter Applied', {
                original: totalScore,
                filtered: probability,
                reason: filterResult.reason
            });
        }
    }

    // 6. 履歴データによる補正
    if (input.historicalData) {
        const { adjustedProbability, additionalReasons } = applyHistoricalDataAdjustment(probability, maxProbability, input.historicalData);
        probability = Math.round(adjustedProbability);
        reasonsWithPriority.push(...additionalReasons);
    }

    // 7. 最終的な理由リスト作成
    let reasons = reasonsWithPriority
        .sort((a, b) => a.priority - b.priority)
        .slice(0, MAX_DISPLAY_REASONS)
        .map(r => r.reason);

    const confidence = input.weather
        ? getConfidence(probability, reasons.length, hasRealTimeData)
        : 'low';

    // 運休中かどうかを判定
    const isCurrentlySuspended = input.jrStatus != null &&
        (input.jrStatus.status === 'suspended' || input.jrStatus.status === 'cancelled');

    // 復旧予測 (運休中、または運休リスクが高い場合に「もし運休したら？」を予測)
    let estimatedRecoveryTime: string | undefined;
    let estimatedRecoveryHours: number | undefined;
    let recoveryRecommendation: string | undefined;
    let suspensionReason: string | undefined;

    if (input.weather && (isCurrentlySuspended || probability >= 40)) { // 40%以上でシミュレーション
        try {
            const weatherTrend = analyzeWeatherTrend(input.weather, []);
            const rain = input.weather.precipitation || 0;
            suspensionReason = determineSuspensionReason(wind, snow, rain);

            const recoveryPrediction = predictRecoveryTime(weatherTrend, suspensionReason || '');

            estimatedRecoveryHours = recoveryPrediction.estimatedHours;
            estimatedRecoveryTime = recoveryPrediction.estimatedTime;
            recoveryRecommendation = recoveryPrediction.recommendationMessage;


            // 🆕 New Resumption Logic (Standardized)
            if (input.weather && input.weather.surroundingHours) {
                // Filter to only consider future/current hours relative to targetTime
                // This prevents "Resumed at 11:00" when searching for "12:00"
                const futureForecasts = (input.targetTime && input.weather.surroundingHours.length > 0)
                    ? input.weather.surroundingHours.filter(h => (h.targetTime || '00:00') >= (input.targetTime || '00:00'))
                    : input.weather.surroundingHours;

                if (futureForecasts.length > 0) {
                    const resumption = calculateResumptionTime(futureForecasts, input.routeId);
                    if (resumption.estimatedResumption) {
                        estimatedRecoveryTime = resumption.estimatedResumption;
                        estimatedRecoveryHours = resumption.requiredBufferHours;
                        recoveryRecommendation = `${resumption.reason}のため、${resumption.estimatedResumption}頃の運転再開が見込まれます。`;

                        // Override existing logic
                        if (isCurrentlySuspended) {
                            reasons.unshift(`【復旧予測】${recoveryRecommendation}`);
                        }
                    }
                }
            }

            // 復旧予測理由をトップに追加（実際に運休している場合のみ）
            if (isCurrentlySuspended && !estimatedRecoveryTime) {
                const recoveryReasons = recoveryPrediction.reasoning.map((r: string) => r);
                reasons.unshift(...recoveryReasons);
            }

            // 🆕 過去事例に基づくアドバイスの上書き
            const historicalMatch = input.weather ? findHistoricalMatch(input.weather) : null;
            if (historicalMatch) {
                recoveryRecommendation = historicalMatch.consequences.advice;
                if (historicalMatch.consequences.recoveryTendency === 'next-day') {
                    estimatedRecoveryTime = '翌日朝以降';
                    estimatedRecoveryHours = 24;
                }
            }
        } catch (e) {
            logger.error('Failed to predict recovery time', { error: e });
        }
    }


    // 🆕 公式テキストフィルタリング関数
    function filterOfficialText(text: string, routeName: string): string {
        if (!text || !routeName) return text;

        // 除外対象となる他路線名リスト（簡易版）
        const otherRoutes = [
            '千歳線', '函館線', '函館本線', '学園都市線', '札沼線',
            '室蘭線', '室蘭本線', '石勝線', '根室線', '根室本線',
            '宗谷線', '宗谷本線', '石北線', '石北本線', '釧網線', '釧網本線', '富良野線', '日高線', '日高本線'
        ];

        // 自分の路線名は除外対象から外す
        // 例: routeName="函館本線" なら "函館線","函館本線" を除外リストから消す
        const targetKeywords = routeName.replace('（道南）', '').replace('（道北）', '').replace('（道東）', '').replace('（道央）', '').split('・');
        const safeOtherRoutes = otherRoutes.filter(r =>
            !targetKeywords.some(k => r.includes(k) || k.includes(r))
        );

        // 行ごとに分割してフィルタリング
        const lines = text.split(/[\n。]/).map(l => l.trim()).filter(l => l.length > 0);
        const filteredLines = lines.filter(line => {
            // 共通的な内容は残す
            if (line.includes('全区間') || line.includes('札幌圏') || line.includes('全道') || line.includes('特急')) return true;

            // 他路線名が含まれていて、かつ自路線名が含まれていない行は除外
            const hasOtherRoute = safeOtherRoutes.some(r => line.includes(r));
            const hasTargetRoute = targetKeywords.some(k => line.includes(k));

            if (hasOtherRoute && !hasTargetRoute) return false;

            return true;
        });

        return filteredLines.join('。') + (filteredLines.length > 0 ? '。' : '');
    }

    // 🆕 公式情報の解析とオーバーライド (Official Info Override)
    // 気象データに基づく予測よりも、公式の「終日運休」等の発表を絶対的に優先する
    let isOfficialOverride = false; // 🆕

    if (input.jrStatus) {
        let text = input.jrStatus.rawText || input.jrStatus.statusText || '';

        // 🆕 フィルタリング適用 (他路線の詳細情報を除外)
        text = filterOfficialText(text, input.routeName);

        // 終日運休・全区間運休パターン
        // 終日運休・全区間運休パターン
        const isAllDaySuspension =
            text.includes('終日運休') ||
            text.includes('終日運転見合わせ') ||
            text.includes('全区間運休') ||
            (text.includes('本日の運転') && text.includes('見合わせ'));

        if (isAllDaySuspension) {
            estimatedRecoveryTime = '終日運休';
            estimatedRecoveryHours = undefined; // 時間計算ではないためundefined
            recoveryRecommendation = `JR北海道公式発表: ${text}`;
            isOfficialOverride = true; // 🆕

            // 理由リストの先頭に公式情報を追加（重複しないようにチェック）
            const officialReason = `【公式発表】${text}`;

            // 既存の公式理由があれば削除して、より詳細なものを優先する
            reasons = reasons.filter(r => !r.startsWith('【公式発表】') && !r.startsWith('【運休中】'));
            reasons.unshift(officialReason);

            // 運休理由も公式情報で上書き
            suspensionReason = 'JR北海道公式発表による';
        }
    }

    if (reasons.length === 0) {
        reasons.push('現時点で運休リスクを高める要因は検出されていません');
    }

    return {
        routeId: input.routeId,
        targetDate: input.targetDate,
        probability: isCurrentlySuspended ? 100 : probability,
        status: isCurrentlySuspended ? '運休中' : getStatusFromProbability(probability),
        confidence,
        // 公式オーバーライド時は既に詳細理由が入っているため、追加のプレフィックスは不要
        reasons: (isCurrentlySuspended && !isOfficialOverride)
            ? [`【運休中】${suspensionReason || ''}運転を見合わせています`, ...reasons]
            : reasons,
        weatherImpact: getWeatherImpact(probability),
        updatedAt: new Date().toISOString(),
        mode: isCurrentlySuspended ? 'recovery' : 'risk',
        isCurrentlySuspended,
        estimatedRecoveryTime,
        estimatedRecoveryHours,
        recoveryRecommendation,
        suspensionReason,
        isOfficialOverride, // 🆕
        crowdStats: input.crowdsourcedStatus?.last30minCounts ? {
            last30minReportCount: input.crowdsourcedStatus.last30minCounts.total,
            last30minStopped: input.crowdsourcedStatus.last30minCounts.stopped,
            last30minDelayed: input.crowdsourcedStatus.last30minCounts.delayed, // 🆕
            last30minCrowded: input.crowdsourcedStatus.last30minCounts.crowded, // 🆕
            last30minResumed: input.crowdsourcedStatus.last30minCounts.resumed
        } : undefined,
        comparisonData: {
            wind,
            snow
        }
    };
}

// 週間予測を計算
export function calculateWeeklyForecast(
    routeId: string,
    routeName: string,
    weeklyWeather: WeatherForecast[],
    jrStatus?: JROperationStatus | null,
    crowdsourcedStatus?: CrowdsourcedStatus | null
): PredictionResult[] {
    const today = new Date().toISOString().split('T')[0];

    return weeklyWeather.map(weather =>
        calculateSuspensionRisk({
            routeId,
            routeName,
            targetDate: weather.date,
            targetTime: '12:00', // 週間予測は正午（標準的な活動時間）基準で計算し、閲覧時刻による変動を防ぐ
            weather,
            // 今日のみリアルタイム情報を反映
            jrStatus: weather.date === today ? jrStatus : null,
            crowdsourcedStatus: weather.date === today ? crowdsourcedStatus : null,
        })
    );
}
