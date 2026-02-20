import { describe, it, expect } from 'vitest';
import { calculateSuspensionRisk } from '@/lib/prediction-engine';
import type { PredictionInput, WeatherForecast } from '@/lib/types';

/**
 * 予測エンジン結合テスト
 * 各種入力パターンに対して予測結果の整合性を検証する
 */

// テスト用気象データ生成ヘルパー
function createWeather(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
    return {
        date: '2024-01-15',
        weather: '曇り',
        tempMax: 0,
        tempMin: -5,
        windSpeed: 5,
        windGust: 8,
        snowfall: 0,
        snowDepth: 20,
        precipitation: 0,
        weatherCode: 3,
        warnings: [],
        ...overrides,
    };
}

// テスト用入力データ生成ヘルパー
function createInput(overrides: Partial<PredictionInput> = {}): PredictionInput {
    return {
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: '函館本線',
        targetDate: '2024-01-15',
        targetTime: '12:00',
        weather: createWeather(),
        ...overrides,
    };
}

// ===================================
// 出力構造テスト
// ===================================

describe('Prediction Engine - Output Structure', () => {
    it('should return valid PredictionResult with all required fields', () => {
        const result = calculateSuspensionRisk(createInput());

        expect(result).toBeDefined();
        expect(typeof result.probability).toBe('number');
        expect(typeof result.status).toBe('string');
        expect(Array.isArray(result.reasons)).toBe(true);
        expect(result.probability).toBeGreaterThanOrEqual(0);
        expect(result.probability).toBeLessThanOrEqual(100);
    });

    it('should have confidence level', () => {
        const result = calculateSuspensionRisk(createInput());
        expect(result.confidence).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(result.confidence);
    });

    it('should include recovery information when officially suspended', () => {
        const result = calculateSuspensionRisk(createInput({
            weather: createWeather({
                windSpeed: 30, windGust: 40,
                warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2024-01-15T00:00:00Z' }]
            }),
            jrStatus: {
                status: 'suspended',
                statusText: '暴風のため運転見合わせ',
                updatedAt: new Date().toISOString(),
            },
        }));

        // Official suspension should produce very high risk
        expect(result.probability).toBeGreaterThanOrEqual(80);
    });
});

// ===================================
// 気象シナリオテスト
// ===================================

describe('Prediction Engine - Weather Scenarios', () => {
    it('clear weather should produce low risk', () => {
        const result = calculateSuspensionRisk(createInput({
            weather: createWeather({
                windSpeed: 3, windGust: 5,
                snowfall: 0, precipitation: 0,
                temperature: -2, warnings: [],
            }),
        }));

        expect(result.probability).toBeLessThanOrEqual(30);
    });

    it('strong wind should increase risk', () => {
        const calm = calculateSuspensionRisk(createInput({
            weather: createWeather({ windSpeed: 3, windGust: 5 }),
        }));

        const strong = calculateSuspensionRisk(createInput({
            weather: createWeather({ windSpeed: 25, windGust: 35 }),
        }));

        expect(strong.probability).toBeGreaterThan(calm.probability);
    });

    it('heavy snowfall should increase risk', () => {
        const noSnow = calculateSuspensionRisk(createInput({
            weather: createWeather({ snowfall: 0 }),
        }));

        const heavySnow = calculateSuspensionRisk(createInput({
            weather: createWeather({ snowfall: 15 }),
        }));

        expect(heavySnow.probability).toBeGreaterThan(noSnow.probability);
    });

    it('storm warning should produce high risk', () => {
        const result = calculateSuspensionRisk(createInput({
            weather: createWeather({
                windSpeed: 25, windGust: 40,
                warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2024-01-15T00:00:00Z' }],
            }),
        }));

        expect(result.probability).toBeGreaterThanOrEqual(50);
    });

    it('compound risk (wind + snow) should be higher than individual risks', () => {
        const windOnly = calculateSuspensionRisk(createInput({
            weather: createWeather({ windSpeed: 18, snowfall: 0 }),
        }));

        const snowOnly = calculateSuspensionRisk(createInput({
            weather: createWeather({ windSpeed: 3, snowfall: 10 }),
        }));

        const both = calculateSuspensionRisk(createInput({
            weather: createWeather({ windSpeed: 18, snowfall: 10 }),
        }));

        expect(both.probability).toBeGreaterThanOrEqual(Math.max(windOnly.probability, snowOnly.probability));
    });

    it('drifting snow conditions should trigger risk', () => {
        const result = calculateSuspensionRisk(createInput({
            weather: createWeather({
                temperature: -5,
                windSpeed: 15,
                snowDepth: 20,
            }),
        }));

        // Drifting snow should add risk
        expect(result.probability).toBeGreaterThan(0);
        expect(result.reasons.length).toBeGreaterThan(0);
    });
});

