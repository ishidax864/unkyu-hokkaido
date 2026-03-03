
import { PredictionInput } from '../types';
import { logger } from '../logger';
import { calculateResumptionTime } from './resumption';
import { findHistoricalMatch } from '../historical-data/suspension-patterns';
import { determineSuspensionReason } from './helpers';


export interface RecoveryResult {
    estimatedRecoveryTime?: string;
    estimatedRecoveryHours?: number;
    recoveryRecommendation?: string;
    suspensionReason?: string;
    recoveryReasons: { reason: string; priority: number }[];
}

/**
 * Simulates recovery/resumption based on weather trends and historical matches.
 */
export function predictRecovery(
    input: PredictionInput,
    currentProbability: number,
    isCurrentlySuspended: boolean,
    _isPartialSuspension: boolean
): RecoveryResult {
    let estimatedRecoveryTime: string | undefined;
    let estimatedRecoveryHours: number | undefined;
    let recoveryRecommendation: string | undefined;
    let suspensionReason: string | undefined;
    const recoveryReasons: { reason: string; priority: number }[] = [];

    // Only run if conditions warrant recovery prediction
    if (!input.weather || (!isCurrentlySuspended && currentProbability < 40)) {
        return { recoveryReasons };
    }

    try {
        const weather = input.weather;
        const rain = weather.precipitation || 0;
        const wind = weather.windSpeed || 0;
        const snow = weather.snowfall || 0;

        const officialRawText = input.jrStatus?.rawText || input.jrStatus?.statusText || undefined;
        suspensionReason = determineSuspensionReason(wind, snow, rain, officialRawText);

        if (weather.surroundingHours && weather.surroundingHours.length > 0) {
            const now = new Date();
            const jstHour = parseInt(new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                hour12: false,
                timeZone: 'Asia/Tokyo'
            }).format(now));
            const currentHourStr = `${String(jstHour).padStart(2, '0')}:00`;

            const futureForecasts = weather.surroundingHours.filter(h => (h.targetTime || '00:00') >= currentHourStr);

            if (futureForecasts.length > 0) {
                const peakSnow = Math.max(...weather.surroundingHours.map(h => h.snowfall || 0));
                const peakWind = Math.max(...weather.surroundingHours.map(h => h.windSpeed || 0));
                const peakGust = Math.max(...weather.surroundingHours.map(h => h.windGust || 0));
                const repWeather = weather.surroundingHours.find(h => (h.snowfall || 0) === peakSnow) || weather;

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
                        recoveryReasons.push({ reason: resumption.reason, priority: 5 });
                        if (matchForResumption) {
                            recoveryReasons.push({
                                reason: `【過去事例照合】${matchForResumption.label}のパターンに類似（${matchForResumption.consequences.recoveryTendency === 'slow' ? '長期化' : '標準的'}傾向）`,
                                priority: 6
                            });
                        }
                    }
                    // 部分運休の場合でも復旧時刻は維持する（UIで「目処立たず」と表示させない）

                }
            }
        }
    } catch (e) {
        logger.error('Failed to predict recovery time', { error: e });
    }

    return {
        estimatedRecoveryTime,
        estimatedRecoveryHours,
        recoveryRecommendation,
        suspensionReason,
        recoveryReasons
    };
}

/**
 * 復旧ウィンドウの判定結果
 */
export interface PostRecoveryEvaluation {
    isFutureSafe: boolean;
    isPostRecoveryWindow: boolean;
    probability: number;
    minProbability: number;
    additionalReasons: { reason: string; priority: number }[];
}

/**
 * 復旧ウィンドウの評価
 *
 * 公式またはAI予測の復旧時刻と、ユーザーの検索時刻を比較して
 * 「復旧後」ウィンドウにいるかどうかを判定し、確率キャップを適用する。
 */
export function evaluatePostRecoveryWindow(params: {
    jrStatus: PredictionInput['jrStatus'];
    targetDate: string;
    effectiveTargetTime: string;
    probability: number;
    minProbability: number;
    estimatedRecoveryTime?: string;
}): PostRecoveryEvaluation {
    const { jrStatus, targetDate, effectiveTargetTime, estimatedRecoveryTime } = params;
    let { probability, minProbability } = params;
    let isFutureSafe = false;
    let isPostRecoveryWindow = false;
    const additionalReasons: { reason: string; priority: number }[] = [];

    // 公式 resumptionTime vs ユーザー検索時刻のチェック
    if (jrStatus?.resumptionTime && effectiveTargetTime) {
        const officialResumptionDate = new Date(jrStatus.resumptionTime);
        const targetDateTime = new Date(`${targetDate}T${effectiveTargetTime}:00+09:00`);
        if (targetDateTime.getTime() > officialResumptionDate.getTime()) {
            const hoursAfterOfficial = (targetDateTime.getTime() - officialResumptionDate.getTime()) / (1000 * 60 * 60);

            isPostRecoveryWindow = true;

            if (hoursAfterOfficial >= 1) {
                // 1時間以上経過 → chaos window の minProbability を解除
                isFutureSafe = true;
                minProbability = 0;

                // 経過時間に応じてキャップ (1h=45%, 2h=35%, 3h=25%, 4h+=15%)
                const postRecoveryMax = Math.max(15, Math.round(55 - hoursAfterOfficial * 10));
                probability = Math.min(probability, postRecoveryMax);

                additionalReasons.push({
                    reason: `【復旧後】${jrStatus.resumptionTime.substring(11, 16)}頃に運転再開見込み。ダイヤ乱れに注意`,
                    priority: 1
                });
            }
        }
    }

    // AI予測の復旧時刻 vs ユーザー検索時刻（公式がない場合のフォールバック）
    if (!isPostRecoveryWindow && estimatedRecoveryTime && !estimatedRecoveryTime.includes('終日') && effectiveTargetTime) {
        const recoveryMatch = estimatedRecoveryTime.match(/(\d{1,2}):(\d{2})/);
        const targetMatch = effectiveTargetTime.match(/(\d{1,2}):(\d{2})/);
        if (recoveryMatch && targetMatch) {
            const recoveryMinutes = parseInt(recoveryMatch[1]) * 60 + parseInt(recoveryMatch[2]);
            const targetMinutes = parseInt(targetMatch[1]) * 60 + parseInt(targetMatch[2]);
            if (targetMinutes > recoveryMinutes) {
                isFutureSafe = true;
                isPostRecoveryWindow = true;

                const hoursAfterRecovery = (targetMinutes - recoveryMinutes) / 60;
                const postRecoveryMax = Math.max(15, Math.round(55 - hoursAfterRecovery * 10));
                probability = Math.min(probability, postRecoveryMax);
                minProbability = 0;

                additionalReasons.push({
                    reason: `【復旧後】${estimatedRecoveryTime}に運転再開見込み。ダイヤ乱れや一部列車の遅延が残る可能性があります`,
                    priority: 1
                });
            }
        }
    }

    return { isFutureSafe, isPostRecoveryWindow, probability, minProbability, additionalReasons };
}
