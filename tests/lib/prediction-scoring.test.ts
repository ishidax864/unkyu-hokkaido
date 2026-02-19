import { describe, it, expect } from 'vitest';
import { calculateAccuracyScore } from '../../lib/prediction-engine/scoring';

describe('Prediction Accuracy Scoring', () => {
    describe('Suspension Outcomes (suspended, stopped, partial_suspended)', () => {
        it('should give 100 points for probabilities >= 50%', () => {
            expect(calculateAccuracyScore(50, 'suspended')).toBe(100);
            expect(calculateAccuracyScore(90, 'stopped')).toBe(100);
        });

        it('should give scaled score for probabilities between 30% and 50%', () => {
            // formula: 70 + (prob - 30) * 1.5
            expect(calculateAccuracyScore(30, 'suspended')).toBe(70);
            expect(calculateAccuracyScore(40, 'partial_suspended')).toBe(85);
        });

        it('should give low score (20) for probabilities below 30% (serious miss)', () => {
            expect(calculateAccuracyScore(20, 'suspended')).toBe(20);
            expect(calculateAccuracyScore(5, 'suspended')).toBe(20);
        });
    });

    describe('Normal Outcomes (normal)', () => {
        it('should give 100 points for probabilities <= 20%', () => {
            expect(calculateAccuracyScore(10, 'normal')).toBe(100);
            expect(calculateAccuracyScore(20, 'normal')).toBe(100);
        });

        it('should give scaled score for probabilities between 20% and 50%', () => {
            // formula: 100 - (prob - 20) * 2
            expect(calculateAccuracyScore(30, 'normal')).toBe(80);
            expect(calculateAccuracyScore(45, 'normal')).toBe(50);
        });

        it('should give very low score (10) for probabilities above 50% (false alarm)', () => {
            expect(calculateAccuracyScore(60, 'normal')).toBe(10);
            expect(calculateAccuracyScore(95, 'normal')).toBe(10);
        });
    });

    describe('Delayed Outcomes (delayed)', () => {
        it('should give 100 points for probabilities between 30% and 70%', () => {
            expect(calculateAccuracyScore(30, 'delayed')).toBe(100);
            expect(calculateAccuracyScore(50, 'delayed')).toBe(100);
            expect(calculateAccuracyScore(70, 'delayed')).toBe(100);
        });

        it('should give confidence-based score for probabilities < 30%', () => {
            // formula: 50 + prob
            expect(calculateAccuracyScore(10, 'delayed')).toBe(60);
            expect(calculateAccuracyScore(25, 'delayed')).toBe(75);
        });

        it('should give high but not perfect score for probabilities > 70%', () => {
            expect(calculateAccuracyScore(80, 'delayed')).toBe(80);
            expect(calculateAccuracyScore(100, 'delayed')).toBe(80);
        });
    });

    describe('Edge Cases', () => {
        it('should give 50 points for unknown status', () => {
            expect(calculateAccuracyScore(50, 'unknown')).toBe(50);
        });

        it('should handle boundary probabilities (0, 100)', () => {
            expect(calculateAccuracyScore(0, 'normal')).toBe(100);
            expect(calculateAccuracyScore(100, 'suspended')).toBe(100);
            expect(calculateAccuracyScore(0, 'suspended')).toBe(20);
        });
    });
});
