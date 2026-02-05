// データ整合性テスト
// npm run test:data で実行

import {
    isValidStationId,
    isValidRouteId,
    isValidDate,
    isValidTime,
    isValidReportType,
    isValidProbability,
    sanitizeComment,
    validateReportInput,
} from './validation';

import { getStationById, getRouteById, HOKKAIDO_STATIONS, HOKKAIDO_ROUTES } from './hokkaido-data';

interface TestResult {
    name: string;
    passed: boolean;
    details?: string;
}

const results: TestResult[] = [];

function test(name: string, condition: boolean, details?: string): void {
    results.push({ name, passed: condition, details });
}

function runTests(): void {
    console.log('🧪 データ整合性テスト開始...\n');

    // =====================
    // バリデーション関数テスト
    // =====================
    console.log('📋 バリデーション関数テスト');

    test('有効な駅ID', isValidStationId('hokkaido.sapporo'));
    test('無効な駅ID（空文字）', !isValidStationId(''));
    test('無効な駅ID（特殊文字）', !isValidStationId('hokkaido/<script>'));
    test('無効な駅ID（長すぎ）', !isValidStationId('a'.repeat(100)));

    test('有効な路線ID', isValidRouteId('jr-hokkaido.hakodate-main'));
    test('無効な路線ID', !isValidRouteId(null));

    const today = new Date().toISOString().split('T')[0];
    test('有効な日付（今日）', isValidDate(today));
    test('無効な日付（形式エラー）', !isValidDate('2024/01/01'));
    test('無効な日付（遠い未来）', !isValidDate('2099-12-31'));

    test('有効な時刻', isValidTime('08:30'));
    test('無効な時刻（形式エラー）', !isValidTime('8:30'));
    test('無効な時刻（範囲外）', !isValidTime('25:00'));

    test('有効な報告タイプ', isValidReportType('stopped'));
    test('無効な報告タイプ', !isValidReportType('invalid'));

    test('有効な確率', isValidProbability(50));
    test('無効な確率（範囲外）', !isValidProbability(150));

    // =====================
    // サニタイズテスト
    // =====================
    console.log('🧹 サニタイズテスト');

    test('XSS防止', sanitizeComment('<script>alert(1)</script>') === 'alert(1)');
    test('JavaScript URLブロック', !sanitizeComment('javascript:void(0)').includes('javascript:'));
    test('長文切り詰め', sanitizeComment('a'.repeat(300)).length <= 200);

    // =====================
    // 報告バリデーションテスト
    // =====================
    console.log('📝 報告バリデーションテスト');

    const validReport = validateReportInput({
        routeId: 'jr-hokkaido.hakodate-main',
        reportType: 'delayed',
        comment: '5分遅延',
    });
    test('有効な報告入力', validReport.success);

    const invalidReport = validateReportInput({
        routeId: '',
        reportType: 'invalid',
    });
    test('無効な報告入力を拒否', !invalidReport.success);

    // =====================
    // 北海道データ整合性テスト
    // =====================
    console.log('🗺️ 北海道データ整合性テスト');

    // 駅データ
    test('駅データが存在', HOKKAIDO_STATIONS.length > 0);
    test('札幌駅が取得可能', getStationById('hokkaido.sapporo') !== undefined);

    // 全駅のID一意性
    const stationIds = HOKKAIDO_STATIONS.map(s => s.id);
    const uniqueStationIds = new Set(stationIds);
    test('全駅IDが一意', stationIds.length === uniqueStationIds.size);

    // 全駅に路線情報がある
    const stationsWithLines = HOKKAIDO_STATIONS.filter(s => s.lines && s.lines.length > 0);
    test('全駅に路線情報あり', stationsWithLines.length === HOKKAIDO_STATIONS.length);

    // 路線データ
    test('路線データが存在', HOKKAIDO_ROUTES.length > 0);
    test('函館本線が取得可能', getRouteById('jr-hokkaido.hakodate-main') !== undefined);

    // 全路線のID一意性
    const routeIds = HOKKAIDO_ROUTES.map(r => r.id);
    const uniqueRouteIds = new Set(routeIds);
    test('全路線IDが一意', routeIds.length === uniqueRouteIds.size);

    // 駅の路線参照が有効
    let invalidLineRefs = 0;
    HOKKAIDO_STATIONS.forEach(station => {
        station.lines.forEach(lineId => {
            if (!getRouteById(lineId)) {
                invalidLineRefs++;
            }
        });
    });
    test('全駅の路線参照が有効', invalidLineRefs === 0, `無効な参照: ${invalidLineRefs}件`);

    // =====================
    // 結果サマリー
    // =====================
    console.log('\n📊 テスト結果サマリー');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    results.forEach(r => {
        const status = r.passed ? '✅' : '❌';
        const details = r.details ? ` (${r.details})` : '';
        console.log(`${status} ${r.name}${details}`);
    });

    console.log('='.repeat(50));
    console.log(`合計: ${passed}/${results.length} テスト通過`);

    if (failed > 0) {
        console.log(`\n⚠️ ${failed} 件のテストが失敗しました`);
        process.exit(1);
    } else {
        console.log('\n🎉 全テスト通過！');
    }
}

// 実行
runTests();
