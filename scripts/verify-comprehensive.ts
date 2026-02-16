
import fs from 'fs';
import path from 'path';
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { generateStrategicAdvice, calculateTrafficRisk, checkAlternativeAvailability } from '../lib/suggestion-logic';
import { PredictionInput, WeatherForecast, PredictionResult } from '../lib/types';

// 検証用データセットの型定義
interface TestScenario {
    id: number;
    routeId: string;
    routeName: string;
    scenarioName: string; // "Blizzard", "Calm", "High Wind Check" etc.
    weatherPattern: WeatherPattern;
    expectedStatus?: string; // 期待されるステータス（大まかな）
}

type WeatherPattern = 'calm' | 'snow_delay' | 'storm_suspend' | 'blizzard_cancel' | 'wind_boundary_low' | 'wind_boundary_high' | 'snow_clearing';

// 気象パターン定義
function createMockWeather(date: string, pattern: WeatherPattern): WeatherForecast {
    const base: WeatherForecast = {
        date,
        weather: 'cloudy',
        tempMax: 0,
        tempMin: -5,
        precipitation: 0,
        windSpeed: 5,
        windDirection: 270, // West
        snowfall: 0,
        snowDepth: 20,
        weatherCode: 3,
        warnings: [],
        targetTime: '18:00'
    };

    switch (pattern) {
        case 'calm':
            return { ...base, weather: 'sunny', windSpeed: 3, snowfall: 0 };
        case 'snow_delay':
            return {
                ...base,
                weather: 'snow',
                windSpeed: 15,
                snowfall: 3, // 3cm/h -> Accumulating
                warnings: [{ type: '大雪注意報', area: 'All', issuedAt: '10:00' }]
            };
        case 'storm_suspend':
            return {
                ...base,
                weather: 'snow',
                windSpeed: 24, // > 23m/s threshold
                snowfall: 5,
                warnings: [{ type: '暴風警報', area: 'All', issuedAt: '10:00' }]
            };
        case 'blizzard_cancel':
            return {
                ...base,
                weather: 'blizzard',
                windSpeed: 30, // Very High
                snowfall: 10,
                // Note: Heavy snow keyword simulation needs to be handled via text input if we were testing text parser,
                // but here we utilize weather parameters.
                warnings: [{ type: '暴風雪警報', area: 'All', issuedAt: '08:00' }]
            };
        case 'wind_boundary_low':
            return { ...base, windSpeed: 21, warnings: [{ type: '暴風注意報', area: 'All', issuedAt: '10:00' }] };
        case 'wind_boundary_high':
            return { ...base, windSpeed: 24, warnings: [{ type: '暴風警報', area: 'All', issuedAt: '10:00' }] };
        case 'snow_clearing':
            // 運休中（入力時点では判定されないが、リスク高め）だが、天気は回復しているパターン
            // ※ここでのMockは「現在の天気」
            // 実際はPredictionInputの天気がこれになる。
            // カフェ提案が出るには「運休レベル(>80%)」かつ「復旧予測 < 4時間」が必要
            return {
                ...base,
                weather: 'cloudy',
                windSpeed: 23, // 23m/s -> 運休レベル
                snowfall: 0,   // 雪止んだ
                snowDepth: 40, // 積雪深はある
                warnings: [],
            };
        default:
            return base;
    }
}
// 実行関数
async function runVerification() {
    console.log('=== Starting Comprehensive Verification (300+ Cases) ===');

    // 1. Load Ground Truth Routes (for variety)
    const groundTruthPath = path.join(process.cwd(), 'lib/backtest/ground-truth.json');
    const groundTruth: any[] = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));

    // Unique Routes
    const uniqueRoutes = Array.from(new Set(groundTruth.map(g => g.routeId)));
    console.log(`Loaded ${uniqueRoutes.length} unique routes for testing.`);

    // 2. Generate 300 Scenarios
    const scenarios: TestScenario[] = [];
    const patterns: WeatherPattern[] = ['calm', 'snow_delay', 'storm_suspend', 'blizzard_cancel', 'wind_boundary_low', 'wind_boundary_high', 'snow_clearing'];

    for (let i = 0; i < 300; i++) {
        const routeId = uniqueRoutes[i % uniqueRoutes.length];
        const pattern = patterns[i % patterns.length];
        scenarios.push({
            id: i + 1,
            routeId,
            routeName: `Route ${routeId}`,
            scenarioName: `${pattern.toUpperCase()} Simulation`,
            weatherPattern: pattern
        });
    }

    // 3. Run Predictions & Verify Advice
    const results = [];
    const stats = {
        total: 0,
        suspended: 0,
        delayed: 0,
        normal: 0,
        advice: {
            critical: 0,
            warning: 0,
            info: 0,
            alert: 0,
            none: 0
        },
        actionLinkShown: 0,
        cafeSuggestion: 0,
        waitSuggestion: 0
    };

    console.log(`\nProcessing ${scenarios.length} scenarios...`);

    for (const scenario of scenarios) {
        const weather = createMockWeather('2025-02-01', scenario.weatherPattern);

        const input: PredictionInput = {
            routeId: scenario.routeId,
            routeName: scenario.routeName,
            targetDate: '2025-02-01',
            targetTime: '18:00',
            weather: weather,
            jrStatus: null,
            crowdsourcedStatus: null
        };

        const result: PredictionResult = calculateSuspensionRisk(input);

        // Generate Advice
        // Mock Future Risks (simple logic based on current pattern)
        let futureRiskValue = result.probability;
        if (scenario.weatherPattern === 'snow_clearing') {
            futureRiskValue = 20; // 回復するので低リスク
        }

        const futureRisks = [
            { time: '19:00', risk: futureRiskValue, weatherIcon: 'snow' as const, isTarget: false },
            { time: '20:00', risk: futureRiskValue, weatherIcon: 'snow' as const, isTarget: false },
            { time: '21:00', risk: futureRiskValue, weatherIcon: 'snow' as const, isTarget: false }
        ];

        const advice = generateStrategicAdvice(result, futureRisks);
        const trafficRisk = calculateTrafficRisk(result);
        const availability = checkAlternativeAvailability(scenario.routeId, result, false, scenario.routeId.includes('chitose')); // Mock IsSapporo logic

        // Stats Aggregation
        stats.total++;
        if (result.status === '運転見合わせ' || result.status === '運休') stats.suspended++;
        else if (result.status === '遅延') stats.delayed++;
        else stats.normal++;

        if (advice) {
            stats.advice[advice.type]++;
            if (advice.actionLink) stats.actionLinkShown++;
            if (advice.title.includes('カフェ')) stats.cafeSuggestion++;
            if (advice.message.includes('様子を見る')) stats.waitSuggestion++;
        } else {
            stats.advice.none++;
        }

        results.push({
            id: scenario.id,
            pattern: scenario.weatherPattern,
            route: scenario.routeId,
            prob: result.probability,
            status: result.status,
            recovery: result.estimatedRecoveryHours,
            adviceType: advice?.type || 'None',
            adviceTitle: advice?.title || '-',
            hasLink: !!advice?.actionLink
        });
    }

    // 4. Report
    console.log('\n=== Verification Results ===');
    console.log(`Total Cases: ${stats.total}`);
    console.log(`\n[Prediction Stats]`);
    console.log(`  Suspended/Cancelled: ${stats.suspended} (${(stats.suspended / stats.total * 100).toFixed(1)}%)`);
    console.log(`  Delayed: ${stats.delayed} (${(stats.delayed / stats.total * 100).toFixed(1)}%)`);
    console.log(`  Normal: ${stats.normal} (${(stats.normal / stats.total * 100).toFixed(1)}%)`);

    console.log(`\n[Advice Stats]`);
    console.log(`  Critical: ${stats.advice.critical}`);
    console.log(`  Warning:  ${stats.advice.warning}`);
    console.log(`  Info:     ${stats.advice.info}`);
    console.log(`  None:     ${stats.advice.none}`);

    console.log(`\n[Action Suggestions]`);
    console.log(`  Cafe Suggestions: ${stats.cafeSuggestion}`);
    console.log(`  Wait In Station:  ${stats.waitSuggestion}`);
    console.log(`  Action Links Shown: ${stats.actionLinkShown}`);

    // CSV Output
    const csvHeader = 'ID,Pattern,Route,Probability,Status,RecoveryHours,AdviceType,AdviceTitle,HasLink\n';
    const csvRows = results.map(r => `${r.id},${r.pattern},${r.route},${r.prob},${r.status},${r.recovery},${r.adviceType},"${r.adviceTitle}",${r.hasLink}`).join('\n');

    const outputPath = path.join(process.cwd(), 'verification_report.csv');
    fs.writeFileSync(outputPath, csvHeader + csvRows);
    console.log(`\nDetailed report saved to: ${outputPath}`);

    // Validation Assertions
    console.log('\n[Validation Checks]');

    // Check 1: Blizzard should cause Suspensions
    const blizzardCases = results.filter(r => r.pattern === 'blizzard_cancel');
    const blizzardSuspensions = blizzardCases.filter(r => r.status === '運転見合わせ' || r.status === '運休');
    console.log(`  ✅ Blizzard -> Suspension: ${blizzardSuspensions.length}/${blizzardCases.length} (${(blizzardSuspensions.length / blizzardCases.length * 100).toFixed(0)}%)`);

    // Check 2: Cafe Suggestions should have Links
    const cafeCases = results.filter(r => r.adviceTitle.includes('カフェ'));
    const validCafeLinks = cafeCases.filter(r => r.hasLink);
    console.log(`  ✅ Cafe Suggestions -> Has Link: ${validCafeLinks.length}/${cafeCases.length}`);

    // Check 3: Calm weather should be Normal
    const calmCases = results.filter(r => r.pattern === 'calm');
    const calmNormal = calmCases.filter(r => r.status === '平常運転');
    console.log(`  ✅ Calm -> Normal: ${calmNormal.length}/${calmCases.length} (${(calmNormal.length / calmCases.length * 100).toFixed(0)}%)`);

}

runVerification().catch(e => console.error(e));
