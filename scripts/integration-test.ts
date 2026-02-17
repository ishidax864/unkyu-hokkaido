#!/usr/bin/env tsx

/**
 * Integration Test Script
 * Tests prediction engine data flow: Weather API → Prediction Engine → Results
 */

import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { fetchRealWeatherForecast } from '../lib/weather';

interface TestResult {
    testName: string;
    passed: boolean;
    details: string;
    data?: any;
}

const results: TestResult[] = [];

async function testWeatherAPIIntegration() {
    console.log('\n🔍 Test 1: Weather API Integration');
    console.log('━'.repeat(50));

    try {
        // 札幌の天気データ取得
        const weather = await fetchRealWeatherForecast('sapporo', { lat: 43.0642, lon: 141.3469 });

        const passed = !!(
            weather &&
            weather.length > 0 &&
            weather[0].weather &&
            typeof weather[0].windSpeed === 'number' &&
            typeof weather[0].tempMax === 'number'
        );

        results.push({
            testName: 'Weather API Data Fetch',
            passed,
            details: passed
                ? `✅ Successfully fetched ${weather.length} days of weather data`
                : '❌ Failed to fetch valid weather data',
            data: weather?.[0]
        });

        if (passed) {
            console.log(`✅ Weather API working`);
            console.log(`   Wind Speed: ${weather[0].windSpeed} m/s`);
            console.log(`   Temperature: ${weather[0].tempMin}°C - ${weather[0].tempMax}°C`);
            console.log(`   Condition: ${weather[0].weather}`);
        }

        return { passed, weather };
    } catch (error) {
        console.error('❌ Weather API Error:', error);
        results.push({
            testName: 'Weather API Data Fetch',
            passed: false,
            details: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
        });
        return { passed: false, weather: null };
    }
}

async function testPredictionEngineCalculation(weather: any[]) {
    console.log('\n🔍 Test 2: Prediction Engine Calculation');
    console.log('━'.repeat(50));

    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const timeStr = '10:00';

        // 札幌→旭川の予測
        const prediction = calculateSuspensionRisk({
            routeId: 'jr-hokkaido.hakodate-main',
            routeName: '札幌→旭川',
            targetDate: dateStr,
            targetTime: timeStr,
            weather: weather[0]
        });

        const passed = !!(
            prediction &&
            typeof prediction.probability === 'number' &&
            prediction.probability >= 0 &&
            prediction.probability <= 100 &&
            prediction.reasons
        );

        results.push({
            testName: 'Prediction Engine Calculation',
            passed,
            details: passed
                ? `✅ Calculated risk: ${prediction.probability}%`
                : '❌ Failed to calculate valid prediction',
            data: prediction
        });

        if (passed) {
            console.log(`✅ Prediction Engine working`);
            console.log(`   Route: 札幌 → 旭川`);
            console.log(`   Risk: ${prediction.probability}%`);
            console.log(`   Reason: ${prediction.reasons[0]}`);
            console.log(`   Reasons:`, JSON.stringify(prediction.reasons, null, 2));
        }

        return { passed, prediction };
    } catch (error) {
        console.error('❌ Prediction Engine Error:', error);
        results.push({
            testName: 'Prediction Engine Calculation',
            passed: false,
            details: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
        });
        return { passed: false, prediction: null };
    }
}

