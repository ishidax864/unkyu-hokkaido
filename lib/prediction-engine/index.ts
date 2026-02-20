import { PredictionResult, PredictionInput } from '../types';
import { logger } from '../logger';
import { CrowdsourcedStatus } from '../user-reports';
import { JROperationStatus } from '../jr-status';
import { WeatherForecast } from '../types';
import { findHistoricalMatch } from '../historical-data/suspension-patterns';

// Refactored Modules
import {
    ROUTE_VULNERABILITY,
    DEFAULT_VULNERABILITY,
    getTimeMultiplier,
    getSeasonMultiplier
} from './risk-factors';

import {
    determineMaxProbability,
    applyHistoricalDataAdjustment,
    determineSuspensionReason,
    applyConfidenceFilter,
    calculateRawRiskScore,
    applyOfficialHistoryAdjustment // 🆕
} from './helpers';

import {
    getStatusFromProbability,
    getConfidence,
    getWeatherImpact
} from './formatters';

import {
    MAX_DISPLAY_REASONS,
    MAX_PREDICTION_WITH_NORMAL_DATA
} from './constants';

import { applyAdaptiveCalibration } from './calibration'; // 🆕
import { determineBaseStatus } from './status-logic'; // 🆕

import {
    preparePredictionInput
} from './preparation';

import {
    predictRecovery
} from './recovery-logic';

// ==========================================
// Main Prediction Function
// ==========================================

