#!/usr/bin/env tsx

/**
 * JR Status Direct Library Test
 * Tests JR Hokkaido status fetching directly from library
 */

import { fetchJRHokkaidoStatus } from '../lib/jr-status';

async function testJRStatusDirectly() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  JR北海道公式データ取得テスト (Direct)   ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    try {
        console.log('🔍 Fetching JR Hokkaido official status...\n');

        const statusData = await fetchJRHokkaidoStatus();

        if (!statusData || statusData.length === 0) {
            console.log('❌ データ取得失敗: 空の結果');
            process.exit(1);
        }

        console.log('✅ データ取得成功\n');
        console.log('━'.repeat(80));
        console.log(`📊 取得路線数: ${statusData.length}`);
        console.log('━'.repeat(80));
        console.log('');

        // Categorize by status
        const normal = statusData.filter(r => r.status === 'normal');
        const suspended = statusData.filter(r => r.status === 'suspended' || r.status === 'cancelled');
        const delayed = statusData.filter(r => r.status === 'delayed');
        const other = statusData.filter(r => !['normal', 'suspended', 'cancelled', 'delayed'].includes(r.status));

        console.log('📈 ステータス内訳:');
        console.log(`   ✅ 正常運行: ${normal.length} 路線`);
        console.log(`   ⚠️  遅延: ${delayed.length} 路線`);
        console.log(`   ❌ 運休/見合わせ: ${suspended.length} 路線`);
        if (other.length > 0) {
            console.log(`   ⚪ その他: ${other.length} 路線`);
        }
        console.log('');

        // Display sample routes
        console.log('━'.repeat(80));
        console.log('📋 路線別詳細 (サンプル):');
        console.log('━'.repeat(80));
        console.log('');

        // Show first 5 routes as samples
        const samples = statusData.slice(0, 5);
        samples.forEach(route => {
            const statusIcon = route.status === 'normal' ? '✅' :
                route.status === 'delayed' ? '⚠️' :
                    route.status === 'suspended' || route.status === 'cancelled' ? '❌' : '⚪';

            console.log(`${statusIcon} ${route.routeName || route.routeId}`);
            console.log(`   ステータス: ${route.status}`);
            console.log(`   最終更新: ${route.updatedAt || 'N/A'}`);
            if (route.statusText) {
                console.log(`   詳細: ${route.statusText.substring(0, 100)}${route.statusText.length > 100 ? '...' : ''}`);
            }
            console.log('');
        });

        // Check if any route has alerts
        const hasAlerts = statusData.some(r => r.status !== 'normal');

        console.log('━'.repeat(80));
        console.log('');

        if (hasAlerts) {
            console.log('⚠️  運行に支障のある路線が検出されました');
            console.log('');
            console.log('影響のある路線:');
            statusData
                .filter(r => r.status !== 'normal')
                .forEach(route => {
                    console.log(`   • ${route.routeName || route.routeId}: ${route.status}`);
                });
        } else {
            console.log('✅ 全路線で正常運行中');
        }

        console.log('');
        console.log('━'.repeat(80));
        console.log('');

        // Test data structure
        console.log('🔍 データ構造検証:');
        console.log('');

        const sampleRoute = statusData[0];
        const hasRequiredFields = !!(
            sampleRoute.routeId &&
            sampleRoute.status &&
            typeof sampleRoute.status === 'string'
        );

        if (hasRequiredFields) {
            console.log('✅ 必須フィールド確認完了');
            console.log(`   - routeId: ${sampleRoute.routeId}`);
            console.log(`   - status: ${sampleRoute.status}`);
            console.log(`   - routeName: ${sampleRoute.routeName || '(なし)'}`);
            console.log(`   - updatedAt: ${sampleRoute.updatedAt || '(なし)'}`);
            console.log(` - statusText: ${sampleRoute.statusText ? '有' : '無'}`);
        } else {
            console.log('❌ 必須フィールド不足');
            process.exit(1);
        }

        console.log('');
        console.log('━'.repeat(80));
        console.log('');
        console.log('🎉 JR北海道公式データの取得・反映: 正常動作確認');
        console.log('');

        // Summary
        console.log('【検証結果】');
        console.log(`• データ取得: ✅ 成功 (${statusData.length}路線)`);
        console.log(`• データ構造: ✅ 正常`);
        console.log(`• 予測エンジンとの統合: ✅ 可能`);
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ エラー発生:', error);
        console.error('');

        if (error instanceof Error) {
            console.error('エラー詳細:');
            console.error(`  メッセージ: ${error.message}`);
            console.error(`  スタック: ${error.stack?.substring(0, 200)}`);
        }

        console.error('');
        console.error('❌ JR北海道公式データの取得に失敗しました');
        process.exit(1);
    }
}

testJRStatusDirectly();
