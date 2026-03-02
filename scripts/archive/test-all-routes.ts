#!/usr/bin/env tsx

/**
 * All Routes Validation Test
 * Tests all railway routes to ensure correct data flow
 */

import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { fetchRealWeatherForecast } from '../lib/weather';
import { ROUTE_COORDINATES } from '../lib/weather';

interface RouteTestResult {
    routeId: string;
    routeName: string;
    passed: boolean;
    details: string;
    risk?: number;
    weatherData?: boolean;
}

const results: RouteTestResult[] = [];

async function testRoute(routeId: string, routeData: { lat: number; lon: number; name: string }) {
    try {
        // 1. Fetch weather data for this route
        const weather = await fetchRealWeatherForecast(routeId, { lat: routeData.lat, lon: routeData.lon });

        if (!weather || weather.length === 0) {
            results.push({
                routeId,
                routeName: routeData.name,
                passed: false,
                details: '❌ 天気データ取得失敗',
                weatherData: false
            });
            return;
        }

        // 2. Calculate prediction
        const dateStr = new Date().toISOString().split('T')[0];
        const prediction = calculateSuspensionRisk({
            routeId,
            routeName: routeData.name,
            targetDate: dateStr,
            targetTime: '10:00',
            weather: weather[0]
        });

        // 3. Validate result
        const validRisk = prediction.probability >= 0 && prediction.probability <= 100;
        const hasReasons = prediction.reasons && prediction.reasons.length > 0;
        const hasWeatherData = prediction.comparisonData !== undefined;

        const passed = validRisk && hasReasons && hasWeatherData;

        results.push({
            routeId,
            routeName: routeData.name,
            passed,
            details: passed
                ? `✅ リスク: ${prediction.probability}% | 風速: ${weather[0].windSpeed}m/s | 理由数: ${prediction.reasons.length}`
                : `❌ 無効な計算結果`,
            risk: prediction.probability,
            weatherData: true
        });

    } catch (error) {
        results.push({
            routeId,
            routeName: routeData.name,
            passed: false,
            details: `❌ エラー: ${error instanceof Error ? error.message : String(error)}`,
            weatherData: false
        });
    }
}

async function runAllRouteTests() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  全路線検証テスト - All Routes Validation ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const routes = Object.entries(ROUTE_COORDINATES);
    console.log(`📊 テスト対象: ${routes.length} 路線\n`);

    // Test all routes
    for (const [routeId, routeData] of routes) {
        console.log(`🔍 Testing: ${routeData.name} (${routeId})`);
        await testRoute(routeId, routeData);
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    printSummary();
}

function printSummary() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║            テスト結果サマリー              ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

    // Group by status
    const successRoutes = results.filter(r => r.passed);
    const failedRoutes = results.filter(r => !r.passed);

    // Display successful routes
    if (successRoutes.length > 0) {
        console.log('✅ 正常動作路線:');
        console.log('━'.repeat(80));
        successRoutes.forEach(result => {
            console.log(`   ${result.routeName.padEnd(30)} ${result.details}`);
        });
        console.log('');
    }

    // Display failed routes
    if (failedRoutes.length > 0) {
        console.log('❌ 問題あり路線:');
        console.log('━'.repeat(80));
        failedRoutes.forEach(result => {
            console.log(`   ${result.routeName.padEnd(30)} ${result.details}`);
        });
        console.log('');
    }

    // Statistics
    console.log('━'.repeat(80));
    console.log(`📊 合計: ${passed}/${total} 路線合格 (${percentage}%)`);
    console.log('━'.repeat(80));

    if (percentage === 100) {
        console.log('\n🎉 全路線で正常動作確認！');
    } else if (percentage >= 80) {
        console.log('\n⚠️  ほとんどの路線は正常ですが、一部に問題があります');
    } else {
        console.log('\n❌ 複数の路線で問題が検出されました');
    }

    // Risk distribution
    const risksWithData = results.filter(r => r.risk !== undefined).map(r => r.risk!);
    if (risksWithData.length > 0) {
        const avgRisk = Math.round(risksWithData.reduce((a, b) => a + b, 0) / risksWithData.length);
        const maxRisk = Math.max(...risksWithData);
        const minRisk = Math.min(...risksWithData);
        console.log(`\n📈 リスク分布: 最小 ${minRisk}% | 平均 ${avgRisk}% | 最大 ${maxRisk}%`);
    }

    process.exit(percentage === 100 ? 0 : 1);
}

// Run tests
runAllRouteTests().catch((error) => {
    console.error('\n💥 致命的エラー:', error);
    process.exit(1);
});
