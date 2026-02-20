import { describe, it, expect, vi } from 'vitest';
import { RISK_FACTORS, DEFAULT_VULNERABILITY } from '../../lib/prediction-engine/risk-factors';
import { PredictionInput, WeatherData } from '../../types';

// Mock helpers if needed, but RISK_FACTORS mostly uses pure functions or constants
// We might need to mock getJRStatusWeight or getRecencyWeight if they are complex, 
// but for now let's test the weather-based factors which are core.

describe('RISK_FACTORS', () => {
    const mockVulnerability = DEFAULT_VULNERABILITY;

    const createMockInput = (weather: Partial<WeatherData>): PredictionInput => ({
        routeId: 'test-route',
        routeName: 'Test Route',
        targetDate: '2024-01-01',
        targetTime: '12:00',
        weather: {
            temperature: -5,
            windSpeed: 0,
            windGust: 0,
            snowfall: 0,
            snowDepth: 0,
            precipitation: 0,
            warnings: [],
            ...weather
        } as WeatherData,
    });

    it('should trigger Storm Warning score', () => {
        const factor = RISK_FACTORS.find(f => f.priority === 1)!;
        const input = createMockInput({
            warnings: [{ type: '暴風警報', level: 'warning' }]
        });

        expect(factor.condition(input, mockVulnerability)).toBe(true);
        // STORM_WARNING_SCORE is imported constant, but we expect a high score
        expect(factor.weight(input, mockVulnerability)).toBeGreaterThan(0);
    });

    it('should trigger Heavy Snow Warning score', () => {
        const factor = RISK_FACTORS.find(f => f.priority === 2)!;
        const input = createMockInput({
            warnings: [{ type: '大雪警報', level: 'warning' }]
        });

        expect(factor.condition(input, mockVulnerability)).toBe(true);
    });

    it('should calculate strong wind score correctly', () => {
        const factor = RISK_FACTORS.find(f => f.priority === 4)!; // Route-specific wind threshold
        const input = createMockInput({
            windSpeed: 20 // Threshold is 15
        });

        expect(factor.condition(input, mockVulnerability)).toBe(true);
        const score = factor.weight(input, mockVulnerability);
        expect(score).toBeGreaterThan(0);
    });

    it('should calculate heavy snow score correctly', () => {
        const factor = RISK_FACTORS.find(f => f.priority === 5)!; // Route-specific snow threshold
        const input = createMockInput({
            snowfall: 10 // Threshold is 5
        });

        expect(factor.condition(input, mockVulnerability)).toBe(true);
        const score = factor.weight(input, mockVulnerability);
        expect(score).toBeGreaterThan(0);
    });

    it('should trigger drifting snow risk', () => {
        // Find by unique reason text part or priority/logic
        // Drifting snow: priority 5, checks temp <= -2 and wind >= 10 and depth >= 5
        const factor = RISK_FACTORS.find(f => f.reason({} as any).includes('地吹雪'))!;

        const input = createMockInput({
            temperature: -5,
            windSpeed: 12, // > 10
            snowDepth: 10 // > 5
        });

        expect(factor.condition(input, mockVulnerability)).toBe(true);
    });

    it('should NOT trigger drifting snow risk if warm', () => {
        const factor = RISK_FACTORS.find(f => f.reason({} as any).includes('地吹雪'))!;

        const input = createMockInput({
            temperature: 0, // > -2
            windSpeed: 12,
            snowDepth: 10
        });

        expect(factor.condition(input, mockVulnerability)).toBe(false);
    });

    it('should trigger Wet Snow risk', () => {
        // Wet snow: temp -1 to 1.5, snow > 0
        const factor = RISK_FACTORS.find(f => f.reason({} as any).includes('湿った雪'))!;

        const input = createMockInput({
            temperature: 0.5,
            snowfall: 2
        });

        expect(factor.condition(input, mockVulnerability)).toBe(true);
        expect(factor.weight(input, mockVulnerability)).toBe(20);
    });

    it('should NOT trigger Wet Snow risk if too cold', () => {
        const factor = RISK_FACTORS.find(f => f.reason({} as any).includes('湿った雪'))!;

        const input = createMockInput({
            temperature: -5, // Too cold, dry snow
            snowfall: 2
        });

        expect(factor.condition(input, mockVulnerability)).toBe(false);
    });
});
