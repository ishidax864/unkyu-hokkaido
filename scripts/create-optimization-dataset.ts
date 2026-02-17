
import fs from 'fs';
import path from 'path';

interface GroundTruthItem {
    date: string;
    routeId: string;
    status: 'stopped' | 'delayed' | 'normal';
    cause: string;
    notes: string;
}

// ターゲット: 600件
// 構成:
// 1. 手動データ（信頼性が高い）: 全件 (~300)
// 2. 生成データ（遅延・高リスク）: 残りを埋める

async function createOptimizationDataset() {
    const inputPath = path.join(process.cwd(), 'lib/backtest/ground-truth-2000.json');
    const outputPath = path.join(process.cwd(), 'lib/backtest/ground-truth-600.json');

    const allData: GroundTruthItem[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    // 1. 手動データの抽出 (notesに'Generated'が含まれていないもの)
    const manualCases = allData.filter(item => !item.notes.includes('Generated'));
    console.log(`Found ${manualCases.length} manual cases.`);

    // 2. 生成データの抽出
    const generatedCases = allData.filter(item => item.notes.includes('Generated'));

    // 遅延ケースを優先
    const delayedGenerated = generatedCases.filter(item => item.status === 'delayed');
    console.log(`Found ${delayedGenerated.length} generated delay cases.`);

    // 残りを埋めるための候補（運休ケースと、風/雪が強い通常ケース）
    // 遅延予測の精度を上げたいので、「運休」よりも「境界線上の通常運転」や「運休」を混ぜる
    const otherGenerated = generatedCases.filter(item => item.status !== 'delayed');

    // ランダムにシャッフルして抽出（偏りを防ぐため）
    const shuffledOthers = otherGenerated.sort(() => 0.5 - Math.random());

    // ターゲット数まで埋める
    const targetTotal = 600;
    const needed = targetTotal - manualCases.length - delayedGenerated.length;

    const selectedOthers = shuffledOthers.slice(0, needed);

    const finalDataset = [
        ...manualCases,
        ...delayedGenerated,
        ...selectedOthers
    ];

    console.log(`Created dataset with ${finalDataset.length} cases.`);
    console.log(`- Manual: ${manualCases.length}`);
    console.log(`- Generated (Delayed): ${delayedGenerated.length}`);
    console.log(`- Generated (Others): ${selectedOthers.length}`);

    // 保存
    fs.writeFileSync(outputPath, JSON.stringify(finalDataset, null, 2));
    console.log(`Saved to ${outputPath}`);
}

createOptimizationDataset();
