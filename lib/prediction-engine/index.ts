import { PredictionResult, ConfidenceLevel, PredictionInput } from '../types';
import { logger } from '../logger';
import { CrowdsourcedStatus } from '../user-reports';
import { JROperationStatus } from '../jr-status';
import { WeatherForecast } from '../types';
import { findHistoricalMatch, HistoricalPattern } from '../historical-data/suspension-patterns';

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
    applyConfidenceFilter
} from './helpers';

import {
    getStatusFromProbability,
    getConfidence,
    getWeatherImpact,
    filterOfficialText
} from './formatters';

import {
    MAX_DISPLAY_REASONS,
    COMPOUND_RISK_MULTIPLIER
} from './constants';

import { analyzeWeatherTrend } from '../recovery-prediction';
import { calculateResumptionTime, matchTendencyToText } from './resumption';

// ==========================================
// Main Prediction Function
// ==========================================

// メインの予測関数（強化版）
export function calculateSuspensionRisk(input: PredictionInput): PredictionResult {
    const vulnerability = ROUTE_VULNERABILITY[input.routeId] || DEFAULT_VULNERABILITY;

    // 0. 過去事例の事前抽出 (Early matching for dependency injections)
    const historicalMatch = input.weather ? findHistoricalMatch(input.weather) : null;
    const enrichedInput = { ...input, historicalMatch };

    // 1. リスク要因の包括的評価
    const { totalScore: bScore, reasonsWithPriority: bReasons, hasRealTimeData } = evaluateRiskFactors(enrichedInput, vulnerability, RISK_FACTORS);
    let totalScore = bScore;
    const reasonsWithPriority = [...bReasons];

    // 🆕 過去事例に基づく理由の追加（evaluateRiskFactors内でカバーされない広範な理由）
    if (historicalMatch) {
        reasonsWithPriority.push({
            reason: `【過去事例】${historicalMatch.label}に近い気象条件です。`,
            priority: 1,
        });
    }

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




            // 🆕 Unified Resumption Logic
            if (input.weather && input.weather.surroundingHours) {
                const futureForecasts = (input.targetTime && input.weather.surroundingHours.length > 0)
                    ? input.weather.surroundingHours.filter(h => (h.targetTime || '00:00') >= (input.targetTime || '00:00'))
                    : input.weather.surroundingHours;

                if (futureForecasts.length > 0) {
                    // 全体予報の中からピーク気象を特定して過去事例にマッチさせる
                    const peakSnow = Math.max(...input.weather.surroundingHours.map(h => h.snowfall || 0));
                    const peakWind = Math.max(...input.weather.surroundingHours.map(h => h.windSpeed || 0));
                    const peakGust = Math.max(...input.weather.surroundingHours.map(h => h.windGust || 0));
                    const repWeather = input.weather.surroundingHours.find(h => (h.snowfall || 0) === peakSnow) || input.weather;

                    const matchForResumption = findHistoricalMatch({
                        ...repWeather,
                        windSpeed: peakWind,
                        windGust: peakGust
                    });

                    let eventStartHour = 6;
                    if (input.jrStatus && input.jrStatus.updatedAt) {
                        const updateTime = input.jrStatus.updatedAt.match(/(\d{1,2}):(\d{2})/);
                        if (updateTime) eventStartHour = parseInt(updateTime[1]);
                    }

                    const resumption = calculateResumptionTime(futureForecasts, input.routeId, matchForResumption, eventStartHour, input.targetDate);

                    if (resumption.estimatedResumption) {
                        estimatedRecoveryTime = resumption.estimatedResumption;
                        estimatedRecoveryHours = resumption.requiredBufferHours;
                        recoveryRecommendation = resumption.reason;

                        if (isCurrentlySuspended) {
                            reasons.unshift(`【復旧予測】${resumption.reason}`);
                            if (matchForResumption) {
                                reasons.unshift(`【経験則】${matchForResumption.label}のパターンに合致。`);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            logger.error('Failed to predict recovery time', { error: e });
        }
    }


    // 🆕 公式情報の解析とオーバーライド (Official Info Override)
    // 気象データに基づく予測よりも、公式の「終日運休」等の発表を絶対的に優先する
    let isOfficialOverride = false; // 🆕

    if (input.jrStatus) {
        let text = input.jrStatus.rawText || input.jrStatus.statusText || '';

        // 🆕 フィルタリング適用 (他路線の詳細情報を除外)
        text = filterOfficialText(text, input.routeName);

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
        crowdStats: input.crowdsourcedStatus?.last15minCounts ? {
            last15minReportCount: input.crowdsourcedStatus.last15minCounts.total,
            last15minStopped: input.crowdsourcedStatus.last15minCounts.stopped,
            last15minDelayed: input.crowdsourcedStatus.last15minCounts.delayed, // 🆕
            last15minCrowded: input.crowdsourcedStatus.last15minCounts.crowded, // 🆕
            last15minResumed: input.crowdsourcedStatus.last15minCounts.resumed
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
    // 🆕 Timezone fix: Use JST for today determination
    const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo'
    }).format(new Date());

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
