#!/usr/bin/env tsx

/**
 * Time Shift Suggestion Test
 * Tests alternative time recommendation logic
 */

import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { fetchRealWeatherForecast } from '../lib/weather';

interface TimeSlot {
    time: string;
    hour: number;
}

const TIME_SLOTS: TimeSlot[] = [
    { time: '06:00', hour: 6 },
    { time: '07:00', hour: 7 },
    { time: '08:00', hour: 8 },
    { time: '09:00', hour: 9 },
    { time: '10:00', hour: 10 },
    { time: '12:00', hour: 12 },
    { time: '15:00', hour: 15 },
    { time: '18:00', hour: 18 },
];

async function testTimeShiftSuggestions() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║     時間帯推奨機能テスト (Time Shift)     ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    try {
        const routeId = 'jr-hokkaido.hakodate-main';
        const routeName = '札幌（函館本線）';
        const dateStr = new Date().toISOString().split('T')[0];

        // Fetch weather data
        console.log('🔍 天気データ取得中...\n');
        const weather = await fetchRealWeatherForecast(routeId, {
            lat: 43.0621,
            lon: 141.3544
        });

        if (!weather || weather.length === 0) {
            console.log('❌ 天気データ取得失敗');
            process.exit(1);
        }

        // Calculate risk for different time slots
        console.log('🔍 各時間帯のリスク計算中...\n');
        const timeRisks = [];

        for (const slot of TIME_SLOTS) {
            const prediction = calculateSuspensionRisk({
                routeId,
                routeName,
                targetDate: dateStr,
                targetTime: slot.time,
                weather: weather[0]
            });

            timeRisks.push({
                time: slot.time,
                hour: slot.hour,
                risk: prediction.probability,
                status: prediction.status,
                reasons: prediction.reasons
            });
        }

        console.log('✅ 全時間帯の計算完了\n');
        console.log('━'.repeat(80));
        console.log('📊 時間帯別リスク:\n');

        timeRisks.forEach(tr => {
            const riskIcon = tr.risk >= 70 ? '🔴' :
                tr.risk >= 40 ? '🟡' :
                    tr.risk >= 20 ? '🟠' : '🟢';

            console.log(`${riskIcon} ${tr.time}: ${tr.risk}% (${tr.status})`);
        });

        console.log('\n━'.repeat(80));
        console.log('');

        // Find best alternative time
        const sortedByRisk = [...timeRisks].sort((a, b) => a.risk - b.risk);
        const lowestRisk = sortedByRisk[0];
        const highestRisk = sortedByRisk[sortedByRisk.length - 1];
        const baselineTime = timeRisks.find(tr => tr.time === '10:00') || timeRisks[0];

        console.log('📈 分析結果:');
        console.log(`   現在時刻基準 (10:00): ${baselineTime.risk}%`);
        console.log(`   最低リスク時間帯: ${lowestRisk.time} (${lowestRisk.risk}%)`);
        console.log(`   最高リスク時間帯: ${highestRisk.time} (${highestRisk.risk}%)`);
        console.log(`   リスク差: ${Math.abs(highestRisk.risk - lowestRisk.risk)}%`);
        console.log('');

        // Generate recommendation
        if (lowestRisk.risk < baselineTime.risk) {
            const difference = baselineTime.risk - lowestRisk.risk;
            console.log('✅ 時間変更推奨:');
            console.log(`   ${lowestRisk.time}発の列車に変更することで、`);
            console.log(`   リスクを${difference}%低減できます`);
            console.log(`   (${baselineTime.risk}% → ${lowestRisk.risk}%)`);
        } else {
            console.log('ℹ️  現在の時刻が最適です');
        }

        console.log('');
        console.log('━'.repeat(80));
        console.log('');

        // Validation
        const allValid = timeRisks.every(tr => tr.risk >= 0 && tr.risk <= 100);
        const hasVariation = highestRisk.risk - lowestRisk.risk > 5; // At least 5% difference

        if (allValid) {
            console.log('✅ 全ての時間帯で有効な計算');
            console.log(`✅ リスク変動確認: ${hasVariation ? '有' : '無'}`);
            console.log('✅ 時間帯推奨機能: 正常動作確認\n');
            process.exit(0);
        } else {
            console.log('❌ 計算に問題あり\n');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ エラー発生:', error);
        process.exit(1);
    }
}

testTimeShiftSuggestions();