export function calculateSuspensionRisk(input: PredictionInput): PredictionResult {
    // 1. Input Normalization & Context Preparation
    const {
        effectiveTargetTime,
        isNonOperatingHour,
        todayJST,
        isNearRealTime,
        calculationInput
    } = preparePredictionInput(input);

    // 2. Centralized Status Logic (Single Source of Truth)
    const {
        status: baseStatus,
        isOfficialSuspended,
        isPostResumptionChaos,
        isPartialSuspension,
        partialSuspensionText,
        minProbability,
        maxProbability,
        overrideReason
    } = determineBaseStatus(
        input.jrStatus,
        input.targetDate,
        effectiveTargetTime,
        input.weather?.snowDepth
    );

    const vulnerability = ROUTE_VULNERABILITY[input.routeId] || DEFAULT_VULNERABILITY;
    // ... (rest same until probability calculation) ...

    // 0. 過去事例の事前抽出
    const historicalMatch = input.weather ? findHistoricalMatch(input.weather) : null;

    // 3. Risk Factor Evaluation
    const {
        totalScore: rawScore,
        reasonsWithPriority: rawReasons,
        hasRealTimeData
    } = calculateRawRiskScore(calculationInput, vulnerability, historicalMatch, isNearRealTime);
    let totalScore = rawScore;
    let reasonsWithPriority = [...rawReasons];

    logger.debug('Risk factors evaluated', {
        routeId: input.routeId,
        score: totalScore,
        factorCount: reasonsWithPriority.length
    });

    // 4. 時間帯・季節補正
    const timeMultiplier = getTimeMultiplier(effectiveTargetTime);
    const seasonMultiplier = getSeasonMultiplier();
    totalScore = totalScore * timeMultiplier * seasonMultiplier;

    if (timeMultiplier > 1.0) {
        reasonsWithPriority.push({
            reason: `通勤時間帯につき遅延波及リスク上昇`,
            priority: 12,
        });
    }

    // 🆕 Add Non-Operating Hour Reason
    if (isNonOperatingHour) {
        reasonsWithPriority.unshift({
            reason: `【営業時間外】始発（06:00頃）のリスクを予測しています`,
            priority: 0
        });
    }

    // 5. 確率計算と上限適用
    const weatherMaxProbability = determineMaxProbability(calculationInput, isNearRealTime);
    let probability = Math.min(Math.round(totalScore), weatherMaxProbability);

    const isCurrentlySuspended = isOfficialSuspended && (input.targetDate === todayJST);

    // 6. Recovery Simulation
    const recovery = predictRecovery(
        calculationInput,
        probability,
        isCurrentlySuspended,
        isPartialSuspension || false
    );

    let {
        estimatedRecoveryTime,
        estimatedRecoveryHours,
        recoveryRecommendation,
        suspensionReason
    } = recovery;

    reasonsWithPriority.push(...recovery.recoveryReasons);

    let isFutureSafe = false;
    let isPostRecoveryWindow = false;

    // 🆕 AI予測の復旧時刻 vs ユーザーの検索時刻を比較
    // 例: 復旧予測15:00 + 検索16:08 → 復旧後のダイヤ乱れモードへ切り替え
    if (estimatedRecoveryTime && !estimatedRecoveryTime.includes('終日') && effectiveTargetTime) {
        const recoveryMatch = estimatedRecoveryTime.match(/(\d{1,2}):(\d{2})/);
        const targetMatch = effectiveTargetTime.match(/(\d{1,2}):(\d{2})/);
        if (recoveryMatch && targetMatch) {
            const recoveryMinutes = parseInt(recoveryMatch[1]) * 60 + parseInt(recoveryMatch[2]);
            const targetMinutes = parseInt(targetMatch[1]) * 60 + parseInt(targetMatch[2]);
            if (targetMinutes > recoveryMinutes) {
                isFutureSafe = true;
                isPostRecoveryWindow = true;
                // 復旧後のダイヤ乱れレベルに確率を抑制（最大55%）
                const postRecoveryMax = 55;
                if (probability > postRecoveryMax) {
                    probability = postRecoveryMax;
                }
                // 復旧済みの文脈に合った理由を追加
                reasonsWithPriority.push({
                    reason: `【復旧後】${estimatedRecoveryTime}に運転再開見込み。ダイヤ乱れや一部列車の遅延が残る可能性があります`,
                    priority: 1
                });
            }
        }
    }

    // 🆕 ADAPTIVE CALIBRATION (Delta Logic) - Extracted
    const calibration = applyAdaptiveCalibration(probability, input, vulnerability, historicalMatch, reasonsWithPriority, isFutureSafe);
    probability = calibration.probability;
    reasonsWithPriority = calibration.reasons;

    // 🆕 是否有官方情報の影響 (Single source of truth - evaluated after confidence filter)
    let isOfficialInfluenced = false;

    // 🆕 Confidence Filter
    if (input.weather) {
        const filterResult = applyConfidenceFilter({
            probability,
            totalScore,
            windSpeed: input.weather.windSpeed || 0,
            windGust: input.weather.windGust || 0,
            snowfall: input.weather.snowfall || 0,
            officialStatus: input.jrStatus ? {
                status: input.jrStatus.status,
                resumptionTime: input.jrStatus.resumptionTime // 🆕
            } : null, isNearRealTime // 🆕 Pass flag
        });

        if (filterResult.wasFiltered) {
            probability = filterResult.filteredProbability;
            if (filterResult.reason) {
                reasonsWithPriority.push({
                    reason: `【予測補正】${filterResult.reason}`,
                    priority: 20
                });
            }
        }
    }

    // isOfficialInfluenced: JR公式情報・履歴・キャリブレーションのいずれかが予測に影響した場合に true
    isOfficialInfluenced =
        !!(input.jrStatus && input.jrStatus.status !== 'normal') ||
        !!(input.officialHistory && input.officialHistory.length > 0) ||
        (calibration.isOfficialOverride ?? false);

    // Official Info Cap - REFACTOR: Use baseStatus logic if already capped?
    // Maintain existing logic for now but ensure it doesn't conflict
    if (probability === MAX_PREDICTION_WITH_NORMAL_DATA && input.jrStatus?.status === 'normal') {
        reasonsWithPriority.push({
            reason: '【公式情報】JR北海道より通常運行が発表されているため、予測リスクを抑制しています',
            priority: 0
        });
    }

    // 6. 履歴データによる補正
    if (input.historicalData) {
        const { adjustedProbability, additionalReasons } = applyHistoricalDataAdjustment(probability, weatherMaxProbability, input.historicalData);
        probability = Math.round(adjustedProbability);
        reasonsWithPriority.push(...additionalReasons);
    }

    // 🆕 6.5 公的な運行履歴による補正 (Crawler Integration)
    if (input.officialHistory) {
        const { adjustedProbability, additionalReasons } = applyOfficialHistoryAdjustment(probability, input);
        probability = adjustedProbability;
        reasonsWithPriority.push(...additionalReasons);
    }

    // 🆕 FINAL CLAMPING (Single Source of Truth)
    // Ensures strict consistency between Main and Hourly forecasts by obeying status-logic bounds.
    probability = Math.max(minProbability, Math.min(Math.round(probability), maxProbability));

    // 7. 最終的な理由リスト作成
    let reasons = reasonsWithPriority
        .sort((a, b) => a.priority - b.priority)
        .slice(0, MAX_DISPLAY_REASONS)
        .map(r => r.reason);

    const confidence = input.weather
        ? getConfidence(probability, reasons.length, hasRealTimeData)
        : 'low';


    // 🆕 公式情報の解析とオーバーライド (Official Info Override - Redesigned)
    // Single Source of Truth: determineBaseStatus (calculated at start of function)
    let isOfficialOverride = !!overrideReason;

    // 1. Resumption Time Formatting (If official time exists)
    if (input.jrStatus?.resumptionTime) {
        const resumptionDate = new Date(input.jrStatus.resumptionTime);
        const resumptionHHMM = input.jrStatus.resumptionTime.substring(11, 16);
        const now = new Date();
        const today = now.getDate();
        const resumptionDay = resumptionDate.getDate();

        let timeStr = `${resumptionHHMM}頃`;
        if (resumptionDay !== today) {
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            if (resumptionDay === tomorrow.getDate()) {
                timeStr = `明日 ${resumptionHHMM}頃`;
            } else {
                timeStr = `${resumptionDay}日 ${resumptionHHMM}頃`;
            }
        }

        // Override predicted time with official time
        estimatedRecoveryTime = timeStr;
        isOfficialOverride = true;

        // Determine scale if suspended
        if (isCurrentlySuspended) {
            // If override matches "All Day", handling is separate?
            // Usually "All Day" doesn't have specific resumptionTime unless it's "Tomorrow 05:00"
        }
    } else if (input.jrStatus) {
        // Check for "All Day Suspension" text pattern for estimatedRecoveryTime
        const text = input.jrStatus.rawText || input.jrStatus.statusText || '';
        if (text.includes('終日運休') || text.includes('終日運転見合わせ') || text.includes('全区間運休')) {
            estimatedRecoveryTime = '終日運休';
            isOfficialOverride = true;
        }
    }

    // 2. Construct Reasons
    if (isOfficialOverride && overrideReason) {
        // Remove generic low-confidence messages
        reasons = reasons.filter(r => !r.includes('リスクを高める要因は検出されていません'));

        // Add the official reason (deduplicated)
        if (!reasons.some(r => r === overrideReason)) {
            reasons.unshift(overrideReason);
        }
    }

    if (reasons.length === 0) {
        reasons.push('現時点で運休リスクを高める要因は検出されていません');
    }

    return {
        routeId: input.routeId,
        targetDate: input.targetDate,
        probability: (isCurrentlySuspended && !isFutureSafe) ? 100 : probability, // 🆕 Allow probability < 100 if future safe
        status: (isCurrentlySuspended && !isFutureSafe) ? '運休中' : getStatusFromProbability(probability), // 🆕 Allow normal status if future safe
        confidence,
        // If suspended, ensure the main reason reflects it
        reasons: (isCurrentlySuspended && !isOfficialOverride && !isFutureSafe)
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
        isOfficialOverride,
        suspensionScale: (() => {
            if (estimatedRecoveryTime === '終日運休') return 'all-day';
            if (typeof estimatedRecoveryHours === 'number') {
                if (estimatedRecoveryHours <= 2) return 'small';
                if (estimatedRecoveryHours <= 6) return 'medium';
                return 'large';
            }
            // 🆕 運休中だが復旧時刻が算出できない（＝見通しが立たない）場合は「大規模」扱いとする
            if (isCurrentlySuspended && !estimatedRecoveryTime) {
                return 'large';
            }
            return undefined;
        })(),
        crowdStats: input.crowdsourcedStatus?.last15minCounts ? {
            last15minReportCount: input.crowdsourcedStatus.last15minCounts.total,
            last15minStopped: input.crowdsourcedStatus.last15minCounts.stopped,
            last15minDelayed: input.crowdsourcedStatus.last15minCounts.delayed,
            last15minCrowded: input.crowdsourcedStatus.last15minCounts.crowded,
            last15minResumed: input.crowdsourcedStatus.last15minCounts.resumed
        } : undefined,
        comparisonData: {
            wind: input.weather?.windSpeed ?? 0,
            snow: input.weather?.snowfall ?? 0
        },
        officialStatus: input.jrStatus ? {
            status: input.jrStatus.status,
            statusText: input.jrStatus.statusText,
            updatedAt: input.jrStatus.updatedAt || '',
            rawText: input.jrStatus.rawText
        } : undefined,
        isPartialSuspension,
        partialSuspensionText,
        isOfficialInfluenced,
        isPostResumptionChaos,
        isPostRecoveryWindow
    };
}


