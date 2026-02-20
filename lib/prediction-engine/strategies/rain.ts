
import { PredictionInput, VulnerabilityData } from '../../types';
import { RiskFactorStrategy, RiskFactorResult } from './base';
import {
    HEAVY_RAIN_WARNING_SCORE,
    HEAVY_RAIN_THRESHOLD,
    HEAVY_RAIN_BASE_SCORE,
    HEAVY_RAIN_EXCESS_COEFFICIENT,
    HEAVY_RAIN_MAX_BONUS,
    MODERATE_RAIN_MIN,
    MODERATE_RAIN_MAX,
    MODERATE_RAIN_BASE_SCORE,
    MODERATE_RAIN_COEFFICIENT
} from '../constants';

export class RainStrategy implements RiskFactorStrategy {
    name = 'RainStrategy';

    evaluate(input: PredictionInput, vuln: VulnerabilityData): RiskFactorResult {
        let score = 0;
        const reasons: { reason: string; priority: number }[] = [];

        // 1. Heavy Rain Warning
        if (input.weather?.warnings?.some(w => w.type === '大雨警報')) {
            score = Math.max(score, HEAVY_RAIN_WARNING_SCORE);
            reasons.push({ reason: '大雨警報が発令されています', priority: 3 });
        }

        const rain = input.weather?.precipitation ?? 0;

        // 2. Heavy Rain
        if (rain >= HEAVY_RAIN_THRESHOLD) {
            const ruleScore = HEAVY_RAIN_BASE_SCORE + Math.min(Math.round((rain - HEAVY_RAIN_THRESHOLD) * HEAVY_RAIN_EXCESS_COEFFICIENT), HEAVY_RAIN_MAX_BONUS);
            // Accumulate? Original code was additive between Warning and Rain amount?
            // Actually original: Warning (Priority 3) and Rain Amount (Priority 6/9) were separate items.
            // So they add up.
            score += ruleScore;
            reasons.push({ reason: `降水量${rain}mmの予報`, priority: 6 });
        }
        // 3. Moderate Rain
        else if (rain >= MODERATE_RAIN_MIN && rain < MODERATE_RAIN_MAX) {
            const ruleScore = MODERATE_RAIN_BASE_SCORE + Math.round(rain * MODERATE_RAIN_COEFFICIENT);
            score += ruleScore;
            reasons.push({ reason: `降水量${rain}mm（視界不良の可能性）`, priority: 9 });
        }

        return { score, reasons };
    }
}
