/**
 * 2000件精度検証テスト用ヘルパー
 */
import { PredictionInput, WeatherForecast } from '../lib/types';

export const ROUTES = [
    'jr-hokkaido.hakodate-main', 'jr-hokkaido.chitose', 'jr-hokkaido.sassho',
    'jr-hokkaido.muroran-main', 'jr-hokkaido.sekihoku-main', 'jr-hokkaido.sekisho',
    'jr-hokkaido.soya-main', 'jr-hokkaido.nemuro-main', 'jr-hokkaido.senmo-main',
    'jr-hokkaido.rumoi', 'jr-hokkaido.furano', 'jr-hokkaido.hidaka',
    'jr-hokkaido.hakodate-south',
];

export const ROUTE_NAMES: Record<string, string> = {
    'jr-hokkaido.hakodate-main': '函館本線', 'jr-hokkaido.chitose': '千歳線',
    'jr-hokkaido.sassho': '札沼線', 'jr-hokkaido.muroran-main': '室蘭本線',
    'jr-hokkaido.sekihoku-main': '石北本線', 'jr-hokkaido.sekisho': '石勝線',
    'jr-hokkaido.soya-main': '宗谷本線', 'jr-hokkaido.nemuro-main': '根室本線',
    'jr-hokkaido.senmo-main': '釧網本線', 'jr-hokkaido.rumoi': '留萌本線',
    'jr-hokkaido.furano': '富良野線', 'jr-hokkaido.hidaka': '日高本線',
    'jr-hokkaido.hakodate-south': '函館本線(南)',
};

export function makeWeather(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
    return {
        date: '2026-02-20', weather: '曇り', tempMax: 2, tempMin: -5,
        precipitation: 0, windSpeed: 3, windGust: 5, snowfall: 0,
        snowDepth: 10, windDirection: 270, weatherCode: 3,
        warnings: [], targetTime: '12:00', surroundingHours: [],
        ...overrides,
    };
}

export function makeInput(overrides: Partial<PredictionInput> = {}): PredictionInput {
    const routeId = overrides.routeId || 'jr-hokkaido.chitose';
    return {
        routeId, routeName: ROUTE_NAMES[routeId] || '千歳線',
        targetDate: '2026-02-20', targetTime: '12:00', weather: makeWeather(),
        ...overrides,
    };
}

export interface TestCase {
    id: string;
    category: string;
    description: string;
    input: Partial<PredictionInput>;
    expectedProbRange: [number, number];
    expectedStatuses: string[];
    /** If specified, only run for these routes. Otherwise run for all 13 */
    routes?: string[];
}

export interface TestResult {
    category: string; caseId: string; routeId: string;
    expectedRange: [number, number]; expectedStatus: string[];
    actualProbability: number; actualStatus: string;
    probabilityCorrect: boolean; statusCorrect: boolean;
    overPredicted: boolean; underPredicted: boolean;
    details: string;
}

export function printReport(allResults: TestResult[]) {
    const total = allResults.length;
    if (total === 0) { console.log('No results.'); return; }

    const probOk = allResults.filter(r => r.probabilityCorrect).length;
    const statOk = allResults.filter(r => r.statusCorrect).length;
    const bothOk = allResults.filter(r => r.probabilityCorrect && r.statusCorrect).length;
    const overP = allResults.filter(r => r.overPredicted).length;
    const underP = allResults.filter(r => r.underPredicted).length;

    console.log('\n' + '='.repeat(70));
    console.log(`📊 ACCURACY REPORT (${total} test cases)`);
    console.log('='.repeat(70));
    console.log(`  確率範囲一致率:   ${probOk}/${total} (${(probOk / total * 100).toFixed(1)}%)`);
    console.log(`  ステータス一致率: ${statOk}/${total} (${(statOk / total * 100).toFixed(1)}%)`);
    console.log(`  完全一致率:       ${bothOk}/${total} (${(bothOk / total * 100).toFixed(1)}%)`);
    console.log(`  過大予測:         ${overP}件 (${(overP / total * 100).toFixed(1)}%)`);
    console.log(`  過小予測:         ${underP}件 (${(underP / total * 100).toFixed(1)}%)`);

    // Category breakdown
    const cats = [...new Set(allResults.map(r => r.category))].sort();
    console.log('\n--- カテゴリ別結果 ---');
    for (const cat of cats) {
        const cr = allResults.filter(r => r.category === cat);
        const cb = cr.filter(r => r.probabilityCorrect && r.statusCorrect).length;
        const co = cr.filter(r => r.overPredicted).length;
        const cu = cr.filter(r => r.underPredicted).length;
        const e = cb === cr.length ? '✅' : cb >= cr.length * 0.8 ? '⚠️' : '❌';
        console.log(`  ${e} ${cat}: ${cb}/${cr.length} (${(cb / cr.length * 100).toFixed(0)}%) over=${co} under=${cu}`);
    }

    // Route breakdown
    console.log('\n--- 路線別結果 ---');
    for (const route of ROUTES) {
        const rr = allResults.filter(r => r.routeId === route);
        if (rr.length === 0) continue;
        const rb = rr.filter(r => r.probabilityCorrect && r.statusCorrect).length;
        const ro = rr.filter(r => r.overPredicted).length;
        const ru = rr.filter(r => r.underPredicted).length;
        const e = rb === rr.length ? '✅' : rb >= rr.length * 0.8 ? '⚠️' : '❌';
        const name = ROUTE_NAMES[route] || route;
        console.log(`  ${e} ${name}: ${rb}/${rr.length} (${(rb / rr.length * 100).toFixed(0)}%) over=${ro} under=${ru}`);
    }

    // Failure details (first 50)
    const failures = allResults.filter(r => !r.probabilityCorrect || !r.statusCorrect);
    if (failures.length > 0) {
        console.log(`\n--- ❌ 失敗ケース (${failures.length}件, 先頭50件表示) ---`);
        for (const f of failures.slice(0, 50)) {
            const pL = f.probabilityCorrect ? '✓' : `✗ got=${f.actualProbability} exp=${f.expectedRange[0]}-${f.expectedRange[1]}`;
            const sL = f.statusCorrect ? '✓' : `✗ got=${f.actualStatus} exp=${f.expectedStatus.join('|')}`;
            const dir = f.overPredicted ? '↑OVER' : f.underPredicted ? '↓UNDER' : '';
            console.log(`  ${f.category}/${f.caseId} [${ROUTE_NAMES[f.routeId]}]: prob=${pL} status=${sL} ${dir}`);
        }
    }

    // Failure pattern analysis
    console.log('\n--- 失敗パターン分析 ---');
    const patternMap: Record<string, number> = {};
    for (const f of failures) {
        const key = f.overPredicted ? `OVER(${f.category})` : f.underPredicted ? `UNDER(${f.category})` : `STATUS(${f.category})`;
        patternMap[key] = (patternMap[key] || 0) + 1;
    }
    const sorted = Object.entries(patternMap).sort((a, b) => b[1] - a[1]);
    for (const [k, v] of sorted.slice(0, 15)) {
        console.log(`  ${k}: ${v}件`);
    }
}
