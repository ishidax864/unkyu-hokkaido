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
            expect(result.title).toBe('運転見合わせ中');
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
            expect(result.nextAction).toContain('運転再開見込み');
        });

        it('should advise alternatives for 終日運休', () => {
            const result = evaluateActionDecision(makePrediction({
                probability: 100,
                status: '運休中',
                estimatedRecoveryTime: '終日運休',
            }));
            expect(result.nextAction).toContain('復旧は見込めません');
            expect(result.nextAction).toContain('代替手段');
        });

        it('should advise alternatives when no recovery time', () => {
            const result = evaluateActionDecision(makePrediction({
                probability: 100,
                status: '運休中',
            }));
            expect(result.nextAction).toContain('代替手段');
            expect(result.resumptionEstimate).toContain('未定');
        });
    });

    describe('HIGH_RISK', () => {
        it('should return HIGH_RISK for probability >= 50', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 60 }));
            expect(result.type).toBe('HIGH_RISK');
            expect(result.title).toBe('運休リスク高');
            expect(result.title).not.toContain('High Risk');
        });

        it('should return HIGH_RISK for partial suspension regardless of probability', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 10, isPartialSuspension: true }));
            expect(result.type).toBe('HIGH_RISK');
            expect(result.title).toBe('一部区間で運休中');
        });

        it('should show recovery time for partial suspension when available', () => {
            const result = evaluateActionDecision(makePrediction({
                probability: 10,
                isPartialSuspension: true,
                estimatedRecoveryTime: '14:00頃',
            }));
            expect(result.nextAction).toContain('14:00頃');
            expect(result.nextAction).toContain('通常ダイヤに戻る');
        });

        it('should suggest alternatives for partial suspension without recovery time', () => {
            const result = evaluateActionDecision(makePrediction({
                probability: 10,
                isPartialSuspension: true,
            }));
            expect(result.nextAction).toContain('代替ルート');
        });
    });

    describe('CAUTION', () => {
        it('should return CAUTION for probability >= 20', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 30 }));
            expect(result.type).toBe('CAUTION');
            expect(result.title).toBe('遅延リスクあり');
            expect(result.title).not.toContain('Caution');
        });

        it('should return CAUTION for post-resumption chaos', () => {
            const result = evaluateActionDecision(makePrediction({ probability: 5, isPostResumptionChaos: true }));
            expect(result.type).toBe('CAUTION');
            expect(result.title).toBe('ダイヤ乱れ中');
            expect(result.nextAction).toContain('1本前の列車');
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
            expect(result.title).toBe('平常運転');
            expect(result.nextAction).toContain('通常通り');
        });
    });

    describe('POST-RECOVERY WINDOW', () => {
        it('復旧後ウィンドウ（高確率） → HIGH_RISK「ダイヤ乱れ警戒」', () => {
            const result = evaluateActionDecision(makePrediction({
                probability: 55,
                isPostRecoveryWindow: true,
                estimatedRecoveryTime: '15:00頃',
            }));
            expect(result.type).toBe('HIGH_RISK');
            expect(result.title).toContain('ダイヤ乱れ');
            expect(result.nextAction).toContain('15:00頃');
            expect(result.nextAction).toContain('運転再開済み');
        });

        it('復旧後ウィンドウ（低確率） → CAUTION「ダイヤ乱れ注意」', () => {
            const result = evaluateActionDecision(makePrediction({
                probability: 25,
                isPostRecoveryWindow: true,
                estimatedRecoveryTime: '14:00頃',
            }));
            expect(result.type).toBe('CAUTION');
            expect(result.title).toContain('ダイヤ乱れ注意');
        });

        it('CRITICALにならない — 復旧後なのに「移動困難」は矛盾', () => {
            const result = evaluateActionDecision(makePrediction({
                probability: 95,
                isPostRecoveryWindow: true,
                estimatedRecoveryTime: '15:00頃',
            }));
            expect(result.type).not.toBe('CRITICAL');
        });
    });
});
