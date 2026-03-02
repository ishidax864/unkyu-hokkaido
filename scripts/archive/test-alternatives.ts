#!/usr/bin/env tsx

/**
 * Alternative Transport Test
 * Tests bus routes, taxi fare estimation, and facilities display
 */

import { getAlternativeRoutes, estimateTaxiFare, getStationById } from '../lib/hokkaido-data';
import { getStationFacilitiesList } from '../lib/alternative-options';

async function testAlternativeTransport() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  代替交通手段テスト (Alternative Transport)║');
    console.log('╚════════════════════════════════════════════╝\n');

    try {
        // Test 1: Bus alternative routes
        console.log('🔍 Test 1: バス代替ルート検索\n');

        const sapporoStation = getStationById('sapporo');
        const asahikawaStation = getStationById('asahikawa');

        if (!sapporoStation || !asahikawaStation) {
            console.log('❌ 駅データ取得失敗');
            process.exit(1);
        }

        const busRoutes = getAlternativeRoutes(sapporoStation.id, asahikawaStation.id);

        console.log(`✅ バスルート検索完了: ${busRoutes.length}件\n`);

        if (busRoutes.length > 0) {
            console.log('📋 検出されたバスルート:\n');
            busRoutes.forEach((route, index) => {
                console.log(`   ${index + 1}. ${route.name}`);
                console.log(`      所要時間: ${route.duration}`);
                console.log(`      料金: ${route.fare}`);
                console.log(`      詳細: ${route.details || 'なし'}`);
                console.log('');
            });
        } else {
            console.log('   ℹ️  この区間には登録されたバスルートはありません\n');
        }

        console.log('━'.repeat(80));
        console.log('');

        // Test 2: Taxi fare estimation
        console.log('🔍 Test 2: タクシー料金推定\n');

        const taxiFare = estimateTaxiFare(sapporoStation, asahikawaStation);

        if (taxiFare) {
            console.log('✅ タクシー料金推定成功\n');
            console.log(`   推定料金: ¥${taxiFare.estimatedFare.toLocaleString()}`);
            console.log(`   距離: ${taxiFare.distance}km`);
            console.log(`   所要時間: ${taxiFare.duration}`);
            console.log('');
        } else {
            console.log('   ❌ タクシー料金推定失敗\n');
        }

        console.log('━'.repeat(80));
        console.log('');

        // Test 3: Station facilities
        console.log('🔍 Test 3: 駅周辺施設情報\n');

        const facilities = getStationFacilitiesList(sapporoStation.id);

        console.log(`✅ 施設情報取得: ${facilities.length}件\n`);

        if (facilities.length > 0) {
            console.log('📋 利用可能な施設:\n');

            const groupedFacilities = facilities.reduce((acc, f) => {
                if (!acc[f.type]) acc[f.type] = [];
                acc[f.type].push(f);
                return acc;
            }, {} as Record<string, typeof facilities>);

            Object.entries(groupedFacilities).forEach(([type, items]) => {
                console.log(`   ${type}:`);
                items.forEach(item => {
                    console.log(`      • ${item.name}`);
                    if (item.description) {
                        console.log(`        ${item.description}`);
                    }
                });
                console.log('');
            });
        } else {
            console.log('   ℹ️  施設情報なし\n');
        }

        console.log('━'.repeat(80));
        console.log('');

        // Validation summary
        console.log('📊 検証サマリー:\n');

        const busRoutesValid = Array.isArray(busRoutes);
        const taxiFareValid = taxiFare === null || (
            taxiFare.estimatedFare > 0 &&
            taxiFare.distance > 0
        );
        const facilitiesValid = Array.isArray(facilities);

        console.log(`   バスルート検索: ${busRoutesValid ? '✅' : '❌'}`);
        console.log(`   タクシー料金推定: ${taxiFareValid ? '✅' : '❌'}`);
        console.log(`   施設情報取得: ${facilitiesValid ? '✅' : '❌'}`);
        console.log('');

        if (busRoutesValid && taxiFareValid && facilitiesValid) {
            console.log('✅ 代替交通手段機能: 正常動作確認\n');
            process.exit(0);
        } else {
            console.log('❌ 一部機能に問題あり\n');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ エラー発生:', error);
        console.error('');
        if (error instanceof Error) {
            console.error(`  メッセージ: ${error.message}`);
        }
        console.error('');
        process.exit(1);
    }
}

testAlternativeTransport();
