import { describe, it, expect } from 'vitest';
import { evaluateActionDecision } from '../../lib/action-decision';
import { PredictionResult } from '../../lib/types';

function makePrediction(overrides: Partial<PredictionResult>): PredictionResult {
    return {
        routeId: 'jr-hokkaido.hakodate',
        targetDate: '2026-02-20',
        probability: 0,
        status: '平常運転',
        confidence: 'high',
        reasons: ['問題なし'],
        weatherImpact: 'なし',
        updatedAt: new Date().toISOString(),
        mode: 'risk',
        isCurrentlySuspended: false,
        ...overrides,
    };
}

describe('evaluateActionDecision', () => {
    describe('CRITICAL', () => {
        it('should return CRITICAL for probability >= 80', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 85 }));
            expect(result.type).toBe('CRITICAL');
            expect(result.title).toBe('移動困難');
            expect(result.title).not.toContain('Severe');
        });

        it('should return CRITICAL for status 運休中', () => {
            const result = evaluateActionDecision(makePrediction({ status: '運休中', probability: 100, isCurrentlySuspended: true }));
            expect(result.type).toBe('CRITICAL');
        });

        it('should include resumption estimate in nextAction when time is known', () => {
            const result = evaluateActionDecision(makePrediction({
                probability: 100,
                status: '運休中',
                estimatedRecoveryTime: '15:30頃',
            }));
            expect(result.type).toBe('CRITICAL');
            expect(result.nextAction).toContain('15:30頃');
        });

        it('should advise hotel for 終日運休', () => {
            const result = evaluateActionDecision(makePrediction({
                probability: 100,
                status: '運休中',
                estimatedRecoveryTime: '終日運休',
            }));
            expect(result.nextAction).toContain('ホテル');
        });
    });

    describe('HIGH_RISK', () => {
        it('should return HIGH_RISK for probability >= 50', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 60 }));
            expect(result.type).toBe('HIGH_RISK');
            expect(result.title).toBe('警戒');
            expect(result.title).not.toContain('High Risk');
        });

        it('should return HIGH_RISK for partial suspension regardless of probability', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 10, isPartialSuspension: true }));
            expect(result.type).toBe('HIGH_RISK');
            expect(result.nextAction).toContain('一部列車');
        });
    });

    describe('CAUTION', () => {
        it('should return CAUTION for probability >= 20', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 30 }));
            expect(result.type).toBe('CAUTION');
            expect(result.title).toBe('注意');
            expect(result.title).not.toContain('Caution');
        });

        it('should return CAUTION for post-resumption chaos', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 5, isPostResumptionChaos: true }));
            expect(result.type).toBe('CAUTION');
            expect(result.nextAction).toContain('乗り継げない');
        });

        it('should return CAUTION for 遅延 status', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 10, status: '遅延' }));
            expect(result.type).toBe('CAUTION');
        });
    });

    describe('NORMAL', () => {
        it('should return NORMAL for probability < 20', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 5 }));
            expect(result.type).toBe('NORMAL');
            expect(result.title).toBe('平常運転見込み');
            expect(result.title).not.toContain('Normal');
        });
    });
});