// 週間予測を計算
export function calculateWeeklyForecast(
    routeId: string,
    routeName: string,
    weeklyWeather: WeatherForecast[],
    jrStatus?: JROperationStatus | null,
    crowdsourcedStatus?: CrowdsourcedStatus | null,
    historicalData?: PredictionInput['historicalData'] | null,
    officialHistory?: PredictionInput['officialHistory'] | null
): PredictionResult[] {
    // 🆕 Timezone fix: Use JST for today determination
    const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo'
    }).format(new Date());

    return weeklyWeather.map((weather) => { // Removed unused 'index'
        // 今日、または過去（念のため）のデータであれば公式情報を反映
        const isToday = weather.date <= today;

        // Only apply official status to TODAY. Future days should rely on weather prediction
        // unless we parse explicit "until date X" text (which is rare/complex).
        // Blind propagation causes "60%" floor for sunny days in future.
        const result = calculateSuspensionRisk({
            routeId,
            routeName,
            targetDate: weather.date,
            targetTime: '12:00', // 週間予測は正午基準
            weather,
            jrStatus: isToday ? jrStatus : null,
            crowdsourcedStatus: isToday ? crowdsourcedStatus : null,
            historicalData: historicalData,
            officialHistory: isToday ? officialHistory : null
        });

        return result;
    });
}

