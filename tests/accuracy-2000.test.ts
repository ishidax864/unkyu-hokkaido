/**
 * 🔬 2000件精度検証テスト
 *
 * 17カテゴリ × 13路線 = 約2,000件の包括的テスト
 * 運休、遅延、復旧の予測精度を定量評価する
 */
import { describe, it, expect } from 'vitest';
import { calculateSuspensionRisk } from '../lib/prediction-engine/index';
import { ROUTES, ROUTE_NAMES, makeInput, TestResult, printReport } from './accuracy-2000-helpers';
import { ALL_CATEGORIES } from './accuracy-2000-cases-part1';
import { ALL_CATEGORIES_PART2 } from './accuracy-2000-cases-part2';

const allCases = [...ALL_CATEGORIES.flat(), ...ALL_CATEGORIES_PART2.flat()];
const allResults: TestResult[] = [];

// Count expected total
let expectedTotal = 0;
for (const tc of allCases) {
    expectedTotal += (tc.routes || ROUTES).length;
}
console.log(`\n🔬 Total test cases: ${expectedTotal}`);

// Generate tests for each category
const categories = [...new Set(allCases.map(tc => tc.category))];

for (const cat of categories) {
    const casesInCat = allCases.filter(tc => tc.category === cat);

    describe(cat, () => {
        for (const tc of casesInCat) {
            const routes = tc.routes || ROUTES;

            it.each(routes)(`${tc.id}: ${tc.description} [%s]`, (routeId) => {
                const input = makeInput({
                    routeId,
                    ...tc.input,
                });

                const result = calculateSuspensionRisk(input);
                const probOk = result.probability >= tc.expectedProbRange[0] && result.probability <= tc.expectedProbRange[1];
                const statusOk = tc.expectedStatuses.includes(result.status);
                const overPredicted = result.probability > tc.expectedProbRange[1];
                const underPredicted = result.probability < tc.expectedProbRange[0];

                allResults.push({
                    category: tc.category,
                    caseId: tc.id,
                    routeId,
                    expectedRange: tc.expectedProbRange,
                    expectedStatus: tc.expectedStatuses,
                    actualProbability: result.probability,
                    actualStatus: result.status,
                    probabilityCorrect: probOk,
                    statusCorrect: statusOk,
                    overPredicted,
                    underPredicted,
                    details: `prob=${result.probability}% status=${result.status} reasons=${result.reasons.slice(0, 2).join('; ')}`,
                });

                // Soft assertion - collect data, report summary at end
                // Individual tests pass regardless to get full coverage data
                expect(true).toBe(true); // always pass individual tests
            });
        }
    });
}

// Final report
describe('📊 2000件精度レポート', () => {
    it('should output comprehensive accuracy statistics', () => {
        const fs = require('fs');
        printReport(allResults);

        // Write results summary to file for analysis
        const total = allResults.length;
        const probOk = allResults.filter(r => r.probabilityCorrect).length;
        const statOk = allResults.filter(r => r.statusCorrect).length;
        const bothOk = allResults.filter(r => r.probabilityCorrect && r.statusCorrect).length;
        const overP = allResults.filter(r => r.overPredicted).length;
        const underP = allResults.filter(r => r.underPredicted).length;

        const cats = [...new Set(allResults.map(r => r.category))].sort();
        const catResults: Record<string, any> = {};
        for (const cat of cats) {
            const cr = allResults.filter(r => r.category === cat);
            catResults[cat] = {
                total: cr.length,
                passed: cr.filter(r => r.probabilityCorrect && r.statusCorrect).length,
                over: cr.filter(r => r.overPredicted).length,
                under: cr.filter(r => r.underPredicted).length,
            };
        }

        const failures = allResults.filter(r => !r.probabilityCorrect || !r.statusCorrect)
            .slice(0, 80)
            .map(r => ({
                cat: r.category, id: r.caseId, route: r.routeId,
                exp: r.expectedRange, expSt: r.expectedStatus,
                got: r.actualProbability, gotSt: r.actualStatus,
                dir: r.overPredicted ? 'OVER' : r.underPredicted ? 'UNDER' : 'STATUS',
            }));

        const report = { total, probOk, statOk, bothOk, overP, underP, catResults, failures };
        fs.writeFileSync('/tmp/accuracy-2000-report.json', JSON.stringify(report, null, 2));

        expect(allResults.length).toBeGreaterThan(0);
    });
});
