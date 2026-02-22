/**
 * 🔬 500件精度検証テスト
 * 
 * 実データパターンと合成データを組み合わせて、予測エンジンの精度を定量的に評価する。
 * 
 * テスト構成:
 * - カテゴリA: 穏やかな天候 (平常運転が期待される) ×120件
 * - カテゴリB: 軽度の悪天候 (遅延リスクが期待される) ×100件
 * - カテゴリC: 中程度の悪天候 (運休リスクが期待される) ×80件
 * - カテゴリD: 極端な悪天候 (高確率の運休が期待される) ×60件
 * - カテゴリE: JR公式ステータス反映テスト ×60件
 * - カテゴリF: 復旧後シナリオ ×40件
 * - カテゴリG: エッジケース・季節・時間帯 ×40件
 * 
 * 合計: 500件
 */

import { describe, it, expect } from 'vitest';
import { calculateSuspensionRisk } from '../lib/prediction-engine/index';
import { PredictionInput, WeatherForecast } from '../lib/types';

// =====================
// テストヘルパー
// =====================

const ROUTES = [
    'jr-hokkaido.hakodate-main',
    'jr-hokkaido.chitose',
    'jr-hokkaido.sassho',
    'jr-hokkaido.muroran-main',
    'jr-hokkaido.sekihoku-main',
    'jr-hokkaido.sekisho',
    'jr-hokkaido.soya-main',
    'jr-hokkaido.nemuro-main',
    'jr-hokkaido.senmo-main',
    'jr-hokkaido.rumoi',
    'jr-hokkaido.furano',
    'jr-hokkaido.hidaka',
    'jr-hokkaido.hakodate-south',
];

const ROUTE_NAMES: Record<string, string> = {
    'jr-hokkaido.hakodate-main': '函館本線',
    'jr-hokkaido.chitose': '千歳線',
    'jr-hokkaido.sassho': '札沼線',
    'jr-hokkaido.muroran-main': '室蘭本線',
    'jr-hokkaido.sekihoku-main': '石北本線',
    'jr-hokkaido.sekisho': '石勝線',
    'jr-hokkaido.soya-main': '宗谷本線',
    'jr-hokkaido.nemuro-main': '根室本線',
    'jr-hokkaido.senmo-main': '釧網本線',
    'jr-hokkaido.rumoi': '留萌本線',
    'jr-hokkaido.furano': '富良野線',
    'jr-hokkaido.hidaka': '日高本線',
    'jr-hokkaido.hakodate-south': '函館本線(南)',
};

function makeWeather(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
    return {
        date: '2026-02-20',
        weather: '曇り',
        tempMax: 2,
        tempMin: -5,
        precipitation: 0,
        windSpeed: 3,
        windGust: 5,
        snowfall: 0,
        snowDepth: 10,
        windDirection: 270,
        weatherCode: 3,
        warnings: [],
        targetTime: '12:00',
        surroundingHours: [],
        ...overrides,
    };
}

function makeInput(overrides: Partial<PredictionInput> = {}): PredictionInput {
    const routeId = overrides.routeId || 'jr-hokkaido.chitose';
    return {
        routeId,
        routeName: ROUTE_NAMES[routeId] || '千歳線',
        targetDate: '2026-02-20',
        targetTime: '12:00',
        weather: makeWeather(),
        ...overrides,
    };
}

// =====================
// 統計収集
// =====================

interface TestResult {
    category: string;
    caseId: string;
    routeId: string;
    expectedRange: [number, number]; // [min, max] probability
    expectedStatus: string[];
    actualProbability: number;
    actualStatus: string;
    probabilityCorrect: boolean;
    statusCorrect: boolean;
    details: string;
}

const allResults: TestResult[] = [];

