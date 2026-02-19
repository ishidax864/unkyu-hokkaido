import * as fs from 'fs';

function applyArchitecturalFix() {
    // 1. Update lib/prediction-engine/index.ts
    const indexPath = '/Users/shota/運休AI/lib/prediction-engine/index.ts';
    let indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Inject isNearRealTime calculation
    indexContent = indexContent.replace(
        /const historicalMatch = input\.weather \? findHistoricalMatch\(input\.weather\) : null;/g,
        `const historicalMatch = input.weather ? findHistoricalMatch(input.weather) : null;

    // 0.5. 近傍検索判定 (Near Real-Time Check) 🆕
    // 検索対象時刻が現在時刻から45分以内であれば「リアルタイム検索」とみなす
    const now = new Date();
    const targetDateTime = new Date(\`\${input.targetDate}T\${input.targetTime}:00\`);
    const diffMinutes = Math.abs(targetDateTime.getTime() - now.getTime()) / (1000 * 60);
    const isNearRealTime = diffMinutes <= 45;`
    );

    // Update function calls to pass isNearRealTime
    indexContent = indexContent.replace(
        /calculateRawRiskScore\(input, vulnerability, historicalMatch\)/g,
        'calculateRawRiskScore(input, vulnerability, historicalMatch, isNearRealTime)'
    );
    indexContent = indexContent.replace(
        /determineMaxProbability\(input\)/g,
        'determineMaxProbability(input, isNearRealTime)'
    );
    indexContent = indexContent.replace(
        /applyConfidenceFilter\(\{\s+probability,\s+totalScore,\s+windSpeed: input\.weather\.windSpeed \|\| 0,\s+windGust: input\.weather\.windGust \|\| 0,\s+snowfall: input\.weather\.snowfall \|\| 0,\s+jrStatus: input\.jrStatus\?\.status\s+\}\);/g,
        `applyConfidenceFilter({
            probability,
            totalScore,
            windSpeed: input.weather.windSpeed || 0,
            windGust: input.weather.windGust || 0,
            snowfall: input.weather.snowfall || 0,
            jrStatus: input.jrStatus?.status,
            isNearRealTime // 🆕 Pass flag
        });`
    );

    fs.writeFileSync(indexPath, indexContent);
    console.log('✅ lib/prediction-engine/index.ts updated');

    // 2. Update lib/prediction-engine/helpers.ts
    const helpersPath = '/Users/shota/運休AI/lib/prediction-engine/helpers.ts';
    let helpersContent = fs.readFileSync(helpersPath, 'utf-8');

    // Update determineMaxProbability signature and logic
    helpersContent = helpersContent.replace(
        /export function determineMaxProbability\(input: PredictionInput\): number \{/g,
        'export function determineMaxProbability(input: PredictionInput, isNearRealTime: boolean = false): number {'
    );

    // Replace the normal status block in determineMaxProbability
    helpersContent = helpersContent.replace(
        /\} else if \(input\.jrStatus\.status === 'normal'\) \{\s+\/\/ 🆕 公式が平常運転でも、気象が極端な場合は上限を緩和 \(35% -> 50%\)\s+const windGust = input\.weather\?\.windGust \?\? 0;\s+const snowfall = input\.weather\?\.snowfall \?\? 0;\s+if \(windGust >= 20 \|\| snowfall >= 3\.0\) \{\s+maxProbability = 50;\s+\} else \{\s+maxProbability = MAX_PREDICTION_WITH_NORMAL_DATA;\s+\}\s+\}/g,
        `} else if (input.jrStatus.status === 'normal') {
            // 🆕 「現在」かつ「公式が平常運転」なら強力に抑制（35%）
            // 未来の予測（!isNearRealTime）の場合は、このハードキャップを無効化し気象リスクを優先する
            if (isNearRealTime) {
                // 極端な気象（突風等）がある場合は、平常でも50%まで許容
                const windGust = input.weather?.windGust ?? 0;
                const snowfall = input.weather?.snowfall ?? 0;
                if (windGust >= 18 || snowfall >= 3.0) {
                    maxProbability = 50;
                } else {
                    maxProbability = MAX_PREDICTION_WITH_NORMAL_DATA;
                }
            } else {
                // 未来の予測なら、キャップを外して(80%等)気象・過去データとのブレンドを許可
                maxProbability = MAX_PREDICTION_WITHOUT_OFFICIAL_DATA;
            }
        }`
    );

    // Update evaluateRiskFactors signature and logic
    helpersContent = helpersContent.replace(
        /export function evaluateRiskFactors\(\s+input: PredictionInput,\s+vuln: VulnerabilityData,\s+riskFactors: RiskFactor\[\]\s+\): RiskEvaluationResult \{/g,
        'export function evaluateRiskFactors(\n    input: PredictionInput,\n    vuln: VulnerabilityData,\n    riskFactors: RiskFactor[],\n    isNearRealTime: boolean = false\n): RiskEvaluationResult {'
    );
    helpersContent = helpersContent.replace(
        /\/\/ JR公式情報があれば優先\s+if \(input\.jrStatus && input\.jrStatus\.status !== 'normal'\) \{/g,
        '// JR公式情報があれば優先（リアルタイム検索時のみ）\n    if (isNearRealTime && input.jrStatus && input.jrStatus.status !== "normal") {'
    );

    // Update applyConfidenceFilter signature and logic
    helpersContent = helpersContent.replace(
        /interface ConfidenceFilterParams \{\s+probability: number;\s+totalScore: number;\s+windSpeed: number;\s+windGust: number;\s+snowfall: number;\s+\}/g,
        `interface ConfidenceFilterParams {
    probability: number;
    totalScore: number;
    windSpeed: number;
    windGust: number;
    snowfall: number;
    isNearRealTime?: boolean; // 🆕
}`
    );
    helpersContent = helpersContent.replace(
        /export function applyConfidenceFilter\(params: ConfidenceFilterParams & \{ jrStatus\? : string \| null \}\): ConfidenceFilterResult \{/g,
        'export function applyConfidenceFilter(params: ConfidenceFilterParams & { jrStatus?: string | null }): ConfidenceFilterResult {'
    );
    helpersContent = helpersContent.replace(
        /const \{ probability, totalScore, windSpeed, windGust, snowfall, jrStatus \} = params;/g,
        'const { probability, totalScore, windSpeed, windGust, snowfall, jrStatus, isNearRealTime } = params;'
    );
    helpersContent = helpersContent.replace(
        /const isOfficialNormal = jrStatus === 'normal';/g,
        'const isOfficialNormal = jrStatus === "normal" && isNearRealTime;'
    );

    // Update calculateRawRiskScore signature and call to evaluateRiskFactors
    helpersContent = helpersContent.replace(
        /export function calculateRawRiskScore\(\s+input: PredictionInput,\s+vulnerability: VulnerabilityData,\s+historicalMatch: any\s+\): RiskEvaluationResult \{/g,
        'export function calculateRawRiskScore(\n    input: PredictionInput,\n    vulnerability: VulnerabilityData,\n    historicalMatch: any,\n    isNearRealTime: boolean = false\n): RiskEvaluationResult {'
    );
    helpersContent = helpersContent.replace(
        /const \{ totalScore: bScore, reasonsWithPriority: bReasons, hasRealTimeData \} = evaluateRiskFactors\(enrichedInput, vulnerability, RISK_FACTORS\);/g,
        'const { totalScore: bScore, reasonsWithPriority: bReasons, hasRealTimeData } = evaluateRiskFactors(enrichedInput, vulnerability, RISK_FACTORS, isNearRealTime);'
    );

    fs.writeFileSync(helpersPath, helpersContent);
    console.log('✅ lib/prediction-engine/helpers.ts updated');
}

applyArchitecturalFix();
