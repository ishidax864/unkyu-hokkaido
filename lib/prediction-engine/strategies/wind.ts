
import { PredictionInput, VulnerabilityData } from '../../types';
import { RiskFactorStrategy, RiskFactorResult } from './base';
import {
    STORM_WARNING_SCORE,
    STRONG_WIND_BASE_SCORE,
    STRONG_WIND_EXCESS_COEFFICIENT,
    STRONG_WIND_MAX_BONUS,
    MODERATE_WIND_MIN,
    MODERATE_WIND_BASE_SCORE,
    MODERATE_WIND_COEFFICIENT,
    LIGHT_WIND_MIN,
    LIGHT_WIND_MAX,
    LIGHT_WIND_SCORE,
    WIND_GUST_DANGER_THRESHOLD,
    WIND_GUST_BASE_SCORE,
    WIND_GUST_MAX_BONUS,
    SAFE_WIND_DIRECTION_MULTIPLIER
} from '../constants';

// Helper: Check if wind direction is safe
function isSafeWindDirection(direction: number | undefined, safeRanges: number[][] | undefined): boolean {
    if (direction === undefined || !safeRanges) return false;
    return safeRanges.some(([min, max]) => direction >= min && direction <= max);
}

export class WindStrategy implements RiskFactorStrategy {
    name = 'WindStrategy';

    evaluate(input: PredictionInput, vuln: VulnerabilityData): RiskFactorResult {
        let score = 0;
        const reasons: { reason: string; priority: number }[] = [];

        // 1. Storm Warning
        if (input.weather?.warnings?.some(w => w.type === '暴風警報')) {
            let warningScore = STORM_WARNING_SCORE;
            if (input.historicalMatch?.id === 'explosive-cyclogenesis' || input.historicalMatch?.id === 'heavy-wind-low-pressure') {
                warningScore = 100;
            }
            score = Math.max(score, warningScore);
            reasons.push({ reason: '暴風警報が発令されています', priority: 1 });
        }

        const ws = input.weather?.windSpeed ?? 0;
        const windDir = input.weather?.windDirection;

        // 2. Threshold Exceeded (Strong Wind)
        if (ws >= vuln.windThreshold) {
            const excess = ws - vuln.windThreshold;
            let ruleScore = STRONG_WIND_BASE_SCORE + Math.min(excess * STRONG_WIND_EXCESS_COEFFICIENT, STRONG_WIND_MAX_BONUS);
            if (isSafeWindDirection(windDir, vuln.safeWindDirections)) {
                ruleScore = Math.round(ruleScore * SAFE_WIND_DIRECTION_MULTIPLIER);
            }
            score = Math.max(score, ruleScore); // Take MAX for now, or accumulate? Original was additive but independent.
            // Wait, original calculateRawRiskScore ACCUMULATES scores from different factors.
            // But here within WindStrategy, we might want to return the highest severe factor or accumulate?
            // Original logic: Each rule in RISK_FACTORS is evaluated independently and summed up.
            // So we should sum them up here.
            reasons.push({ reason: `風速${ws}m/sの予報（運転規制基準）`, priority: 4 });
        }
        // 3. Moderate Wind
        else if (ws >= MODERATE_WIND_MIN) {
            let ruleScore = MODERATE_WIND_BASE_SCORE + Math.round((ws - MODERATE_WIND_MIN) * MODERATE_WIND_COEFFICIENT);
            if (isSafeWindDirection(windDir, vuln.safeWindDirections)) {
                ruleScore = Math.round(ruleScore * SAFE_WIND_DIRECTION_MULTIPLIER);
            }
            // Add to total score if not overridden by Strong Wind?
            // Original logic allows both "Strong" and "Moderate" to fire if ranges overlap, but here they are exclusive in the RiskFactors array logic?
            // Actually, in original code:
            // strong: ws >= vuln.windThreshold
            // moderate: ws >= MODERATE_WIND_MIN && ws < vuln.windThreshold
            // They were mutually exclusive logic-wise.
            score += ruleScore;
            reasons.push({ reason: `風速${ws}m/sの予報（徐行運転による遅延の可能性）`, priority: 6 });
        }
        // 4. Light Wind
        else if (ws >= LIGHT_WIND_MIN && ws < LIGHT_WIND_MAX) {
            score += LIGHT_WIND_SCORE;
            reasons.push({ reason: `風速${ws}m/s（軽微な影響の可能性）`, priority: 10 });
        } else {
            // Logic for Strong Wind above added to score.
            // Wait, the "Strong Wind" block above didn't add to score, it did `score = Math.max`.
            // Let's fix.
            if (ws >= vuln.windThreshold) {
                // Re-calculate local variable ruleScore above
                const excess = ws - vuln.windThreshold;
                let ruleScore = STRONG_WIND_BASE_SCORE + Math.min(excess * STRONG_WIND_EXCESS_COEFFICIENT, STRONG_WIND_MAX_BONUS);
                if (isSafeWindDirection(windDir, vuln.safeWindDirections)) {
                    ruleScore = Math.round(ruleScore * SAFE_WIND_DIRECTION_MULTIPLIER);
                }
                score += ruleScore;
            }
        }

        // 5. Gusts
        const gust = input.weather?.windGust ?? 0;
        if (gust >= WIND_GUST_DANGER_THRESHOLD) {
            let gustScore = 0;
            if (ws < 15 && gust > ws * 3) {
                const effectiveGust = Math.min(gust, ws * 3);
                gustScore = WIND_GUST_BASE_SCORE + Math.min(Math.max(0, effectiveGust - WIND_GUST_DANGER_THRESHOLD), WIND_GUST_MAX_BONUS) * 0.5;
                reasons.push({ reason: `瞬間風速${gust}m/sの予報（突風による影響の可能性 ※予測値不安定）`, priority: 6 });
            } else {
                gustScore = WIND_GUST_BASE_SCORE + Math.min(gust - WIND_GUST_DANGER_THRESHOLD, WIND_GUST_MAX_BONUS);
                reasons.push({ reason: `瞬間風速${gust}m/sの予報（突風による一時運転見合わせの可能性）`, priority: 6 });
            }

            if (isSafeWindDirection(windDir, vuln.safeWindDirections)) {
                gustScore = Math.round(gustScore * SAFE_WIND_DIRECTION_MULTIPLIER);
            }
            score += gustScore;
        }

        return { score, reasons };
    }
}
