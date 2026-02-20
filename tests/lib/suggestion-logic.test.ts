import { describe, it, expect } from 'vitest';
import {
    generateStrategicAdvice,
    calculateTrafficRisk,
    checkAlternativeAvailability,
} from '@/lib/suggestion-logic';
import type { PredictionResult } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<PredictionResult>): PredictionResult {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return {
        routeId: 'test-route',
        routeName: 'テスト路線',
        probability: 0,
        status: '平常運転',
        reasons: [],
        targetDate: todayStr,
        estimatedRecoveryHours: undefined,
        isOfficialOverride: false,
        ...overrides,
    } as PredictionResult;
}

// ---------------------------------------------------------------------------
// generateStrategicAdvice
// ---------------------------------------------------------------------------

describe('generateStrategicAdvice', () => {
    it('終日運休 → alert アドバイス', () => {
        const result = makeResult({
            status: '運休',
            estimatedRecoveryHours: '終日運休' as unknown as number,
        });
        const advice = generateStrategicAdvice(result);
        expect(advice).not.toBeNull();
        expect(advice!.type).toBe('alert');
        expect(advice!.message).toContain('終日運休');
    });

    it('運休中・復旧まで4時間以上 → critical「長期戦」アドバイス', () => {
        const result = makeResult({
            status: '運休中',
            estimatedRecoveryHours: 6,
        });
        const advice = generateStrategicAdvice(result);
        expect(advice).not.toBeNull();
        expect(advice!.type).toBe('critical');
        expect(advice!.title).toContain('長期戦');
    });

    it('isOfficialOverride かつ recoveryHours 不明 → alert「目処立たず」', () => {
        const result = makeResult({
            status: '運転見合わせ',
            estimatedRecoveryHours: 0,
            isOfficialOverride: true,
        });
        const advice = generateStrategicAdvice(result);
        expect(advice).not.toBeNull();
        expect(advice!.type).toBe('alert');
        expect(advice!.message).toContain('目処が立っていません');
    });

    it('probability >= 70 → critical「運休リスクが非常に高い」', () => {
        const result = makeResult({ probability: 80 });
        const advice = generateStrategicAdvice(result);
        expect(advice).not.toBeNull();
        expect(advice!.type).toBe('critical');
        expect(advice!.title).toContain('非常に高い');
    });

    it('probability >= 50 かつ < 70 → warning アドバイス', () => {
        const result = makeResult({ probability: 55 });
        const advice = generateStrategicAdvice(result);
        expect(advice).not.toBeNull();
        expect(advice!.type).toBe('warning');
    });

    it('probability >= 30 かつ < 50 → info「遅延見込み」', () => {
        const result = makeResult({ probability: 35 });
        const advice = generateStrategicAdvice(result);
        expect(advice).not.toBeNull();
        expect(advice!.type).toBe('info');
        expect(advice!.title).toContain('遅延見込み');
    });

    it('probability < 30 → アドバイスなし（null）', () => {
        const result = makeResult({ probability: 10 });
        const advice = generateStrategicAdvice(result);
        expect(advice).toBeNull();
    });

    it('運休中・30分以内復旧 → info「まもなく再開」', () => {
        const result = makeResult({
            status: '運休中',
            estimatedRecoveryHours: 0.3,
        });
        const advice = generateStrategicAdvice(result);
        expect(advice).not.toBeNull();
        expect(advice!.type).toBe('info');
        expect(advice!.title).toContain('まもなく');
    });
});

// ---------------------------------------------------------------------------
// calculateTrafficRisk
// ---------------------------------------------------------------------------

describe('calculateTrafficRisk', () => {
    it('猛烈な雪 → multiplier 2.0', () => {
        const result = makeResult({ reasons: ['猛烈な雪が降っています'] });
        const risk = calculateTrafficRisk(result);
        expect(risk.multiplier).toBe(2.0);
        expect(risk.warning).not.toBeNull();
    });

    it('普通の雪 → multiplier 1.5', () => {
        const result = makeResult({ reasons: ['雪により遅延の恐れ'] });
        const risk = calculateTrafficRisk(result);
        expect(risk.multiplier).toBe(1.5);
    });

    it('晴天 → multiplier 1.0・警告なし', () => {
        const result = makeResult({ reasons: [] });
        const risk = calculateTrafficRisk(result);
        expect(risk.multiplier).toBe(1);
        expect(risk.warning).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// checkAlternativeAvailability
// ---------------------------------------------------------------------------

describe('checkAlternativeAvailability', () => {
    it('具体的な代替案あり → showSubways=false (UnifiedAlternativesCard に委譲)', () => {
        const result = makeResult({ reasons: [] });
        const avail = checkAlternativeAvailability('sapporo-chitose', result, true, true);
        expect(avail.showSubways).toBe(false);
        expect(avail.showBuses).toBe(false);
    });

    it('代替案なし・札幌エリア・通常時 → showSubways=true', () => {
        const result = makeResult({ reasons: [] });
        const avail = checkAlternativeAvailability('sapporo-chitose', result, false, true);
        expect(avail.showSubways).toBe(true);
    });

    it('猛烈な雪のとき → showBuses=false・警告あり', () => {
        const result = makeResult({ reasons: ['猛烈な雪'] });
        const avail = checkAlternativeAvailability('sapporo-chitose', result, false, true);
        expect(avail.showBuses).toBe(false);
        expect(avail.warningMessage).toContain('バスやタクシー');
    });
});