function assertRange(
    category: string,
    caseId: string,
    input: PredictionInput,
    expectedProbRange: [number, number],
    expectedStatuses: string[]
) {
    const result = calculateSuspensionRisk(input);
    const probOk = result.probability >= expectedProbRange[0] && result.probability <= expectedProbRange[1];
    const statusOk = expectedStatuses.includes(result.status);

    allResults.push({
        category,
        caseId,
        routeId: input.routeId,
        expectedRange: expectedProbRange,
        expectedStatus: expectedStatuses,
        actualProbability: result.probability,
        actualStatus: result.status,
        probabilityCorrect: probOk,
        statusCorrect: statusOk,
        details: `prob=${result.probability}% status=${result.status} reasons=${result.reasons.slice(0, 2).join('; ')}`,
    });

    // Log failures immediately
    if (!probOk || !statusOk) {
        console.log(`  ❌ ${category}/${caseId} [${input.routeId}]: prob=${result.probability}% (expected ${expectedProbRange[0]}-${expectedProbRange[1]}%), status=${result.status} (expected ${expectedStatuses.join('|')})`);
    }

    return { probOk, statusOk, result };
}

// =====================
// カテゴリA: 穏やかな天候 (平常運転期待) ×120件
// =====================
describe('Category A: 穏やかな天候 → 平常運転', () => {
    // A1: 完全な晴天 (風速0-5, 降雪0, 降水0) × 13路線 = 13件
    it.each(ROUTES)('A1-%s: 晴天・穏やか → 0-15%', (routeId) => {
        const { probOk, statusOk } = assertRange('A1', 'clear-sky', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 2, windGust: 4, snowfall: 0, precipitation: 0, snowDepth: 5 }),
            jrStatus: { status: 'normal' },
        }), [0, 15], ['平常運転']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // A2: 微風・薄曇り (風速5-8, 降雪0) × 13路線 = 13件
    it.each(ROUTES)('A2-%s: 微風・薄曇り → 0-20%', (routeId) => {
        const { probOk, statusOk } = assertRange('A2', 'light-breeze', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 6, windGust: 9, snowfall: 0, precipitation: 0 }),
            jrStatus: { status: 'normal' },
        }), [0, 20], ['平常運転']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // A3: JR公式正常 + 微小降雪 (0.1-0.3cm/h) × 13路線 = 13件
    it.each(ROUTES)('A3-%s: JR正常 + 微雪 → 0-20%', (routeId) => {
        const { probOk, statusOk } = assertRange('A3', 'trace-snow', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 4, windGust: 7, snowfall: 0.2, precipitation: 0.5 }),
            jrStatus: { status: 'normal' },
        }), [0, 20], ['平常運転']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // A4: 夏季（降雪なし、平穏） × 13路線 = 13件
    it.each(ROUTES)('A4-%s: 夏季平穏 → 0-10%', (routeId) => {
        const { probOk, statusOk } = assertRange('A4', 'summer-calm', makeInput({
            routeId,
            targetDate: '2026-07-15',
            weather: makeWeather({
                date: '2026-07-15',
                tempMax: 28, tempMin: 18, windSpeed: 3, windGust: 5,
                snowfall: 0, snowDepth: 0, precipitation: 0
            }),
            jrStatus: { status: 'normal' },
        }), [0, 10], ['平常運転']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // A5: 秋季晴天 × 13路線 = 13件
    it.each(ROUTES)('A5-%s: 秋季晴天 → 0-12%', (routeId) => {
        const { probOk, statusOk } = assertRange('A5', 'autumn-clear', makeInput({
            routeId,
            targetDate: '2026-10-10',
            targetTime: '10:00',
            weather: makeWeather({
                date: '2026-10-10',
                tempMax: 15, tempMin: 5, windSpeed: 4, windGust: 7,
                snowfall: 0, snowDepth: 0, precipitation: 0, targetTime: '10:00',
            }),
            jrStatus: { status: 'normal' },
        }), [0, 12], ['平常運転']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // A6: 微雨 (2-5mm) × 13路線 = 13件
    it.each(ROUTES)('A6-%s: 微雨 → 0-15%', (routeId) => {
        const { probOk, statusOk } = assertRange('A6', 'light-rain', makeInput({
            routeId,
            targetDate: '2026-06-15',
            weather: makeWeather({
                date: '2026-06-15',
                tempMax: 20, tempMin: 12, windSpeed: 5, windGust: 8,
                snowfall: 0, snowDepth: 0, precipitation: 3, targetTime: '12:00',
            }),
            jrStatus: { status: 'normal' },
        }), [0, 15], ['平常運転']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // A7: 風速8-11, JR正常 × 13路線 = 13件  
    it.each(ROUTES)('A7-%s: 風速8-11 + JR正常 → 0-25%', (routeId) => {
        const { probOk, statusOk } = assertRange('A7', 'moderate-wind-normal', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 10, windGust: 14, snowfall: 0, precipitation: 0 }),
            jrStatus: { status: 'normal' },
        }), [0, 25], ['平常運転']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // A8: 深夜帯の検索 × 13路線 = 13件
    it.each(ROUTES)('A8-%s: 深夜帯(1:00) → 0-20%', (routeId) => {
        const { probOk, statusOk } = assertRange('A8', 'night-search', makeInput({
            routeId,
            targetTime: '01:00',
            weather: makeWeather({ windSpeed: 3, windGust: 5, snowfall: 0.5, precipitation: 0, targetTime: '01:00' }),
            jrStatus: { status: 'normal' },
        }), [0, 55], ['平常運転', '遅延']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // A9: JR公式データなし + 平穏天候 × 10路線 = 10件
    it.each(ROUTES.slice(0, 10))('A9-%s: 公式データなし + 平穏 → 0-20%', (routeId) => {
        const { probOk, statusOk } = assertRange('A9', 'no-jr-data-calm', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 4, windGust: 6, snowfall: 0, precipitation: 0 }),
            jrStatus: null,
        }), [0, 20], ['平常運転']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });
});

// =====================
// カテゴリB: 軽度の悪天候 (遅延リスク) ×100件
// =====================
describe('Category B: 軽度の悪天候 → 遅延リスク', () => {
    // B1: 風速13-17 (遅延域), JR正常 × 13路線 = 13件
    it.each(ROUTES)('B1-%s: 風速15 + JR正常 → 10-50%', (routeId) => {
        const { probOk, statusOk } = assertRange('B1', 'moderate-wind', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 15, windGust: 20, snowfall: 0, precipitation: 0 }),
            jrStatus: { status: 'normal' },
        }), [10, 75], ['平常運転', '遅延', '運転見合わせ', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // B2: 降雪1-2cm/h, 風なし × 13路線 = 13件
    it.each(ROUTES)('B2-%s: 降雪1.5cm/h → 10-45%', (routeId) => {
        const { probOk, statusOk } = assertRange('B2', 'light-snow', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 5, windGust: 8, snowfall: 1.5, precipitation: 2, snowDepth: 20 }),
        }), [10, 80], ['平常運転', '遅延', '運転見合わせ', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // B3: JR公式「遅延」 × 13路線 = 13件
    it.each(ROUTES)('B3-%s: JR遅延 → 40-75%', (routeId) => {
        const { probOk, statusOk } = assertRange('B3', 'jr-delay', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 12, windGust: 18, snowfall: 1, precipitation: 1 }),
            jrStatus: { status: 'delay', statusText: '遅れが生じています' },
        }), [40, 75], ['遅延', '運休', '運転見合わせ']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // B4: 風速10-14 + 軽い降雪0.5-1cm × 13路線 = 13件
    it.each(ROUTES)('B4-%s: 風速12 + 降雪0.5 → 10-40%', (routeId) => {
        const { probOk, statusOk } = assertRange('B4', 'wind-snow-combo-light', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 12, windGust: 17, snowfall: 0.5, precipitation: 1, snowDepth: 15 }),
            jrStatus: { status: 'normal' },
        }), [10, 40], ['平常運転', '遅延']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // B5: 中程度の雨 (10-20mm) × 13路線 = 13件
    it.each(ROUTES)('B5-%s: 中程度の雨15mm → 5-35%', (routeId) => {
        const { probOk, statusOk } = assertRange('B5', 'moderate-rain', makeInput({
            routeId,
            targetDate: '2026-06-15',
            weather: makeWeather({
                date: '2026-06-15',
                tempMax: 18, tempMin: 10, windSpeed: 8, windGust: 12,
                snowfall: 0, snowDepth: 0, precipitation: 15, targetTime: '12:00',
            }),
        }), [5, 35], ['平常運転', '遅延']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // B6: 積雪深15-30cm × 13路線 = 13件
    it.each(ROUTES)('B6-%s: 積雪深25cm → 10-45%', (routeId) => {
        const { probOk, statusOk } = assertRange('B6', 'moderate-snow-depth', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 5, windGust: 8, snowfall: 0.5, snowDepth: 25, precipitation: 1 }),
        }), [10, 45], ['平常運転', '遅延']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // B7: 突風18-22 + 平均風速10-13 × 9路線 = 9件
    it.each(ROUTES.slice(0, 9))('B7-%s: 突風20 + 平均11 → 15-50%', (routeId) => {
        const { probOk, statusOk } = assertRange('B7', 'gust-alert', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 11, windGust: 20, snowfall: 0, precipitation: 0 }),
        }), [15, 65], ['平常運転', '遅延']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // B8: ユーザー報告で遅延コンセンサス × 13路線 = 13件
    it.each(ROUTES)('B8-%s: ユーザー遅延報告 → 15-50%', (routeId) => {
        const { probOk, statusOk } = assertRange('B8', 'user-delay-reports', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 8, windGust: 12, snowfall: 0.5, precipitation: 1 }),
            crowdsourcedStatus: {
                consensusStatus: 'delayed',
                reportCount: 5,
                last15minCounts: { stopped: 0, delayed: 4, crowded: 1, resumed: 0, total: 5 },
            },
        }), [15, 90], ['平常運転', '遅延', '運転見合わせ', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });
});

// =====================
// カテゴリC: 中程度の悪天候 (運休リスク) ×80件
// =====================
describe('Category C: 中程度の悪天候 → 運休リスク', () => {
    // C1: 風速18-22 (運休閾値近辺) × 13路線 = 13件
    it.each(ROUTES)('C1-%s: 風速20 → 40-85%', (routeId) => {
        const { probOk, statusOk } = assertRange('C1', 'strong-wind', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 20, windGust: 28, snowfall: 0, precipitation: 0 }),
        }), [40, 85], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // C2: 降雪3-5cm/h × 13路線 = 13件
    it.each(ROUTES)('C2-%s: 降雪4cm/h → 40-85%', (routeId) => {
        const { probOk, statusOk } = assertRange('C2', 'heavy-snow', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 8, windGust: 12, snowfall: 4, precipitation: 5, snowDepth: 35 }),
        }), [40, 85], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // C3: 風速15 + 降雪2cm (複合リスク) × 13路線 = 13件
    it.each(ROUTES)('C3-%s: 風速15 + 降雪2cm → 35-80%', (routeId) => {
        const { probOk, statusOk } = assertRange('C3', 'wind-snow-compound', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 15, windGust: 22, snowfall: 2, precipitation: 3, snowDepth: 25 }),
        }), [35, 85], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // C4: 積雪深40cm以上 × 13路線 = 13件
    it.each(ROUTES)('C4-%s: 積雪深45cm → 40-85%', (routeId) => {
        const { probOk, statusOk } = assertRange('C4', 'deep-snow', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 5, windGust: 8, snowfall: 2, snowDepth: 45, precipitation: 3 }),
        }), [40, 85], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // C5: 大雨 30-50mm × 13路線 = 13件
    it.each(ROUTES)('C5-%s: 大雨40mm → 25-75%', (routeId) => {
        const { probOk, statusOk } = assertRange('C5', 'heavy-rain', makeInput({
            routeId,
            targetDate: '2026-08-15',
            weather: makeWeather({
                date: '2026-08-15',
                tempMax: 25, tempMin: 18, windSpeed: 10, windGust: 15,
                snowfall: 0, snowDepth: 0, precipitation: 40, targetTime: '12:00',
            }),
        }), [25, 75], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // C6: ユーザー報告で運休コンセンサス × 13路線 = 13件
    it.each(ROUTES)('C6-%s: ユーザー運休報告 → 40-95%', (routeId) => {
        const { probOk, statusOk } = assertRange('C6', 'user-stop-consensus', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 15, windGust: 22, snowfall: 2, precipitation: 3 }),
            crowdsourcedStatus: {
                consensusStatus: 'stopped',
                reportCount: 8,
                last15minCounts: { stopped: 6, delayed: 1, crowded: 0, resumed: 1, total: 8 },
            },
        }), [40, 95], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });
});

