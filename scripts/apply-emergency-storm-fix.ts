import * as fs from 'fs';
import * as path from 'path';

function applyFixes() {
    // 1. Update lib/jr-status.ts
    const jrStatusPath = '/Users/shota/運休AI/lib/jr-status.ts';
    let jrStatus = fs.readFileSync(jrStatusPath, 'utf-8');

    jrStatus = jrStatus.replace(
        /name: '千歳線',\s+keywords: \['千歳線', 'エアポート', '新千歳空港'\],/g,
        "name: '千歳線',\n        keywords: ['千歳線', 'エアポート', '新千歳空港', '札幌圏', '道央エリア'],"
    );

    jrStatus = jrStatus.replace(
        /name: '函館本線',\s+keywords: \['函館線', '函館本線', '小樽', '岩見沢', '滝川', 'ライラック', 'カムイ', '倶知安', 'ニセコ', '余市'\],/g,
        "name: '函館本線',\n        keywords: ['函館線', '函館本線', '小樽', '岩見沢', '滝川', 'ライラック', 'カムイ', '倶知安', 'ニセコ', '余市', '札幌圏', '道央エリア', '道北エリア'],"
    );

    jrStatus = jrStatus.replace(
        /name: '学園都市線',\s+keywords: \['学園都市線', '札沼線'\],/g,
        "name: '学園都市線',\n        keywords: ['学園都市線', '札沼線', '札幌圏'],"
    );

    jrStatus = jrStatus.replace(
        /name: '室蘭本線',\s+keywords: \['室蘭線', '室蘭本線', 'すずらん', '苫小牧', '東室蘭', '伊達紋別'\],/g,
        "name: '室蘭本線',\n        keywords: ['室蘭線', '室蘭本線', 'すずらん', '苫小牧', '東室蘭', '伊達紋別', '道央エリア', '道南エリア'],"
    );

    fs.writeFileSync(jrStatusPath, jrStatus);
    console.log('✅ lib/jr-status.ts updated');

    // 2. Update lib/prediction-engine/helpers.ts
    const helpersPath = '/Users/shota/運休AI/lib/prediction-engine/helpers.ts';
    let helpers = fs.readFileSync(helpersPath, 'utf-8');

    // Update determineMaxProbability
    helpers = helpers.replace(
        /\} else if \(input\.jrStatus\.status === 'normal'\) \{\s+\/\/ 🆕 公式が平常運転なら、気象に関わらずリスクを低く抑える（上限35%）\s+maxProbability = MAX_PREDICTION_WITH_NORMAL_DATA;\s+\}/g,
        "} else if (input.jrStatus.status === 'normal') {\n            // 🆕 公式が平常運転でも、気象が極端な場合は上限を緩和 (35% -> 50%)\n            const windGust = input.weather?.windGust ?? 0;\n            const snowfall = input.weather?.snowfall ?? 0;\n            if (windGust >= 20 || snowfall >= 3.0) {\n                maxProbability = 50;\n            } else {\n                maxProbability = MAX_PREDICTION_WITH_NORMAL_DATA;\n            }\n        }"
    );

    // Update applyConfidenceFilter
    const oldFilter = `export function applyConfidenceFilter(params: ConfidenceFilterParams & { jrStatus?: string | null }): ConfidenceFilterResult {
    const { probability, totalScore, windSpeed, windGust, snowfall, jrStatus } = params;

    // フィルタ適用条件をチェック
    // 🆕 公式が平常（normal）かつ気象警報等がない場合、抑制をより広範囲に適用する
    const isOfficialNormal = jrStatus === 'normal';
    const isInFilterRange = isOfficialNormal ? (probability >= 10 && probability < 80) : (probability >= 30 && probability < 60);
    const isLowScore = isOfficialNormal ? totalScore < 100 : totalScore < 40;
    const isWeakWeather = windSpeed < 20 && windGust < 30 && snowfall < 5.0; // 閾値を少し緩和して公式情報を優先

    if (isInFilterRange && isLowScore && isWeakWeather) {
        const suppressionRatio = isOfficialNormal ? 0.4 : 0.8; // 公式平常ならリスクをさらに6割カット
        return {
            filteredProbability: Math.round(probability * suppressionRatio),
            wasFiltered: true,
            reason: \`Filtered due to \${isOfficialNormal ? 'Official Normal Status' : 'Weak weather signal'} (wind: \${windSpeed}m/s, gust: \${windGust}m/s, snow: \${snowfall}cm)\`
        };
    }

    return {
        filteredProbability: probability,
        wasFiltered: false
    };
}`;

    const newFilter = `export function applyConfidenceFilter(params: ConfidenceFilterParams & { jrStatus?: string | null }): ConfidenceFilterResult {
    const { probability, totalScore, windSpeed, windGust, snowfall, jrStatus } = params;

    // フィルタ適用条件をチェック
    // 🆕 公式が平常（normal）かつ気象警報等がない場合、抑制をより広範囲に適用する
    const isOfficialNormal = jrStatus === 'normal';
    
    // 🆕 条件を厳格化：強風(20m/s)以下でも、突風(20m/s)があれば抑制を解除
    const isWeakWeather = windSpeed < 15 && windGust < 20 && snowfall < 1.0; 

    const isInFilterRange = isOfficialNormal 
        ? (probability >= 10 && probability < 80) 
        : (probability >= 30 && probability < 60);
    
    const isLowScore = isOfficialNormal ? totalScore < 80 : totalScore < 40;

    if (isInFilterRange && isLowScore && isWeakWeather) {
        // 公式平常時の抑制率を緩和 (0.4 -> 0.7) 
        const suppressionRatio = isOfficialNormal ? 0.7 : 0.8; 
        return {
            filteredProbability: Math.round(probability * suppressionRatio),
            wasFiltered: true,
            reason: \`Filtered due to \${isOfficialNormal ? 'Official Normal Status' : 'Weak weather signal'} (wind: \${windSpeed}m/s, gust: \${windGust}m/s, snow: \${snowfall}cm)\`
        };
    }

    return {
        filteredProbability: probability,
        wasFiltered: false
    };
}`;

    // Simple replacement might fail if formatting is slightly different, so use a more robust way
    // Let's try to find the start of the function and replace until the end
    const filterStart = helpers.indexOf('export function applyConfidenceFilter');
    if (filterStart !== -1) {
        const nextFunctionStart = helpers.indexOf('export function', filterStart + 1);
        if (nextFunctionStart !== -1) {
            helpers = helpers.substring(0, filterStart) + newFilter + '\n\n' + helpers.substring(nextFunctionStart);
        } else {
            // It's the last function
            helpers = helpers.substring(0, filterStart) + newFilter + '\n';
        }
    }

    fs.writeFileSync(helpersPath, helpers);
    console.log('✅ lib/prediction-engine/helpers.ts updated');
}

applyFixes();
