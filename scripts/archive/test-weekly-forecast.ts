#!/usr/bin/env tsx

/**
 * Weekly Forecast Test
 * Tests 7-day prediction generation and accuracy
 */

import { calculateWeeklyForecast } from '../lib/prediction-engine';
import { fetchRealWeatherForecast } from '../lib/weather';

async function testWeeklyForecast() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     週間予測テスト (Weekly Forecast)  ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
        // Fetch 7-day weather data for Sapporo
        console.log('🔍 札幌の7日間天気データ取得中...\n');
        const weather = await fetchRealWeatherForecast('jr-hokkaido.hakodate-main', {
            lat: 43.0621,
            lon: 141.3544
        });

        if (!weather || weather.length === 0) {
            console.log('❌ 天気データ取得失敗');
            process.exit(1);
        }

        console.log(`✅ ${weather.length}日分の天気データ取得成功\n`);

        // Generate weekly forecast
        console.log('🔍 週間予測計算中...\n');
        const forecast = calculateWeeklyForecast(
            'jr-hokkaido.hakodate-main',
            '札幌（函館本線）',
            weather
        );

        if (!forecast || forecast.length === 0) {
            console.log('❌ 週間予測生成失敗');
            process.exit(1);
        }

        console.log(`✅ ${forecast.length}日分の予測生成成功\n`);
        console.log('━'.repeat(80));
        console.log('📊 週間予測詳細:\n');

        // Display forecast details
        forecast.forEach((day, index) => {
            const riskIcon = day.probability >= 70 ? '🔴' :
                day.probability >= 40 ? '🟡' :
                    day.probability >= 20 ? '🟠' : '🟢';

            console.log(`${riskIcon} Day ${index + 1}: ${day.targetDate}`);
            console.log(`   リスク: ${day.probability}%`);
            console.log(`   ステータス: ${day.status}`);
            console.log(`   信頼度: ${day.confidence}`);
            console.log(`   理由数: ${day.reasons?.length || 0}`);
            if (day.reasons && day.reasons.length > 0) {
                console.log(`   主な理由: ${day.reasons[0]}`);
            }
            console.log('');
        });

        console.log('━'.repeat(80));
        console.log('');

        // Statistics
        const risks = forecast.map(f => f.probability);
        const avgRisk = Math.round(risks.reduce((a, b) => a + b, 0) / risks.length);
        const maxRisk = Math.max(...risks);
        const minRisk = Math.min(...risks);
        const highRiskDays = forecast.filter(f => f.probability >= 40).length;

        console.log('📈 統計情報:');
        console.log(`   平均リスク: ${avgRisk}%`);
        console.log(`   最大リスク: ${maxRisk}%`);
        console.log(`   最小リスク: ${minRisk}%`);
        console.log(`   高リスク日数 (≥40%): ${highRiskDays}日`);
        console.log('');

        // Validation
        const allValid = forecast.every(f =>
            f.probability >= 0 &&
            f.probability <= 100 &&
            f.reasons &&
            f.reasons.length > 0
        );

        console.log('━'.repeat(80));
        console.log('');

        if (allValid) {
            console.log('✅ 全ての予測が有効な範囲内');
            console.log('✅ 週間予測機能: 正常動作確認\n');
            process.exit(0);
        } else {
            console.log('❌ 一部の予測に問題あり\n');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ エラー発生:', error);
        process.exit(1);
    }
}

testWeeklyForecast();
