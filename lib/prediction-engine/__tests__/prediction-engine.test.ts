import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PredictionInput, VulnerabilityData, WeatherForecast } from '../../types';
import { WindStrategy } from '../strategies/wind';
import { SnowStrategy } from '../strategies/snow';
import { RainStrategy } from '../strategies/rain';
import { OfficialStatusStrategy } from '../strategies/official';
import { OtherFactorsStrategy } from '../strategies/other';
import { RiskEngine } from '../risk-engine';
import { calculateAccuracyScore } from '../scoring';
import {
    calculateCompoundRisk,
    calculateWinterRisk,
    determineMaxProbability,
    applyConfidenceFilter,
    applyHistoricalDataAdjustment,
    getRecencyWeight,
    determineSuspensionReason,
} from '../helpers';

// =====================
// Test Fixtures
// =====================

function makeWeather(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
    return {
        date: '2026-01-15',
        weather: '晴れ',
        tempMax: 0,
        tempMin: -5,
        precipitation: 0,
        windSpeed: 5,
        snowfall: 0,
        snowDepth: 0,
        snowDepthChange: 0,
        windGust: 8,
        windDirection: 180,
        temperature: -3,
        pressure: 1013,
        weatherCode: 0,
        warnings: [],
        targetTime: '08:00',
        ...overrides,
    };
}

function makeInput(overrides: Partial<PredictionInput> = {}): PredictionInput {
    return {
        routeId: 'jr-hokkaido.chitose',
        routeName: '千歳線',
        targetDate: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date()),
        targetTime: '08:00',
        weather: makeWeather(),
        jrStatus: null,
        crowdsourcedStatus: null,
        historicalData: null,
        officialHistory: null,
        historicalMatch: null,
        ...overrides,
    };
}

const defaultVuln: VulnerabilityData = {
    windThreshold: 18,
    snowThreshold: 4,
    vulnerabilityScore: 1.4,
    description: '千歳線',
    hasDeerRisk: false,
    safeWindDirections: [[350, 360], [0, 10]],
};

const highVuln: VulnerabilityData = {
    windThreshold: 14,
    snowThreshold: 3,
    vulnerabilityScore: 1.6,
    description: '釧網本線',
    hasDeerRisk: true,
};

// =====================
// WindStrategy Tests
// =====================

