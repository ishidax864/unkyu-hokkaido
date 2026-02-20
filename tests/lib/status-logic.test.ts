import { describe, it, expect } from 'vitest';
import { determineBaseStatus } from '../../lib/prediction-engine/status-logic';

const TODAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const TOMORROW = new Date(Date.now() + 86400 * 1000).toISOString().split('T')[0];

describe('determineBaseStatus', () => {
    describe('No JR Status', () => {
        it('should return wide bounds when jrStatus is null', () => {
            const result = determineBaseStatus(null, TODAY, '12:00');
            expect(result.isOfficialSuspended).toBe(false);
            expect(result.minProbability).toBe(0);
            expect(result.maxProbability).toBe(100);
        });
    });

    describe('Normal Status', () => {
        it('should cap at 75% when JR reports normal', () => {
            const result = determineBaseStatus({ status: 'normal' }, TODAY, '12:00');
            expect(result.status).toBe('平常運転');
            expect(result.isOfficialSuspended).toBe(false);
            expect(result.maxProbability).toBe(75);
            expect(result.overrideReason).toBeUndefined();
        });
    });

    describe('Delay Status', () => {
        it('should set floor 40% and cap 75% for delays', () => {
            const result = determineBaseStatus({ status: 'delay' }, TODAY, '12:00');
            expect(result.status).toBe('遅延');
            expect(result.minProbability).toBe(40);
            expect(result.maxProbability).toBe(75);
            expect(result.overrideReason).toContain('遅れ');
        });
    });

    describe('Full Suspension', () => {
        it('should force 100% when suspended and no resumption time', () => {
            const result = determineBaseStatus(
                { status: 'suspended', rawText: '運転を見合わせています' },
                TODAY,
                '12:00'
            );
            expect(result.isOfficialSuspended).toBe(true);
            expect(result.minProbability).toBe(100);
            expect(result.maxProbability).toBe(100);
            expect(result.overrideReason).toContain('運転を見合わせて');
        });

        it('should apply post-resumption chaos window when resumption is in future', () => {
            // Resumption time is 2 hours from now
            const resumptionTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
            // Target time is 1 hour from now (within chaos window)
            const targetHour = (new Date().getHours() + 1) % 24;
            const targetTime = `${String(targetHour).padStart(2, '0')}:00`;
            const result = determineBaseStatus(
                { status: 'suspended', resumptionTime },
                TODAY,
                targetTime
            );
            // Target is BEFORE resumption -> still suspended
            expect(result.isOfficialSuspended).toBe(true);
            expect(result.minProbability).toBe(100);
        });
    });

    describe('Partial Suspension', () => {
        it('should detect 一部運休 keyword', () => {
            const result = determineBaseStatus(
                { status: 'suspended', rawText: '一部運休しています' },
                TODAY,
                '12:00'
            );
            expect(result.isPartialSuspension).toBe(true);
            expect(result.minProbability).toBe(60);
            expect(result.maxProbability).toBe(95);
        });

        it('should detect 減便 keyword', () => {
            const result = determineBaseStatus(
                { status: 'normal', rawText: '本日は減便により運転します' },
                TODAY,
                '12:00'
            );
            expect(result.isPartialSuspension).toBe(true);
        });

        it('should detect status===partial', () => {
            const result = determineBaseStatus(
                { status: 'partial' },
                TODAY,
                '12:00'
            );
            expect(result.isPartialSuspension).toBe(true);
            expect(result.isOfficialSuspended).toBe(false);
        });
    });
});
