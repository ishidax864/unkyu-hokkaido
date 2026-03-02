
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput, WeatherForecast } from '../lib/types';
import { JROperationStatus } from '../lib/jr-status';

const mockWeather: WeatherForecast = {
    date: '2025-02-09',
    targetTime: '12:00',
    weather: '雪',
    tempMax: -2,
    tempMin: -8,
    precipitation: 0,
    windSpeed: 5, // 弱い風
    windGust: 10,
    snowfall: 5, // 少し雪
    snowDepth: 20,
    snowDepthChange: 0,
    weatherCode: 71,
    windDirection: 0,
    warnings: [],
    surroundingHours: [] // 明示的に空にして復旧予測が走らないようにする（あるいは走っても上書きされることを確認）
};

// ケース1: 公式情報なし（通常予測）
const inputNormal: PredictionInput = {
    routeId: 'jr-hokkaido.hakodate-main',
    routeName: '函館本線', // Added
    targetDate: '2025-02-09',
    targetTime: '12:00',
    weather: mockWeather,
    jrStatus: undefined,
};

// ケース2: 公式情報で「終日運休」
const inputSuspended: PredictionInput = {
    routeId: 'jr-hokkaido.hakodate-main',
    routeName: '函館本線', // Added
    targetDate: '2025-02-09',
    targetTime: '12:00',
    weather: mockWeather,
    jrStatus: {
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: '函館本線',
        status: 'suspended', // 運休
        statusText: '運休・運転見合わせが発生しています', // 固定文言
        rawText: '大雪のため、本日の運転は見合わせます。', // 生テキスト（キーワードあり）
        updatedAt: new Date().toISOString()
    } as JROperationStatus
};

// ケース3: 公式情報で「全区間運休」
const inputAllSectionSuspended: PredictionInput = {
    routeId: 'jr-hokkaido.hakodate-main',
    routeName: '函館本線', // Added
    targetDate: '2025-02-09',
    targetTime: '12:00',
    weather: mockWeather, // 天気は悪くない設定でも
    jrStatus: {
        routeId: 'jr-hokkaido.hakodate-main',
        routeName: '函館本線',
        status: 'suspended',
        statusText: '運休・運転見合わせが発生しています',
        rawText: '設備点検のため、全区間運休となります。終日運休です。', // キーワードあり
        updatedAt: new Date().toISOString()
    } as JROperationStatus
};

async function runTest() {
    console.log('--- Testing Official Info Override ---');

    console.log('\nCase 1: Normal (No Official Info)');
    const res1 = calculateSuspensionRisk(inputNormal);
    console.log(`Status: ${res1.status}, Recovery: ${res1.estimatedRecoveryTime}`);

    console.log('\nCase 2: Suspended (Official Info: "本日の運転は見合わせ")');
    const res2 = calculateSuspensionRisk(inputSuspended);
    console.log(`Status: ${res2.status}, Recovery: ${res2.estimatedRecoveryTime}`);
    console.log(`Recommendation: ${res2.recoveryRecommendation}`);

    if (res2.estimatedRecoveryTime === '終日運休') {
        console.log('✅ Success: Recovery time overridden to "終日運休"');
    } else {
        console.log('❌ Failure: Override failed');
    }

    console.log('\nCase 3: Suspended (Official Info: "全区間運休")');
    const res3 = calculateSuspensionRisk(inputAllSectionSuspended);
    console.log(`Status: ${res3.status}, Recovery: ${res3.estimatedRecoveryTime}`);
    if (res3.estimatedRecoveryTime === '終日運休') {
        console.log('✅ Success: Recovery time overridden to "終日運休"');
    } else {
        console.log('❌ Failure: Override failed');
    }
}

runTest();