describe('WindStrategy', () => {
    const strategy = new WindStrategy();

    it('returns 0 score for calm winds', () => {
        const input = makeInput({ weather: makeWeather({ windSpeed: 3, windGust: 5 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(0);
        expect(result.reasons).toHaveLength(0);
    });

    it('adds light wind score for 5-10 m/s', () => {
        const input = makeInput({ weather: makeWeather({ windSpeed: 7, windGust: 10 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThan(0);
        expect(result.reasons.some(r => r.reason.includes('軽微'))).toBe(true);
    });

    it('adds moderate wind score near threshold', () => {
        const input = makeInput({ weather: makeWeather({ windSpeed: 15, windGust: 20 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThanOrEqual(10);
        expect(result.reasons.some(r => r.reason.includes('徐行運転'))).toBe(true);
    });

    it('adds strong wind score above threshold', () => {
        const input = makeInput({ weather: makeWeather({ windSpeed: 22, windGust: 30 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThanOrEqual(50);
        expect(result.reasons.some(r => r.reason.includes('運転規制基準'))).toBe(true);
    });

    it('applies safe wind direction multiplier', () => {
        const dangerousDir = makeInput({ weather: makeWeather({ windSpeed: 20, windGust: 25, windDirection: 180 }) });
        const safeDir = makeInput({ weather: makeWeather({ windSpeed: 20, windGust: 25, windDirection: 355 }) });

        const dangerousResult = strategy.evaluate(dangerousDir, defaultVuln);
        const safeResult = strategy.evaluate(safeDir, defaultVuln);

        expect(safeResult.score).toBeLessThan(dangerousResult.score);
    });

    it('adds gust score for strong gusts', () => {
        const input = makeInput({ weather: makeWeather({ windSpeed: 12, windGust: 25 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.reasons.some(r => r.reason.includes('瞬間風速'))).toBe(true);
    });

    it('detects storm warning', () => {
        const input = makeInput({
            weather: makeWeather({
                windSpeed: 25,
                windGust: 35,
                warnings: [{ type: '暴風警報', area: '石狩', issuedAt: new Date().toISOString() }],
            }),
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThanOrEqual(80);
        expect(result.reasons.some(r => r.reason.includes('暴風警報'))).toBe(true);
    });
});

// =====================
// SnowStrategy Tests
// =====================

describe('SnowStrategy', () => {
    const strategy = new SnowStrategy();

    it('returns 0 for no snow', () => {
        const input = makeInput({ weather: makeWeather({ snowfall: 0, snowDepth: 0 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(0);
    });

    it('adds light snow score for 0.5-2 cm/h', () => {
        const input = makeInput({ weather: makeWeather({ snowfall: 1, snowDepth: 5 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThan(0);
    });

    it('adds moderate snow score for near-threshold', () => {
        const input = makeInput({ weather: makeWeather({ snowfall: 3, snowDepth: 10 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThanOrEqual(20);
    });

    it('adds heavy snow score above threshold', () => {
        const input = makeInput({ weather: makeWeather({ snowfall: 8, snowDepth: 30 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThanOrEqual(60);
    });

    it('detects drifting snow conditions', () => {
        const input = makeInput({
            weather: makeWeather({
                snowfall: 0.5,
                snowDepth: 20,
                temperature: -5,
                windSpeed: 12,
            }),
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.reasons.some(r => r.reason.includes('地吹雪'))).toBe(true);
    });

    it('detects wet snow conditions', () => {
        const input = makeInput({
            weather: makeWeather({
                snowfall: 2,
                snowDepth: 10,
                temperature: 0.5,
            }),
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.reasons.some(r => r.reason.includes('湿り雪'))).toBe(true);
    });

    it('detects rapid snow accumulation', () => {
        const input = makeInput({
            weather: makeWeather({
                snowfall: 3,
                snowDepthChange: 5,
                snowDepth: 25,
            }),
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.reasons.some(r => r.reason.includes('急増'))).toBe(true);
    });

    it('detects heavy snow warning with historical override', () => {
        const input = makeInput({
            weather: makeWeather({
                snowfall: 10,
                snowDepth: 50,
                warnings: [{ type: '大雪警報', area: '石狩', issuedAt: new Date().toISOString() }],
            }),
            historicalMatch: { id: 'disaster-snow-sapporo', label: '札幌大雪' },
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('detects cumulative snow depth with active snowfall', () => {
        const input = makeInput({
            weather: makeWeather({
                snowfall: 2,
                snowDepth: 45,
            }),
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.reasons.some(r => r.reason.includes('排雪'))).toBe(true);
    });
});

// =====================
// RainStrategy Tests
// =====================

describe('RainStrategy', () => {
    const strategy = new RainStrategy();

    it('returns 0 for no rain', () => {
        const input = makeInput({ weather: makeWeather({ precipitation: 0 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(0);
    });

    it('adds moderate rain score for 10-30mm', () => {
        const input = makeInput({ weather: makeWeather({ precipitation: 20 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThan(0);
        expect(result.reasons.some(r => r.reason.includes('視界不良'))).toBe(true);
    });

    it('adds heavy rain score for 30mm+', () => {
        const input = makeInput({ weather: makeWeather({ precipitation: 50 }) });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThanOrEqual(25);
    });

    it('detects heavy rain warning', () => {
        const input = makeInput({
            weather: makeWeather({
                precipitation: 40,
                warnings: [{ type: '大雨警報', area: '胆振', issuedAt: new Date().toISOString() }],
            }),
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.reasons.some(r => r.reason.includes('大雨警報'))).toBe(true);
        // Both warning + rain amount should contribute
        expect(result.score).toBeGreaterThanOrEqual(60);
    });
});

// =====================
// OfficialStatusStrategy Tests
// =====================

describe('OfficialStatusStrategy', () => {
    const strategy = new OfficialStatusStrategy();
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

    it('returns 0 when no JR status', () => {
        const input = makeInput({ jrStatus: null });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(0);
    });

    it('returns 0 for normal status', () => {
        const input = makeInput({
            targetDate: today,
            jrStatus: { status: 'normal', updatedAt: new Date().toISOString() },
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(0);
    });

    it('returns high score for suspended status', () => {
        const input = makeInput({
            targetDate: today,
            jrStatus: { status: 'suspended', statusText: '運転見合わせ', updatedAt: new Date().toISOString() },
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThanOrEqual(50);
        expect(result.reasons.some(r => r.reason.includes('公式'))).toBe(true);
    });

    it('returns 0 for future dates', () => {
        const input = makeInput({
            targetDate: '2026-03-01',
            jrStatus: { status: 'suspended', statusText: '運転見合わせ', updatedAt: new Date().toISOString() },
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(0);
    });

    it('returns 0 when target time is after resumption', () => {
        const now = new Date();
        const resumption = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        const input = makeInput({
            targetDate: today,
            targetTime: '23:00',
            jrStatus: {
                status: 'suspended',
                statusText: '運転見合わせ',
                updatedAt: now.toISOString(),
                resumptionTime: resumption.toISOString(),
            },
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(0);
    });
});

// =====================
// OtherFactorsStrategy Tests
// =====================

describe('OtherFactorsStrategy', () => {
    const strategy = new OtherFactorsStrategy();

    it('returns 0 with no special conditions', () => {
        const input = makeInput();
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(0);
    });

    it('adds user report score for stopped consensus', () => {
        const input = makeInput({
            crowdsourcedStatus: {
                consensusStatus: 'stopped',
                reportCount: 5,
            },
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBeGreaterThanOrEqual(35);
        expect(result.reasons.some(r => r.reason.includes('ユーザー'))).toBe(true);
    });

    it('ignores reports below minimum count', () => {
        const input = makeInput({
            crowdsourcedStatus: {
                consensusStatus: 'stopped',
                reportCount: 2,
            },
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(0);
    });

    it('ignores normal consensus', () => {
        const input = makeInput({
            crowdsourcedStatus: {
                consensusStatus: 'normal',
                reportCount: 10,
            },
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.reasons.some(r => r.reason.includes('ユーザー'))).toBe(false);
    });

    it('detects deer risk in season and nighttime', () => {
        // Use December nighttime for deer risk
        const input = makeInput({
            targetDate: '2026-12-15',
            targetTime: '17:00',
            weather: makeWeather(),
        });
        const result = strategy.evaluate(input, highVuln);
        expect(result.score).toBe(10);
        expect(result.reasons.some(r => r.reason.includes('エゾシカ'))).toBe(true);
    });

    it('does not detect deer risk in summer', () => {
        const input = makeInput({
            targetDate: '2026-07-15',
            targetTime: '17:00',
            weather: makeWeather(),
        });
        const result = strategy.evaluate(input, highVuln);
        expect(result.reasons.some(r => r.reason.includes('エゾシカ'))).toBe(false);
    });

    it('does not detect deer risk for non-deer routes', () => {
        const input = makeInput({
            targetDate: '2026-12-15',
            targetTime: '17:00',
            weather: makeWeather(),
        });
        const result = strategy.evaluate(input, defaultVuln); // hasDeerRisk: false
        expect(result.reasons.some(r => r.reason.includes('エゾシカ'))).toBe(false);
    });

    it('adds thunder advisory score', () => {
        const input = makeInput({
            weather: makeWeather({
                warnings: [{ type: '雷注意報', area: '上川', issuedAt: new Date().toISOString() }],
            }),
        });
        const result = strategy.evaluate(input, defaultVuln);
        expect(result.score).toBe(10);
    });
});

// =====================
// RiskEngine Integration Tests
// =====================

describe('RiskEngine', () => {
    it('returns 0 for calm conditions', () => {
        const engine = new RiskEngine();
        const input = makeInput({
            weather: makeWeather({ windSpeed: 3, snowfall: 0, precipitation: 0 }),
        });
        const result = engine.calculateRisk(input, defaultVuln);
        expect(result.totalScore).toBeLessThanOrEqual(10);
    });

    it('accumulates scores from multiple strategies', () => {
        const engine = new RiskEngine();
        const input = makeInput({
            weather: makeWeather({
                windSpeed: 20,
                windGust: 28,
                snowfall: 5,
                snowDepth: 30,
                precipitation: 5,
            }),
        });
        const result = engine.calculateRisk(input, defaultVuln);
        // Both wind and snow should contribute
        expect(result.totalScore).toBeGreaterThanOrEqual(80);
        expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });

    it('applies vulnerability multiplier', () => {
        const engine = new RiskEngine();
        const input = makeInput({
            weather: makeWeather({ windSpeed: 15, snowfall: 3 }),
        });

        const lowVuln: VulnerabilityData = { ...defaultVuln, vulnerabilityScore: 1.0 };
        const resLow = engine.calculateRisk(input, lowVuln);
        const resHigh = engine.calculateRisk(input, highVuln);

        expect(resHigh.totalScore).toBeGreaterThan(resLow.totalScore);
    });
});

// =====================
// Helper Function Tests
// =====================

describe('calculateCompoundRisk', () => {
    it('returns 0 when both below 70% threshold', () => {
        expect(calculateCompoundRisk(5, 1, defaultVuln)).toBe(0);
    });

    it('returns positive when both above 70% threshold', () => {
        // 18 * 0.7 = 12.6, 4 * 0.7 = 2.8
        const result = calculateCompoundRisk(15, 3, defaultVuln);
        expect(result).toBeGreaterThan(0);
    });

    it('returns higher score when both exceed threshold', () => {
        const result = calculateCompoundRisk(20, 6, defaultVuln);
        expect(result).toBeGreaterThanOrEqual(25); // base + bonus
    });
});

describe('calculateWinterRisk', () => {
    it('returns positive for winter months', () => {
        const result = calculateWinterRisk('2026-01-15', defaultVuln);
        expect(result.score).toBeGreaterThan(0);
    });

    it('returns 0 for summer months', () => {
        const result = calculateWinterRisk('2026-07-15', defaultVuln);
        expect(result.score).toBe(0);
    });

    it('returns higher score for more vulnerable routes', () => {
        const resLow = calculateWinterRisk('2026-01-15', { ...defaultVuln, vulnerabilityScore: 1.0 });
        const resHigh = calculateWinterRisk('2026-01-15', { ...defaultVuln, vulnerabilityScore: 1.8 });
        expect(resHigh.score).toBeGreaterThan(resLow.score);
    });
});

describe('determineMaxProbability', () => {
    it('defaults to 85% without official data', () => {
        const input = makeInput({ jrStatus: null });
        expect(determineMaxProbability(input)).toBe(85);
    });

    it('returns 100% for suspended status', () => {
        const input = makeInput({
            jrStatus: { status: 'suspended', updatedAt: new Date().toISOString() },
        });
        expect(determineMaxProbability(input)).toBe(100);
    });

    it('caps at 35% for normal status in near-realtime', () => {
        const input = makeInput({
            jrStatus: { status: 'normal', updatedAt: new Date().toISOString() },
        });
        expect(determineMaxProbability(input, true)).toBe(35);
    });

    it('allows 50% for normal status with extreme weather', () => {
        const input = makeInput({
            jrStatus: { status: 'normal', updatedAt: new Date().toISOString() },
            weather: makeWeather({ windGust: 20, snowfall: 5 }),
        });
        expect(determineMaxProbability(input, true)).toBe(50);
    });
});

describe('applyConfidenceFilter', () => {
    it('does not filter strong weather signals', () => {
        const result = applyConfidenceFilter({
            probability: 50,
            totalScore: 60,
            windSpeed: 20,
            windGust: 30,
            snowfall: 5,
        });
        expect(result.wasFiltered).toBe(false);
        expect(result.filteredProbability).toBe(50);
    });

    it('filters weak weather in mid-range probability', () => {
        const result = applyConfidenceFilter({
            probability: 40,
            totalScore: 30,
            windSpeed: 8,
            windGust: 12,
            snowfall: 0.2,
        });
        expect(result.wasFiltered).toBe(true);
        expect(result.filteredProbability).toBeLessThan(40);
    });

    it('does not filter extreme weather even when official is normal', () => {
        const result = applyConfidenceFilter({
            probability: 50,
            totalScore: 40,
            windSpeed: 15,
            windGust: 30,
            snowfall: 0,
            jrStatus: 'normal',
            isNearRealTime: true,
        });
        expect(result.wasFiltered).toBe(false);
    });
});

describe('getRecencyWeight', () => {
    it('returns 1.0 for very recent data', () => {
        const now = new Date().toISOString();
        expect(getRecencyWeight(now)).toBe(1.0);
    });

    it('returns 0.5 for undefined', () => {
        expect(getRecencyWeight(undefined)).toBe(0.5);
    });

    it('returns 0.3 for very old data', () => {
        const old = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        expect(getRecencyWeight(old)).toBe(0.3);
    });
});

describe('determineSuspensionReason', () => {
    it('extracts reason from official text', () => {
        expect(determineSuspensionReason(5, 0, 0, '除雪作業のため運転見合わせ')).toBe('除雪作業のため');
        expect(determineSuspensionReason(5, 0, 0, '強風のため運転見合わせ')).toBe('強風のため');
        expect(determineSuspensionReason(5, 0, 0, '車両故障のため')).toBe('車両トラブルのため');
    });

    it('falls back to weather data when no official text', () => {
        expect(determineSuspensionReason(25, 0, 0)).toBe('強風のため');
        expect(determineSuspensionReason(5, 5, 0)).toBe('大雪のため');
        expect(determineSuspensionReason(5, 0, 40)).toBe('大雨のため');
        expect(determineSuspensionReason(5, 0, 5)).toBe('気象条件のため');
    });
});

describe('applyHistoricalDataAdjustment', () => {
    it('returns unchanged probability without historical data', () => {
        const result = applyHistoricalDataAdjustment(50, 85, null);
        expect(result.adjustedProbability).toBe(50);
    });

    it('blends historical data into probability', () => {
        const result = applyHistoricalDataAdjustment(30, 85, {
            suspensionRate: 60,
            avgSuspensionsPerWeek: 3,
            recentTrend: 'stable',
            totalReports: 100,
        });
        // 30 * 0.75 + 60 * 0.25 = 37.5
        expect(result.adjustedProbability).toBe(38);
    });

    it('adds bonus for increasing trend', () => {
        const result = applyHistoricalDataAdjustment(30, 85, {
            suspensionRate: 40,
            avgSuspensionsPerWeek: 5,
            recentTrend: 'increasing',
            totalReports: 100,
        });
        expect(result.additionalReasons.length).toBeGreaterThan(0);
        expect(result.additionalReasons[0].reason).toContain('増加傾向');
    });
});

// =====================
// Scoring Tests
// =====================

describe('calculateAccuracyScore', () => {
    it('returns 100 for high probability + suspension', () => {
        expect(calculateAccuracyScore(80, 'suspended')).toBe(100);
    });

    it('returns low score for low probability + suspension', () => {
        expect(calculateAccuracyScore(10, 'suspended')).toBe(20);
    });

    it('returns 100 for low probability + normal', () => {
        expect(calculateAccuracyScore(10, 'normal')).toBe(100);
    });

    it('returns low score for high probability + normal', () => {
        const score = calculateAccuracyScore(80, 'normal');
        expect(score).toBeLessThanOrEqual(20);
    });

    it('returns high score for mid probability + delayed', () => {
        expect(calculateAccuracyScore(50, 'delayed')).toBe(100);
    });
});