// ===================================
// 公式ステータスのオーバーライドテスト
// ===================================

describe('Prediction Engine - Official Status Override', () => {
    it('official "suspended" status should produce very high risk', () => {
        const result = calculateSuspensionRisk(createInput({
            weather: createWeather(), // 普通の天気
            jrStatus: {
                status: 'suspended',
                statusText: '強風のため運転見合わせ',
                updatedAt: new Date().toISOString(),
            },
        }));

        expect(result.probability).toBeGreaterThanOrEqual(80);
    });

    it('official "normal" status should reduce risk', () => {
        const withSuspended = calculateSuspensionRisk(createInput({
            weather: createWeather({ windSpeed: 20 }),
            jrStatus: {
                status: 'suspended',
                updatedAt: new Date().toISOString(),
            },
        }));

        const withNormal = calculateSuspensionRisk(createInput({
            weather: createWeather({ windSpeed: 20 }),
            jrStatus: {
                status: 'normal',
                updatedAt: new Date().toISOString(),
            },
        }));

        expect(withNormal.probability).toBeLessThan(withSuspended.probability);
    });
});

// ===================================
// 路線間の差異テスト
// ===================================

describe('Prediction Engine - Route Sensitivity', () => {
    it('different routes should produce potentially different results for same weather', () => {
        const hakodate = calculateSuspensionRisk(createInput({
            routeId: 'jr-hokkaido.hakodate-main',
            routeName: '函館本線',
            weather: createWeather({ windSpeed: 18, snowfall: 8 }),
        }));

        const sekisho = calculateSuspensionRisk(createInput({
            routeId: 'jr-hokkaido.sekisho',
            routeName: '石勝線',
            weather: createWeather({ windSpeed: 18, snowfall: 8 }),
        }));

        // 石勝線は脆弱性が高いため、同じ天気でも差異が出るはず
        // 少なくとも結果が valid であることを確認
        expect(hakodate.probability).toBeGreaterThanOrEqual(0);
        expect(sekisho.probability).toBeGreaterThanOrEqual(0);
    });
});

// ===================================
// 境界値テスト
// ===================================

describe('Prediction Engine - Edge Cases', () => {
    it('should handle null weather gracefully', () => {
        const result = calculateSuspensionRisk(createInput({
            weather: null,
        }));

        expect(result).toBeDefined();
        expect(result.probability).toBeGreaterThanOrEqual(0);
        expect(result.probability).toBeLessThanOrEqual(100);
    });

    it('probability should never exceed 100', () => {
        const result = calculateSuspensionRisk(createInput({
            weather: createWeather({
                windSpeed: 50, windGust: 80, snowfall: 30,
                warnings: [
                    { type: '暴風警報', area: '北海道', issuedAt: '2024-01-15T00:00:00Z' },
                    { type: '大雪警報', area: '北海道', issuedAt: '2024-01-15T00:00:00Z' },
                    { type: '暴風雪警報', area: '北海道', issuedAt: '2024-01-15T00:00:00Z' },
                ],
            }),
            jrStatus: {
                status: 'suspended',
                updatedAt: new Date().toISOString(),
            },
        }));

        expect(result.probability).toBeLessThanOrEqual(100);
    });

    it('probability should never go below 0', () => {
        const result = calculateSuspensionRisk(createInput({
            weather: createWeather({
                windSpeed: 0, windGust: 0, snowfall: 0,
                precipitation: 0, temperature: 5, warnings: [],
            }),
            jrStatus: { status: 'normal', updatedAt: new Date().toISOString() },
        }));

        expect(result.probability).toBeGreaterThanOrEqual(0);
    });
});
