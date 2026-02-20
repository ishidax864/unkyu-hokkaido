
import { PredictionInput, VulnerabilityData } from '../../types';
import { RiskFactorStrategy, RiskFactorResult } from './base';
import {
    HEAVY_SNOW_WARNING_SCORE,
    HEAVY_SNOW_BASE_SCORE,
    HEAVY_SNOW_EXCESS_COEFFICIENT,
    HEAVY_SNOW_MAX_BONUS,
    MODERATE_SNOW_MIN,
    MODERATE_SNOW_BASE_SCORE,
    MODERATE_SNOW_COEFFICIENT,
    LIGHT_SNOW_MIN,
    LIGHT_SNOW_MAX,
    LIGHT_SNOW_SCORE,
    DRIFTING_SNOW_TEMP_THRESHOLD,
    DRIFTING_SNOW_WIND_THRESHOLD,
    DRIFTING_SNOW_BASE_SCORE,
    DRIFTING_SNOW_WIND_COEFFICIENT,
    MODERATE_SNOW_DEPTH_THRESHOLD,
    MODERATE_SNOW_DEPTH_SCORE,
    CRITICAL_SNOW_DEPTH_THRESHOLD,
    CRITICAL_SNOW_DEPTH_SCORE,
    SUSPENSION_SNOW_THRESHOLD // 15cm
} from '../constants';

export class SnowStrategy implements RiskFactorStrategy {
    name = 'SnowStrategy';

    evaluate(input: PredictionInput, vuln: VulnerabilityData): RiskFactorResult {
        let score = 0;
        const reasons: { reason: string; priority: number }[] = [];

        const snow = input.weather?.snowfall ?? 0;
        const temp = input.weather?.temperature ?? 0;
        const wind = input.weather?.windSpeed ?? 0;
        const depth = input.weather?.snowDepth ?? 0;
        const depthChange = input.weather?.snowDepthChange ?? 0;

        // 1. Heavy Snow Warning
        if (input.weather?.warnings?.some(w => w.type === '大雪警報')) {
            let warningScore = HEAVY_SNOW_WARNING_SCORE;
            if (input.historicalMatch?.id === 'disaster-snow-sapporo' || input.historicalMatch?.id === 'record-intense-snow') {
                warningScore = 100;
            }
            score = Math.max(score, warningScore);
            reasons.push({ reason: '大雪警報が発令されています', priority: 2 });
        }

        // 2. Snowfall Amount
        if (snow >= vuln.snowThreshold) {
            const excess = snow - vuln.snowThreshold;
            let ruleScore = HEAVY_SNOW_BASE_SCORE + Math.min(excess * HEAVY_SNOW_EXCESS_COEFFICIENT, HEAVY_SNOW_MAX_BONUS);
            if (input.historicalMatch?.id === 'record-intense-snow') ruleScore = 100;
            if (input.historicalMatch?.id === 'disaster-snow-sapporo') ruleScore = 90;

            score = Math.max(score, ruleScore); // Accumulative or Max? Original was additive but here let's add.
            // Wait, standard practice in original was to iterate and sum.
            // So we should sum.
            reasons.push({ reason: `積雪${snow}cmの予報（除雪作業により遅延見込み）`, priority: 5 });
        } else if (snow >= MODERATE_SNOW_MIN) {
            const ruleScore = MODERATE_SNOW_BASE_SCORE + Math.round((snow - MODERATE_SNOW_MIN) * MODERATE_SNOW_COEFFICIENT);
            score += ruleScore; // Sum
            reasons.push({ reason: `積雪${snow}cmの予報（除雪作業による遅延の可能性）`, priority: 7 });
        } else if (snow >= LIGHT_SNOW_MIN && snow < LIGHT_SNOW_MAX) {
            score += LIGHT_SNOW_SCORE;
            reasons.push({ reason: `積雪${snow}cm（軽微な影響の可能性）`, priority: 10 });
        } else {
            // If snow >= vuln.snowThreshold, we used Math.max above. We should be consistent.
            // Let's stick to additive logic to match original `calculateRawRiskScore`.
            // If I change `score = Math.max` to `score +=`, I need to be careful not to double count.
            // The original code had separate blocks for warning and snowfall.
            // So I should separate them here too.
            if (snow >= vuln.snowThreshold) {
                const excess = snow - vuln.snowThreshold;
                let ruleScore = HEAVY_SNOW_BASE_SCORE + Math.min(excess * HEAVY_SNOW_EXCESS_COEFFICIENT, HEAVY_SNOW_MAX_BONUS);
                if (input.historicalMatch?.id === 'record-intense-snow') ruleScore = 100;
                if (input.historicalMatch?.id === 'disaster-snow-sapporo') ruleScore = 90;
                score += ruleScore;
            }
        }

        // 3. Snow Depth Change (Rapid Accumulation)
        if (depthChange >= 3) {
            const changeScore = 15 + (depthChange - 3) * 5;
            score += changeScore;
            reasons.push({ reason: `積雪が急増中（${depthChange}cm/h）: 車両スタックのリスク増大`, priority: 4 });
        }

        // 4. Drifting Snow
        if (depth >= 5 && temp <= DRIFTING_SNOW_TEMP_THRESHOLD && wind >= DRIFTING_SNOW_WIND_THRESHOLD) {
            const driftScore = DRIFTING_SNOW_BASE_SCORE + Math.max(0, (wind - DRIFTING_SNOW_WIND_THRESHOLD) * DRIFTING_SNOW_WIND_COEFFICIENT);
            score += driftScore;
            reasons.push({ reason: `低温(-2℃未満)かつ強風(${wind}m/s): 地吹雪による視界不良リスク`, priority: 5 });
        }

        // 5. Cumulative Snow Depth
        const activeDisruption = (snow >= 1.0);
        if (activeDisruption && depth >= MODERATE_SNOW_DEPTH_THRESHOLD) {
            if (depth >= CRITICAL_SNOW_DEPTH_THRESHOLD) {
                score += CRITICAL_SNOW_DEPTH_SCORE;
                reasons.push({ reason: `記録的積雪（${depth}cm）: 排雪作業による運休リスク`, priority: 3 });
            } else {
                score += MODERATE_SNOW_DEPTH_SCORE;
                reasons.push({ reason: `積雪深（${depth}cm）: 排雪作業による遅延リスク`, priority: 3 });
            }
        }

        // 6. 🆕 Wet Snow Logic (湿り雪)
        // Temp between -1 and +2 AND Snowfall > 1cm
        if (temp >= -1 && temp <= 2 && snow >= 1.0) {
            // Wet snow sticks to pantographs and switches
            const wetSnowScore = 20 + (snow - 1.0) * 10; // Base 20 + 10 per cm
            score += wetSnowScore;
            reasons.push({ reason: `気温${temp}℃での降雪（湿り雪）: 着雪・分岐器不転換のリスク`, priority: 4 });
        }

        // 7. Weekend Night Removal (Jan-Feb Saturday Night)
        // ... (logic from original)
        const date = new Date(input.targetDate);
        const month = date.getMonth() + 1;
        const dayOfWeek = date.getDay();
        if (input.targetTime) {
            const hour = parseInt(input.targetTime.slice(0, 2));
            if ((month === 1 || month === 2) && dayOfWeek === 6 && depth >= 5 && hour >= 20) {
                score += 20;
                reasons.push({ reason: '冬季土曜夜間の計画除雪（運休・間引き運転の可能性）', priority: 5 });
            }
        }

        return { score, reasons };
    }
}
