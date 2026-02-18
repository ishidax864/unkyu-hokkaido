import { PredictionInput, VulnerabilityData } from '../types';
import { calculateRawRiskScore, determineMaxProbability } from './helpers';
import { getTimeMultiplier, getSeasonMultiplier } from './risk-factors';

interface CalibrationResult {
    probability: number;
    reasons: Array<{ reason: string; priority: number }>;
}

/**
 * ADAPTIVE CALIBRATION (Delta Logic)
 * Compare "Actual Status" vs "Theoretical Model Risk (Now)" to calculate a correction delta.
 */
export function applyAdaptiveCalibration(
    probability: number,
    input: PredictionInput,
    vulnerability: VulnerabilityData,
    historicalMatch: any,
    reasons: Array<{ reason: string; priority: number }>
): CalibrationResult {
    if (!input.jrStatus || !input.targetDate || !input.targetTime || !input.weather || !input.weather.surroundingHours) {
        return { probability, reasons };
    }

    const now = new Date();
    const targetDateTime = new Date(`${input.targetDate}T${input.targetTime}:00`);
    const hoursFromNow = (targetDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Only apply if looking at near future (-1h to 12h)
    if (hoursFromNow < -1 || hoursFromNow > 12) {
        return { probability, reasons };
    }

    const currentStatus = input.jrStatus.status;
    let actualRiskNow = 0;
    if (currentStatus === 'suspended' || currentStatus === 'cancelled') actualRiskNow = 100;
    else if (currentStatus === 'delay') actualRiskNow = 50;
    else if (currentStatus === 'normal') actualRiskNow = 0;

    // 2. Calculate Theoretical Risk Now (Model's view of right now)
    const nowHourStr = now.getHours().toString().padStart(2, '0') + ':00';
    const weatherNow = input.weather.surroundingHours.find(h => h.targetTime === nowHourStr) || input.weather;

    if (!weatherNow) {
        return { probability, reasons };
    }

    // Calculate raw score for NOW
    const inputNow = { ...input, weather: weatherNow, targetTime: nowHourStr };
    const { totalScore: rawScoreNow } = calculateRawRiskScore(inputNow, vulnerability, historicalMatch);

    // Apply multipliers for NOW
    const timeMultiNow = getTimeMultiplier(nowHourStr);
    const seasonMulti = getSeasonMultiplier();
    const scoreNow = rawScoreNow * timeMultiNow * seasonMulti;

    const maxProbNow = determineMaxProbability(inputNow);
    const theoreticalRiskNow = Math.min(Math.round(scoreNow), maxProbNow);

    // 3. Calculate Delta
    const delta = actualRiskNow - theoreticalRiskNow;

    // 4. Apply Delta with Decay
    let decayBase = 0.8;
    if (actualRiskNow === 100) decayBase = 0.9; // Suspended lingers longer

    const decay = Math.pow(decayBase, Math.max(0, hoursFromNow));
    const adjustment = delta * decay;

    // Apply adjustment
    const previousProb = probability;
    const newProbability = Math.floor(Math.min(Math.max(probability + adjustment, 0), 100));

    // Add Reason if adjustment is significant
    if (Math.abs(adjustment) > 15) {
        if (adjustment > 0) {
            const reasonMsg = `【現在運休・遅延】直近の状況を考慮し、通常予測(${Math.round(previousProb)}%)よりリスクを高めています`;
            if (!reasons.some(r => r.reason.includes('直近の状況'))) {
                reasons.push({ reason: reasonMsg, priority: 0 });
            }
        } else {
            const reasonMsg = `【現在平常】直近の運行実績を考慮し、通常予測(${Math.round(previousProb)}%)よりリスクを調整しています`;
            if (!reasons.some(r => r.reason.includes('直近の状況'))) {
                reasons.push({ reason: reasonMsg, priority: 0 });
            }
        }
    }

    return { probability: newProbability, reasons };
}
