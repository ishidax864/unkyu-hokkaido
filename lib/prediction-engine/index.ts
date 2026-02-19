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
    getWeatherImpact,
    filterOfficialText
} from './formatters';

import {
    MAX_DISPLAY_REASONS,
    MAX_PREDICTION_WITH_NORMAL_DATA
} from './constants';

import { analyzeWeatherTrend } from '../recovery-prediction';
import { calculateResumptionTime } from './resumption';
import { applyAdaptiveCalibration } from './calibration'; // 🆕
import { determineBaseStatus } from './status-logic'; // 🆕

// ==========================================
// Main Prediction Function
// ==========================================

export function calculateSuspensionRisk(input: PredictionInput): PredictionResult {
    // 🆕 Timezone-aware today check (JST)
    const todayJST = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo'
    }).format(new Date());

    // 🆕 Centralized Status Logic - Call early to use constraints throughout
    const { status: baseStatus, isOfficialSuspended, maxProbabilityCap, overrideReason } = determineBaseStatus(
        input.jrStatus,
        input.targetDate,
        input.targetTime || '00:00'
    );

    const vulnerability = ROUTE_VULNERABILITY[input.routeId] || DEFAULT_VULNERABILITY;

    // 0. 過去事例の事前抽出
    const historicalMatch = input.weather ? findHistoricalMatch(input.weather) : null;

    // 0.5. 近傍検索判定 (Near Real-Time Check) 🆕
    // 検索対象時刻が現在時刻から45分以内であれば「リアルタイム検索」とみなす
    const now = new Date();
    const targetDateTime = new Date(`${input.targetDate}T${input.targetTime}:00`);
    const diffMinutes = Math.abs(targetDateTime.getTime() - now.getTime()) / (1000 * 60);
    const isNearRealTime = diffMinutes <= 45;

    // 1. リスク要因の包括的評価
    const { totalScore: rawScore, reasonsWithPriority: rawReasons, hasRealTimeData } = calculateRawRiskScore(input, vulnerability, historicalMatch, isNearRealTime);
    let totalScore = rawScore;
    let reasonsWithPriority = [...rawReasons];

    const wind = input.weather?.windSpeed ?? 0;
    const snow = input.weather?.snowfall ?? 0;

    logger.debug('Risk factors evaluated', {
        routeId: input.routeId,
        score: totalScore,
        factorCount: reasonsWithPriority.length
    });

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
    const maxProbability = determineMaxProbability(input, isNearRealTime);
    let probability = Math.min(Math.round(totalScore), maxProbability);

    // 🆕 Enforce Official Suspension Logic from Status Logic
    if (isOfficialSuspended && input.targetDate === todayJST) {
        // Force cancellation probability if officially suspended today
        probability = 100;
        reasonsWithPriority.unshift({
            reason: '【公式発表】運休または運転見合わせが発表されています',
            priority: 0
        });
    }

    // 🆕 Apply Base Status Constraints (e.g. Resumed -> 50%)
    if (maxProbabilityCap !== undefined) {
        if (probability > maxProbabilityCap) {
            probability = maxProbabilityCap;
            if (overrideReason) {
                // Remove generic high-risk reasons if we are capping
                reasonsWithPriority = reasonsWithPriority.filter(r => r.priority > 5);
                reasonsWithPriority.unshift({
                    reason: overrideReason,
                    priority: 0
                });
            }
        }
    }

    // 🆕 ADAPTIVE CALIBRATION (Delta Logic) - Extracted
    const calibration = applyAdaptiveCalibration(probability, input, vulnerability, historicalMatch, reasonsWithPriority);
    probability = calibration.probability;
    reasonsWithPriority = calibration.reasons;

    // 🆕 是否有官方情報の影響 (Before Confidence Filter as it might be affected by officialPart)
    let isOfficialInfluenced = !!(input.jrStatus && input.jrStatus.status !== 'normal') ||
        !!(input.officialHistory && input.officialHistory.length > 0) ||
        (calibration.isOfficialOverride ?? false);

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
            // 🆕 If filtered because of Official Normal, mark it
            if (input.jrStatus?.status === 'normal') {
                isOfficialInfluenced = true;
            }
        }
    }

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
        const { adjustedProbability, additionalReasons } = applyHistoricalDataAdjustment(probability, maxProbability, input.historicalData);
        probability = Math.round(adjustedProbability);
        reasonsWithPriority.push(...additionalReasons);
    }

    // 🆕 6.5 公的な運行履歴による補正 (Crawler Integration)
    if (input.officialHistory) {
        const { adjustedProbability, additionalReasons } = applyOfficialHistoryAdjustment(probability, input);
        probability = adjustedProbability;
        reasonsWithPriority.push(...additionalReasons);
    }

    // Final check for resumption cap/base status constraints to prevent crawler history from breaking it
    if (maxProbabilityCap !== undefined && probability > maxProbabilityCap) {
        probability = maxProbabilityCap;
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
    const isCurrentlySuspended = isOfficialSuspended && (input.targetDate === todayJST);

    // 復旧予測 (運休中、または運休リスクが高い場合に「もし運休したら？」を予測)
    let estimatedRecoveryTime: string | undefined;
    let estimatedRecoveryHours: number | undefined;
    let recoveryRecommendation: string | undefined;
    let suspensionReason: string | undefined;

    if (input.weather && (isCurrentlySuspended || probability >= 40)) { // 40%以上でシミュレーション
        try {
            const _weatherTrend = analyzeWeatherTrend(input.weather, []);
            const rain = input.weather.precipitation || 0;
            suspensionReason = determineSuspensionReason(wind, snow, rain);

            // 🆕 Unified Resumption Logic
            if (input.weather && input.weather.surroundingHours) {
                // Fix: Recovery calculation should be anchored to "NOW" (or data update time), not the user's search target time.
                // We must use JST because surroundingHours.targetTime is in JST (from Open-Meteo with &timezone=Asia/Tokyo).
                const now = new Date();
                const jstHour = parseInt(new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    hour12: false,
                    timeZone: 'Asia/Tokyo'
                }).format(now));
                const currentHourStr = `${String(jstHour).padStart(2, '0')}:00`;

                // Use forecasts starting from the current hour to find the *next* recovery window
                const futureForecasts = (input.weather.surroundingHours.length > 0)
                    ? input.weather.surroundingHours.filter(h => (h.targetTime || '00:00') >= currentHourStr)
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
                            // Clear existing generic reasons to make room for evidence
                            reasons = reasons.filter(r => !r.includes('運休中') && !r.includes('復旧予測'));
                            reasons.unshift(resumption.reason);
                            if (matchForResumption) {
                                reasons.unshift(`【過去事例照合】${matchForResumption.label}のパターンに類似（${matchForResumption.consequences.recoveryTendency === 'slow' ? '長期化' : '標準的'}傾向）`);
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
    let isOfficialOverride = false;

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
            // Keep existing estimatedRecoveryTime if we have one (e.g. 16:00), 
            // but mark the scale as all-day. Fallback to '終日運休' if none.
            estimatedRecoveryTime = estimatedRecoveryTime || '終日運休';
            estimatedRecoveryHours = undefined;
            recoveryRecommendation = `JR北海道公式発表: ${text}`;
            recoveryRecommendation = `JR北海道公式発表: ${text}`;
            isOfficialOverride = true;

            // 理由リストの先頭に公式情報を追加（重複しないようにチェック）
            const officialReason = `【公式発表】${text}`;

            // 既存の公式理由があれば削除して、より詳細なものを優先する
            reasons = reasons.filter(r => !r.startsWith('【公式発表】') && !r.startsWith('【運休中】'));
            reasons.unshift(officialReason);

            // 運休理由も公式情報で上書き
            suspensionReason = 'JR北海道公式発表による';
        } else {
            // 🆕 Partial Suspension / Reduced Service Detection
            // 「本数を減らして」「間引き」「一部運休」などのキーワードがある場合
            const partialKeywords = ['本数を減ら', '間引き', '一部運休', '大幅な遅れ'];
            if (partialKeywords.some(k => text.includes(k))) {
                isOfficialOverride = true;
                // Force High Risk (Delay/Caution)
                if (probability < 80) {
                    probability = 80;
                }
                reasons.unshift(`【公式発表】${text}`); // Add official text as primary reason

                // Clear low-confidence messages if any
                reasons = reasons.filter(r => !r.includes('リスクを高める要因は検出されていません'));
            }
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
            wind,
            snow
        },
        officialStatus: input.jrStatus,
        isOfficialInfluenced // 🆕 追加
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

        // 🆕 Weekly Consistency Fix:
        // If today matches logic in calculateSuspensionRisk (which it does via jrStatus), 
        // verify if "Suspended" status was applied.
        // If the 12:00 forecast was "Normal" but current status is "Suspended", force update for Today.
        if (isToday && jrStatus && (jrStatus.status === 'suspended' || jrStatus.status === 'cancelled')) {
            // Even if resumption is scheduled for evening, the "Daily Summary" for today should probably reflect the *worst* state (Suspended)
            // or at least be consistent with the main card.
            // If main card says "Suspended", this should too.
            result.probability = 100;
            result.status = '運休中';
            result.isCurrentlySuspended = true;
        }

        return result;
    });
}

