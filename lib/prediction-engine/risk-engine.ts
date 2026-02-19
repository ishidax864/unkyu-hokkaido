
import { PredictionInput, VulnerabilityData } from '../types';
import { RiskFactorStrategy, RiskFactorResult } from './strategies/base';
import { WindStrategy } from './strategies/wind';
import { SnowStrategy } from './strategies/snow';
import { RainStrategy } from './strategies/rain';
import { OfficialStatusStrategy } from './strategies/official';
import { OtherFactorsStrategy } from './strategies/other';

export class RiskEngine {
    private strategies: RiskFactorStrategy[];

    constructor() {
        this.strategies = [
            new OfficialStatusStrategy(), // Priority 0 logic (but weights are summed anyway, sort later)
            new WindStrategy(),
            new SnowStrategy(),
            new RainStrategy(),
            new OtherFactorsStrategy()
        ];
    }

    public calculateRisk(input: PredictionInput, vuln: VulnerabilityData): { totalScore: number, reasons: { reason: string, priority: number }[] } {
        let totalScore = 0;
        let allReasons: { reason: string, priority: number }[] = [];

        for (const strategy of this.strategies) {
            const result = strategy.evaluate(input, vuln);
            totalScore += result.score;
            allReasons = allReasons.concat(result.reasons);
        }

        // Apply Route Vulnerability Score (Global Multiplier)
        // Original logic: sum(weight * vulnScore) = sum(weight) * vulnScore
        if (vuln.vulnerabilityScore !== 1.0) {
            totalScore = Math.round(totalScore * vuln.vulnerabilityScore);
        }

        return { totalScore, reasons: allReasons };
    }
}
