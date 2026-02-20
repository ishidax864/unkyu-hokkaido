
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
    isPartialSuspension: boolean
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

        suspensionReason = determineSuspensionReason(wind, snow, rain);

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
