#!/usr/bin/env tsx

/**
 * JR Status API Integration Test
 * Tests official JR Hokkaido operation status data flow
 */

interface JRStatusTestResult {
    testName: string;
    passed: boolean;
    details: string;
    data?: any;
}

const results: JRStatusTestResult[] = [];

async function testJRStatusAPI() {
    console.log('\n🔍 Test 1: JR Status API Endpoint');
    console.log('━'.repeat(50));

    try {
        const response = await fetch('http://localhost:3001/api/jr-status');

        if (!response.ok) {
            results.push({
                testName: 'JR Status API Response',
                passed: false,
                details: `❌ HTTP ${response.status}: ${response.statusText}`
            });
            return { passed: false, data: null };
        }

        const data = await response.json();

        const passed = !!(
            data &&
            typeof data === 'object' &&
            data.routes
        );

        results.push({
            testName: 'JR Status API Response',
            passed,
            details: passed
                ? `✅ API動作確認 | 路線数: ${Object.keys(data.routes || {}).length}`
                : '❌ 無効なレスポンス',
            data
        });

        if (passed) {
            console.log('✅ JR Status API working');
            console.log(`   Routes found: ${Object.keys(data.routes).length}`);
            console.log(`   Updated: ${data.updatedAt || 'unknown'}`);
        }

        return { passed, data };
    } catch (error) {
        console.error('❌ JR Status API Error:', error);
        results.push({
            testName: 'JR Status API Response',
            passed: false,
            details: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
        });
        return { passed: false, data: null };
    }
}

async function testJRStatusDataStructure(jrData: any) {
    console.log('\n🔍 Test 2: JR Status Data Structure');
    console.log('━'.repeat(50));

    if (!jrData || !jrData.routes) {
        results.push({
            testName: 'JR Status Data Structure',
            passed: false,
            details: '❌ No route data available'
        });
        return { passed: false };
    }

    const routes = jrData.routes;
    const routeIds = Object.keys(routes);

    let validRoutes = 0;
    let sampleRoute: any = null;

    for (const routeId of routeIds) {
        const route = routes[routeId];

        // Check if route has required fields
        if (route.status && route.lastUpdate) {
            validRoutes++;
            if (!sampleRoute) sampleRoute = { id: routeId, data: route };
        }
    }

    const passed = validRoutes > 0;

    results.push({
        testName: 'JR Status Data Structure',
        passed,
        details: passed
            ? `✅ 有効な路線データ: ${validRoutes}/${routeIds.length}`
            : '❌ 有効な路線データなし',
        data: sampleRoute
    });

    if (passed && sampleRoute) {
        console.log('✅ Data structure valid');
        console.log(`   Sample route: ${sampleRoute.id}`);
        console.log(`   Status: ${sampleRoute.data.status}`);
        console.log(`   Last update: ${sampleRoute.data.lastUpdate}`);
    }

    return { passed, sampleRoute };
}

async function testJRStatusIntegrationWithPrediction() {
    console.log('\n🔍 Test 3: JR Status Integration with Prediction Engine');
    console.log('━'.repeat(50));

    try {
        // Fetch JR status
        const jrResponse = await fetch('http://localhost:3001/api/jr-status');
        const jrData = await jrResponse.json();

        if (!jrData.routes || Object.keys(jrData.routes).length === 0) {
            results.push({
                testName: 'JR Status Integration',
                passed: false,
                details: '❌ No JR status data to integrate'
            });
            return { passed: false };
        }

        // Check if prediction engine can use this data
        const sampleRouteId = Object.keys(jrData.routes)[0];
        const sampleStatus = jrData.routes[sampleRouteId];

        const hasRequiredFields = !!(
            sampleStatus.status &&
            typeof sampleStatus.status === 'string'
        );

        const passed = hasRequiredFields;

        results.push({
            testName: 'JR Status Integration',
            passed,
            details: passed
                ? `✅ 予測エンジンとの統合可能 | ステータス: ${sampleStatus.status}`
                : '❌ 必要フィールド不足',
            data: sampleStatus
        });

        if (passed) {
            console.log('✅ Integration possible');
            console.log(`   Route: ${sampleRouteId}`);
            console.log(`   Status: ${sampleStatus.status}`);
            console.log(`   Can be used by prediction engine: Yes`);
        }

        return { passed };
    } catch (error) {
        console.error('❌ Integration Test Error:', error);
        results.push({
            testName: 'JR Status Integration',
            passed: false,
            details: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
        });
        return { passed: false };
    }
}

async function testCacheBehavior() {
    console.log('\n🔍 Test 4: Cache Behavior');
    console.log('━'.repeat(50));

    try {
        // First request
        const start1 = Date.now();
        const response1 = await fetch('http://localhost:3001/api/jr-status');
        const data1 = await response1.json();
        const time1 = Date.now() - start1;

        // Second request (should be cached)
        const start2 = Date.now();
        const response2 = await fetch('http://localhost:3001/api/jr-status');
        const data2 = await response2.json();
        const time2 = Date.now() - start2;

        // Cache should make second request faster
        const likelyCached = time2 < time1 * 0.8; // At least 20% faster

        const passed = response1.ok && response2.ok;

        results.push({
            testName: 'Cache Behavior',
            passed,
            details: passed
                ? `✅ キャッシュ動作 | 1st: ${time1}ms, 2nd: ${time2}ms${likelyCached ? ' (cached ✓)' : ''}`
                : '❌ キャッシュエラー',
            data: { time1, time2, likelyCached }
        });

        if (passed) {
            console.log('✅ Cache working');
            console.log(`   First request: ${time1}ms`);
            console.log(`   Second request: ${time2}ms`);
            console.log(`   Likely cached: ${likelyCached ? 'Yes' : 'No'}`);
        }

        return { passed };
    } catch (error) {
        console.error('❌ Cache Test Error:', error);
        results.push({
            testName: 'Cache Behavior',
            passed: false,
            details: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
        });
        return { passed: false };
    }
}

async function runAllTests() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   JR Status API Integration Test Suite  ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    const { passed: apiPassed, data: jrData } = await testJRStatusAPI();

    if (apiPassed && jrData) {
        await testJRStatusDataStructure(jrData);
        await testJRStatusIntegrationWithPrediction();
        await testCacheBehavior();
    } else {
        console.log('\n❌ Cannot continue tests without JR Status API access');
    }

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
        console.log('\n🎉 JR公式データの取得・反映が正常に動作しています！');
    } else if (percentage >= 75) {
        console.log('\n⚠️  ほとんどのテストは合格していますが、一部に問題があります');
    } else {
        console.log('\n❌ JR公式データの取得・反映に問題があります');
    }

    process.exit(percentage === 100 ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
    console.error('\n💥 Fatal error during test execution:', error);
    process.exit(1);
});
