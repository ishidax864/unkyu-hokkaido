
import { PredictionInput, VulnerabilityData } from '../../types';

export interface RiskFactorResult {
    score: number;
    reasons: {
        reason: string;
        priority: number;
    }[];
}

export interface RiskFactorStrategy {
    name: string;
    evaluate(input: PredictionInput, vulnerability: VulnerabilityData): RiskFactorResult;
}
