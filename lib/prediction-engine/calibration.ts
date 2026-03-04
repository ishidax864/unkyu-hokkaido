import { PredictionInput, VulnerabilityData, HistoricalMatch } from '../types';
import { calculateRawRiskScore, determineMaxProbability } from './helpers';
import { getTimeMultiplier, getSeasonMultiplier } from './risk-factors';

interface CalibrationResult {
    probability: number;
    reasons: Array<{ reason: string; priority: number }>;
    isOfficialOverride?: boolean; // 取得した公式情報に基づき予測が調整されたか
}

/**
 * ADAPTIVE CALIBRATION (Delta Logic)
 * Compare "Actual Status" vs "Theoretical Model Risk (Now)" to calculate a correction delta.
 */
export function applyAdaptiveCalibration(
    probability: number,
    input: PredictionInput,
    vulnerability: VulnerabilityData,
    historicalMatch: HistoricalMatch | null,
    reasons: Array<{ reason: string; priority: number }>,
    isFutureSafe?: boolean //
): CalibrationResult {
    if (!input.jrStatus || !input.targetDate || !input.targetTime || !input.weather || !input.weather.surroundingHours) {
        return { probability, reasons, isOfficialOverride: false };
    }

    const now = new Date();
    const targetDateTime = new Date(`${input.targetDate}T${input.targetTime}:00+09:00`);
    const hoursFromNow = (targetDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Only apply if looking at near future (-1h to 12h)
    if (hoursFromNow < -1 || hoursFromNow > 12) {
        return { probability, reasons, isOfficialOverride: false };
    }

    const currentStatus = input.jrStatus.status;
    let actualRiskNow = 0;
    if (currentStatus === 'suspended' || currentStatus === 'cancelled') actualRiskNow = 100;
    else if (currentStatus === 'delay') actualRiskNow = 50;
    else if (currentStatus === 'partial') actualRiskNow = 15;
    else if (currentStatus === 'normal') actualRiskNow = 0;

    // 2. Calculate Theoretical Risk Now (Model's view of right now)
    const jstHour = parseInt(new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', hour12: false, timeZone: 'Asia/Tokyo'
    }).format(now));
    const nowHourStr = jstHour.toString().padStart(2, '0') + ':00';
    const weatherNow = input.weather.surroundingHours.find(h => h.targetTime === nowHourStr) || input.weather;

    if (!weatherNow) {
        return { probability, reasons, isOfficialOverride: false };
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
    let newProbability = Math.floor(Math.min(Math.max(probability + adjustment, 0), 100));

    // SUSPENSION LOCK: For same-day searches, if currently suspended, lock to 100%
    // This ensures consistency across the entire day's timeline for active incidents.
    const isToday = input.targetDate === new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
    if (isToday && (currentStatus === 'suspended' || currentStatus === 'cancelled')) {
        // CHECK RESUMPTION TIME
        // If resumption time is defined and targetTime is AFTER resumption, release lock.
        let isAfterResumption = false;
        if (input.jrStatus?.resumptionTime) {
            const resumptionDate = new Date(input.jrStatus.resumptionTime);
            if (targetDateTime.getTime() >= resumptionDate.getTime()) {
                isAfterResumption = true;
            }
        }

        if (!isAfterResumption && !isFutureSafe) {
            newProbability = 100;
        } else {
            // After resumption, the "Current Suspension" influence should be removed.
            // We revert to the theoretical model risk, but keeping in mind that
            // post-resumption usually entails delays, so we might want to floor it.
            // For now, let's just use the base probability to ensure the chart shows the "Change".

            newProbability = probability;

            // Optional: If base probability is very low (e.g. 10%), maybe boost it slightly
            // to reflect "post-resumption instability"?
            // Let's cap it at a minimum of 30% ("Delay Risk") if usage is high?
            // But for now, returning to 'probability' is exactly what the user asked for:
            // "Why is it 100% vs 30%?" -> They expect 30% (trend) if that's what the forecast says.
        }
    }

    // EXTREME WEATHER GUARD
    // 強力な気象信号（突風18m/s以上 or 降雪3cm/h以上）がある場合は、
    // 公式平常による抑制があったとしても、最低限のリスク値(30-40%)を維持する
    const isExtremeWeather = ((weatherNow.windGust ?? 0) >= 18) || ((weatherNow.snowfall ?? 0) >= 3.0);
    if (isExtremeWeather && adjustment < 0) {
        // 修正後の確率が低すぎないかチェック
        const minSafetyRisk = 30; // 30%は「遅延の可能性」レベル
        if (newProbability < minSafetyRisk) {
            newProbability = minSafetyRisk;
        }
    }

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

    const isOfficialOverride = Math.abs(adjustment) > 5; // 5%以上の調整があれば「影響あり」とみなす

    return { probability: newProbability, reasons, isOfficialOverride };
}