async function testWeatherFactorIntegration(weather: any[], prediction: any) {
    console.log('\n🔍 Test 3: Weather Data Integration into Prediction');
    console.log('━'.repeat(50));

    if (!weather || !prediction) {
        results.push({
            testName: 'Weather Factor Integration',
            passed: false,
            details: '❌ Missing weather or prediction data'
        });
        return { passed: false };
    }

    const todayWeather = weather[0];
    const comparisonData = prediction.comparisonData;

    // Check if wind speed from weather API is being used
    const windFactorExists = comparisonData && comparisonData.wind !== undefined;
    const snowFactorExists = comparisonData && comparisonData.snow !== undefined;

    const passed = windFactorExists || snowFactorExists;

    results.push({
        testName: 'Weather Factor Integration',
        passed,
        details: passed
            ? `✅ Weather data integrated: Wind ${comparisonData.wind || 0}m/s, Snow ${comparisonData.snow || 0}cm`
            : '❌ Weather factors not found in prediction',
        data: { todayWeather, comparisonData }
    });

    if (passed) {
        console.log(`✅ Weather factors integrated into prediction`);
        console.log(`   API Wind Speed: ${todayWeather.windSpeed} m/s`);
        console.log(`   Prediction Wind Factor: ${comparisonData.wind || 'N/A'}`);
        console.log(`   Snowfall Factor: ${comparisonData.snow || 'N/A'} cm`);
    }

    return { passed };
}

async function testRiskCalculationLogic() {
    console.log('\n🔍 Test 4: Risk Calculation Logic Validation');
    console.log('━'.repeat(50));

    try {
        const dateStr = new Date().toISOString().split('T')[0];
        const weather = await fetchRealWeatherForecast('sapporo', { lat: 43.0642, lon: 141.3469 });

        // Test high risk scenario (if wind is strong)
        const highRisk = calculateSuspensionRisk({
            routeId: 'jr-hokkaido.hakodate-main',
            routeName: '札幌→旭川',
            targetDate: dateStr,
            targetTime: '10:00',
            weather: weather[0]
        });

        // Verify risk is within valid range
        const validRange = highRisk.probability >= 0 && highRisk.probability <= 100;
        const hasReasons = highRisk.reasons && highRisk.reasons.length > 0;
        const hasWeatherData = highRisk.comparisonData !== undefined;

        const passed = validRange && hasReasons && hasWeatherData;

        results.push({
            testName: 'Risk Calculation Logic',
            passed,
            details: passed
                ? `✅ Risk calculation valid: ${highRisk.probability}% with ${highRisk.reasons.length} reasons`
                : '❌ Invalid risk calculation',
            data: highRisk
        });

        if (passed) {
            console.log(`✅ Risk calculation logic validated`);
            console.log(`   Calculated Risk: ${highRisk.probability}%`);
            console.log(`   Number of Reasons: ${highRisk.reasons.length}`);
            console.log(`   Has Weather Data: ${hasWeatherData}`);
        }

        return { passed, prediction: highRisk };
    } catch (error) {
        console.error('❌ Risk Calculation Error:', error);
        results.push({
            testName: 'Risk Calculation Logic',
            passed: false,
            details: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
        });
        return { passed: false, prediction: null };
    }
}

async function runAllTests() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   Integration Test Suite - Data Flow    ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    const { passed: weatherPassed, weather } = await testWeatherAPIIntegration();

    if (!weatherPassed || !weather) {
        console.log('\n❌ Cannot continue tests without weather data');
        printSummary();
        return;
    }

    const { passed: predictionPassed, prediction } = await testPredictionEngineCalculation(weather);

    if (predictionPassed && prediction) {
        await testWeatherFactorIntegration(weather, prediction);
    }

    await testRiskCalculationLogic();

    printSummary();
}

function printSummary() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║          Test Summary                     ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

    results.forEach(result => {
        const icon = result.passed ? '✅' : '❌';
        console.log(`${icon} ${result.testName}`);
        console.log(`   ${result.details}\n`);
    });

    console.log('━'.repeat(50));
    console.log(`Total: ${passed}/${total} tests passed (${percentage}%)`);
    console.log('━'.repeat(50));

    if (percentage === 100) {
        console.log('\n🎉 All tests passed! Data flow is working correctly.');
    } else if (percentage >= 75) {
        console.log('\n⚠️  Most tests passed, but some issues detected.');
    } else {
        console.log('\n❌ Critical issues detected in data flow.');
    }

    process.exit(percentage === 100 ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
    console.error('\n💥 Fatal error during test execution:', error);
    process.exit(1);
});
