
import { PredictionInput, VulnerabilityData } from '../../types';
import { RiskFactorStrategy, RiskFactorResult } from './base';
import { getJRStatusWeight } from '../../jr-status';
import { getRecencyWeight } from '../helpers';

export class OfficialStatusStrategy implements RiskFactorStrategy {
    name = 'OfficialStatusStrategy';

    evaluate(input: PredictionInput, vuln: VulnerabilityData): RiskFactorResult {
        let score = 0;
        const reasons: { reason: string; priority: number }[] = [];

        if (input.jrStatus != null && input.jrStatus.status !== 'normal') {
            const base = getJRStatusWeight(input.jrStatus.status);
            const recency = getRecencyWeight(input.jrStatus.updatedAt);
            score = Math.round(base * recency);
            reasons.push({
                reason: `【公式】${input.jrStatus.statusText || 'JR北海道運行情報で遅れ・運休'}`,
                priority: 0
            });
        }

        return { score, reasons };
    }
}