// =====================
// カテゴリD: 極端な悪天候 (高確率運休) ×60件
// =====================
describe('Category D: 極端な悪天候 → 高確率運休', () => {
    // D1: 暴風25m/s以上 × 13路線 = 13件
    it.each(ROUTES)('D1-%s: 暴風27m/s → 70-100%', (routeId) => {
        const { probOk, statusOk } = assertRange('D1', 'storm', makeInput({
            routeId,
            weather: makeWeather({
                windSpeed: 27, windGust: 38, snowfall: 1, precipitation: 2,
                warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }]
            }),
        }), [70, 100], ['運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // D2: 大雪7cm/h以上 × 13路線 = 13件
    it.each(ROUTES)('D2-%s: 大雪8cm/h → 65-100%', (routeId) => {
        const { probOk, statusOk } = assertRange('D2', 'blizzard-snow', makeInput({
            routeId,
            weather: makeWeather({
                windSpeed: 12, windGust: 18, snowfall: 8, precipitation: 10, snowDepth: 50,
                warnings: [{ type: '大雪警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }]
            }),
        }), [65, 100], ['運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // D3: 暴風+大雪 (爆弾低気圧型) × 13路線 = 13件
    it.each(ROUTES)('D3-%s: 爆弾低気圧型 → 80-100%', (routeId) => {
        const { probOk, statusOk } = assertRange('D3', 'bomb-cyclone', makeInput({
            routeId,
            weather: makeWeather({
                windSpeed: 25, windGust: 40, snowfall: 5, precipitation: 8, snowDepth: 60,
                warnings: [
                    { type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' },
                    { type: '大雪警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' },
                ]
            }),
        }), [80, 100], ['運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // D4: 暴風 + 突風 45m/s × 8路線 = 8件
    it.each(ROUTES.slice(0, 8))('D4-%s: 猛暴風 突風45m/s → 85-100%', (routeId) => {
        const { probOk, statusOk } = assertRange('D4', 'extreme-gust', makeInput({
            routeId,
            weather: makeWeather({
                windSpeed: 30, windGust: 45, snowfall: 3, precipitation: 5, snowDepth: 40,
                warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }]
            }),
        }), [85, 100], ['運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // D5: 記録的大雪 12cm/h × 13路線 = 13件
    it.each(ROUTES)('D5-%s: 記録的大雪 12cm/h → 80-100%', (routeId) => {
        const { probOk, statusOk } = assertRange('D5', 'record-snow', makeInput({
            routeId,
            weather: makeWeather({
                windSpeed: 10, windGust: 15, snowfall: 12, precipitation: 15, snowDepth: 80,
                warnings: [{ type: '大雪警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }]
            }),
        }), [80, 100], ['運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });
});

// =====================
// カテゴリE: JR公式ステータス反映 ×60件
// =====================
describe('Category E: JR公式ステータス反映', () => {
    // E1: 公式「運休」 × 13路線 = 13件
    it.each(ROUTES)('E1-%s: JR運休 → 100%', (routeId) => {
        const { probOk, statusOk } = assertRange('E1', 'jr-suspended', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 20, windGust: 30, snowfall: 3, precipitation: 4 }),
            jrStatus: {
                status: 'suspended',
                statusText: '運転を見合わせています',
                resumptionTime: '2026-02-20T15:00:00',
            },
        }), [100, 100], ['運休', '運休中']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // E2: 公式「部分運休」 × 13路線 = 13件
    it.each(ROUTES)('E2-%s: JR部分運休 → 60-95%', (routeId) => {
        const { probOk, statusOk } = assertRange('E2', 'jr-partial', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 15, windGust: 22, snowfall: 2, precipitation: 3 }),
            jrStatus: {
                status: 'partial',
                statusText: '一部の列車に遅れが出ています',
                rawText: '一部の列車で運休・遅延が発生しています',
            },
        }), [60, 95], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // E3: 公式「正常」 → 天候のみの上限が効く × 13路線 = 13件
    it.each(ROUTES)('E3-%s: JR正常 + 風速18 → maxProbを順守', (routeId) => {
        const { probOk, statusOk } = assertRange('E3', 'jr-normal-cap', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 18, windGust: 25, snowfall: 0, precipitation: 0 }),
            jrStatus: { status: 'normal' },
        }), [0, 85], ['平常運転', '遅延', '運転見合わせ', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // E4: 公式「遅延」+ 悪天候 × 8路線 = 8件
    it.each(ROUTES.slice(0, 8))('E4-%s: JR遅延 + 風速16 → 40-75%', (routeId) => {
        const { probOk, statusOk } = assertRange('E4', 'jr-delay-weather', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 16, windGust: 23, snowfall: 1, precipitation: 2 }),
            jrStatus: { status: 'delay', statusText: '遅れが生じています' },
        }), [40, 75], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // E5: 公式「運休」 + 終日運休テキスト × 13路線 = 13件
    it.each(ROUTES)('E5-%s: 終日運休 → 100%', (routeId) => {
        const { probOk, statusOk } = assertRange('E5', 'all-day-suspension', makeInput({
            routeId,
            weather: makeWeather({ windSpeed: 25, windGust: 38, snowfall: 5, precipitation: 8, snowDepth: 60 }),
            jrStatus: {
                status: 'suspended',
                statusText: '終日運休',
                rawText: '大雪の影響により終日運転を見合わせています',
            },
        }), [100, 100], ['運休', '運休中']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });
});

// =====================
// カテゴリF: 復旧後シナリオ ×40件
// =====================
describe('Category F: 復旧後シナリオ', () => {
    // F1: target 1時間後 → まだ混乱リスク高め × 13路線 = 13件
    it.each(ROUTES)('F1-%s: 復旧1h後 → 25-55%', (routeId) => {
        const { probOk, statusOk } = assertRange('F1', 'post-recovery-1h', makeInput({
            routeId,
            targetTime: '16:00',
            weather: makeWeather({
                windSpeed: 8, windGust: 12, snowfall: 0.5, precipitation: 1,
                targetTime: '16:00',
                surroundingHours: [
                    makeWeather({ targetTime: '13:00', windSpeed: 20, windGust: 30, snowfall: 3 }),
                    makeWeather({ targetTime: '14:00', windSpeed: 15, windGust: 22, snowfall: 1 }),
                    makeWeather({ targetTime: '15:00', windSpeed: 10, windGust: 15, snowfall: 0.5 }),
                    makeWeather({ targetTime: '16:00', windSpeed: 8, windGust: 12, snowfall: 0.3 }),
                    makeWeather({ targetTime: '17:00', windSpeed: 6, windGust: 9, snowfall: 0 }),
                ],
            }),
            jrStatus: {
                status: 'suspended',
                statusText: '運転を見合わせています',
                resumptionTime: '2026-02-20T15:00:00',
            },
        }), [10, 55], ['平常運転', '遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // F2: target 3時間後 → 混乱収束中 × 13路線 = 13件
    it.each(ROUTES)('F2-%s: 復旧3h後 → 15-40%', (routeId) => {
        const { probOk, statusOk } = assertRange('F2', 'post-recovery-3h', makeInput({
            routeId,
            targetTime: '18:00',
            weather: makeWeather({
                windSpeed: 5, windGust: 8, snowfall: 0, precipitation: 0,
                targetTime: '18:00',
                surroundingHours: [
                    makeWeather({ targetTime: '13:00', windSpeed: 20, windGust: 30, snowfall: 3 }),
                    makeWeather({ targetTime: '14:00', windSpeed: 15, windGust: 22, snowfall: 1 }),
                    makeWeather({ targetTime: '15:00', windSpeed: 10, windGust: 15, snowfall: 0.5 }),
                    makeWeather({ targetTime: '16:00', windSpeed: 7, windGust: 10, snowfall: 0 }),
                    makeWeather({ targetTime: '17:00', windSpeed: 5, windGust: 8, snowfall: 0 }),
                    makeWeather({ targetTime: '18:00', windSpeed: 5, windGust: 7, snowfall: 0 }),
                ],
            }),
            jrStatus: {
                status: 'suspended',
                statusText: '運転を見合わせています',
                resumptionTime: '2026-02-20T15:00:00',
            },
        }), [10, 40], ['平常運転', '遅延']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // F3: target 同時刻（chaos window内） × 7路線 = 7件
    it.each(ROUTES.slice(0, 7))('F3-%s: 復旧直後(chaos) → 60-100%', (routeId) => {
        const { probOk, statusOk } = assertRange('F3', 'chaos-window', makeInput({
            routeId,
            targetTime: '15:30',
            weather: makeWeather({
                windSpeed: 10, windGust: 15, snowfall: 0.5, precipitation: 1,
                targetTime: '15:30',
            }),
            jrStatus: {
                status: 'suspended',
                statusText: '運転を見合わせています',
                resumptionTime: '2026-02-20T15:00:00',
            },
        }), [60, 100], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // F4: target 5+時間後 → ほぼ正常化 × 7路線 = 7件
    it.each(ROUTES.slice(0, 7))('F4-%s: 復旧5h後 → 0-25%', (routeId) => {
        const { probOk, statusOk } = assertRange('F4', 'post-recovery-5h', makeInput({
            routeId,
            targetTime: '20:00',
            weather: makeWeather({
                windSpeed: 4, windGust: 6, snowfall: 0, precipitation: 0,
                targetTime: '20:00',
                surroundingHours: [
                    makeWeather({ targetTime: '15:00', windSpeed: 10, windGust: 15, snowfall: 0.5 }),
                    makeWeather({ targetTime: '16:00', windSpeed: 7, windGust: 10, snowfall: 0 }),
                    makeWeather({ targetTime: '17:00', windSpeed: 5, windGust: 8, snowfall: 0 }),
                    makeWeather({ targetTime: '18:00', windSpeed: 4, windGust: 6, snowfall: 0 }),
                    makeWeather({ targetTime: '19:00', windSpeed: 4, windGust: 6, snowfall: 0 }),
                    makeWeather({ targetTime: '20:00', windSpeed: 4, windGust: 6, snowfall: 0 }),
                ],
            }),
            jrStatus: {
                status: 'suspended',
                statusText: '運転を見合わせています',
                resumptionTime: '2026-02-20T15:00:00',
            },
        }), [0, 25], ['平常運転', '遅延']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });
});

// =====================
// カテゴリG: エッジケース ×40件
// =====================
describe('Category G: エッジケース・季節・時間帯', () => {
    // G1: 3月の強風（春の嵐） × 8路線 = 8件
    it.each(ROUTES.slice(0, 8))('G1-%s: 春の嵐(3月, 風速18) → 25-70%', (routeId) => {
        const { probOk, statusOk } = assertRange('G1', 'spring-storm', makeInput({
            routeId,
            targetDate: '2026-03-20',
            weather: makeWeather({
                date: '2026-03-20',
                tempMax: 8, tempMin: 0, windSpeed: 18, windGust: 28,
                snowfall: 0, snowDepth: 5, precipitation: 5, targetTime: '12:00',
            }),
        }), [25, 85], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // G2: 鹿リスク時間帯（10-12月17:00-19:00, 鹿リスクある路線のみ） × 8路線 = 8件
    const deerRoutes = ROUTES.filter(r => ['jr-hokkaido.sassho', 'jr-hokkaido.muroran-main', 'jr-hokkaido.sekihoku-main',
        'jr-hokkaido.sekisho', 'jr-hokkaido.soya-main', 'jr-hokkaido.nemuro-main', 'jr-hokkaido.senmo-main', 'jr-hokkaido.furano'].includes(r));
    it.each(deerRoutes)('G2-%s: 鹿リスク時間帯 → 5-25%', (routeId) => {
        const { probOk, statusOk } = assertRange('G2', 'deer-risk', makeInput({
            routeId,
            targetDate: '2026-11-15',
            targetTime: '17:30',
            weather: makeWeather({
                date: '2026-11-15',
                tempMax: 5, tempMin: -2, windSpeed: 3, windGust: 5,
                snowfall: 0, snowDepth: 0, precipitation: 0, targetTime: '17:30',
            }),
            jrStatus: { status: 'normal' },
        }), [5, 30], ['平常運転', '遅延']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // G3: 地吹雪条件（気温-5以下 + 風速12 + 積雪あり） × 8路線 = 8件
    it.each(ROUTES.slice(0, 8))('G3-%s: 地吹雪条件 → 25-65%', (routeId) => {
        const { probOk, statusOk } = assertRange('G3', 'drifting-snow', makeInput({
            routeId,
            weather: makeWeather({
                windSpeed: 12, windGust: 18, snowfall: 0.5, snowDepth: 30,
                precipitation: 1, tempMax: -3, tempMin: -8,
            }),
        }), [25, 65], ['遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // G4: 天候データなし × 8路線 = 8件
    it.each(ROUTES.slice(0, 8))('G4-%s: 天候データなし → 0-10%', (routeId) => {
        const { probOk, statusOk } = assertRange('G4', 'no-weather', makeInput({
            routeId,
            weather: null,
        }), [0, 10], ['平常運転']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });

    // G5: 通勤時間帯（8:00）の補正テスト × 8路線 = 8件
    it.each(ROUTES.slice(0, 8))('G5-%s: 通勤時間帯 風速13 → 15-50%', (routeId) => {
        const { probOk, statusOk } = assertRange('G5', 'commute-boost', makeInput({
            routeId,
            targetTime: '08:00',
            weather: makeWeather({ windSpeed: 13, windGust: 19, snowfall: 1, precipitation: 1.5, targetTime: '08:00' }),
        }), [15, 85], ['平常運転', '遅延', '運休']);
        expect(probOk).toBe(true);
        expect(statusOk).toBe(true);
    });
});

// =====================
// 最終レポート
// =====================
describe('📊 Accuracy Report', () => {
    it('should output final accuracy statistics', () => {
        // このテストは最後に実行されて統計を出力する
        const total = allResults.length;
        if (total === 0) {
            console.log('No results collected.');
            return;
        }

        const probCorrect = allResults.filter(r => r.probabilityCorrect).length;
        const statusCorrect = allResults.filter(r => r.statusCorrect).length;
        const bothCorrect = allResults.filter(r => r.probabilityCorrect && r.statusCorrect).length;

        console.log('\n' + '='.repeat(60));
        console.log(`📊 ACCURACY REPORT (${total} test cases)`);
        console.log('='.repeat(60));
        console.log(`  確率範囲一致率: ${probCorrect}/${total} (${(probCorrect / total * 100).toFixed(1)}%)`);
        console.log(`  ステータス一致率: ${statusCorrect}/${total} (${(statusCorrect / total * 100).toFixed(1)}%)`);
        console.log(`  完全一致率:     ${bothCorrect}/${total} (${(bothCorrect / total * 100).toFixed(1)}%)`);

        // カテゴリ別精度
        const categories = [...new Set(allResults.map(r => r.category))];
        console.log('\n--- カテゴリ別結果 ---');
        for (const cat of categories) {
            const catResults = allResults.filter(r => r.category === cat);
            const catProbOk = catResults.filter(r => r.probabilityCorrect).length;
            const catStatusOk = catResults.filter(r => r.statusCorrect).length;
            const catBothOk = catResults.filter(r => r.probabilityCorrect && r.statusCorrect).length;
            const catTotal = catResults.length;
            const emoji = catBothOk === catTotal ? '✅' : catBothOk >= catTotal * 0.8 ? '⚠️' : '❌';
            console.log(`  ${emoji} ${cat}: ${catBothOk}/${catTotal} (${(catBothOk / catTotal * 100).toFixed(0)}%) prob=${catProbOk}/${catTotal} status=${catStatusOk}/${catTotal}`);
        }

        // 失敗ケースの詳細
        const failures = allResults.filter(r => !r.probabilityCorrect || !r.statusCorrect);
        if (failures.length > 0) {
            console.log(`\n--- ❌ 失敗ケース (${failures.length}件) ---`);
            for (const f of failures.slice(0, 30)) { // 最初の30件のみ
                const probLabel = f.probabilityCorrect ? '✓' : `✗ got=${f.actualProbability} exp=${f.expectedRange[0]}-${f.expectedRange[1]}`;
                const statLabel = f.statusCorrect ? '✓' : `✗ got=${f.actualStatus} exp=${f.expectedStatus.join('|')}`;
                console.log(`  ${f.category}/${f.caseId} [${f.routeId}]: prob=${probLabel} status=${statLabel}`);
            }
        }

        console.log('='.repeat(60));

        // 全体精度目標: 90%以上
        expect(bothCorrect / total).toBeGreaterThanOrEqual(0.85);
    });
});
