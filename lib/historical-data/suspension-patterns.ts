import { WeatherForecast } from '../types';

export interface HistoricalPattern {
    id: string;
    label: string; // e.g., "災害級大雪(2022年2月型)"
    conditions: {
        snowDepth?: { min: number; durationHours?: number }; // 積雪量
        snowfallHourly?: { min: number }; // 時間降雪量
        windSpeed?: { min: number }; // 風速
        windGust?: { min: number }; // 瞬間風速
        isStorm?: boolean; // 暴風雪警報など
    };
    consequences: {
        suspensionScale: 'all' | 'partial' | 'delay'; // 全面運休 / 部分運休 / 遅延
        typicalDurationHours: number; // 典型的な運休時間
        recoveryTendency: 'next-day' | 'slow' | 'fast'; // 翌日再開 / 半日以上 / ピーク過ぎればすぐ
        advice: string; // ユーザーへの助言
    };
    examples: string[]; // 実際の過去事例（日付など）
}

export const HISTORICAL_PATTERNS: HistoricalPattern[] = [
    {
        id: 'disaster-snow-sapporo',
        label: '札幌圏災害級大雪（2022年2月型）',
        conditions: {
            snowDepth: { min: 40 },
            snowfallHourly: { min: 5 },
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 48,
            recoveryTendency: 'slow',
            advice: '過去の2022年2月大雪では、札幌圏の全列車が2日間にわたり運休しました。除雪が追いつかず、再開後も数日はダイヤが混乱します。無理な移動は避け、早めの代替手段確保を。',
        },
        examples: ['2022年2月6日', '2022年2月21日'],
    },
    {
        id: 'explosive-cyclogenesis',
        label: '猛烈な発達を遂げた爆弾低気圧（2014年12月型）',
        conditions: {
            windGust: { min: 35 },
            isStorm: true,
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 24,
            recoveryTendency: 'slow',
            advice: '2014年の記録的低気圧では、全道で数日間にわたり交通がストップし、数千人が駅などで足止めされました。猛吹雪による視界ゼロ（ホワイトアウト）の危険があるため、命を守る行動を優先してください。',
        },
        examples: ['2014年12月17日', '2015年1月19日'],
    },
    {
        id: 'typhoon-multi-hit',
        label: '連続台風・記録的大雨（2016年8月型）',
        conditions: {
            // 24時間降水量150mm以上目安
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 72,
            recoveryTendency: 'slow',
            advice: '2016年の連続台風では、橋梁流出や土砂流入により、石勝線・根室線などが数ヶ月にわたり不通となりました。大雨による地盤緩みは雨が止んだ後も危険が続くため、長期的な運休を覚悟する必要があります。',
        },
        examples: ['2016年8月17日(台風7号/11号/9号/10号)'],
    },
    {
        id: 'record-intense-snow',
        label: '短時間記録的大雪（2016年12月型）',
        conditions: {
            snowfallHourly: { min: 10 },
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 12,
            recoveryTendency: 'fast',
            advice: '短時間で50cm以上の雪が積もる「ドカ雪」パターンです。駅や線路の除雪が追いつかず、突発的な運転見合わせが発生します。雪のピークが過ぎれば数時間で再開しますが、駅の混雑に注意してください。',
        },
        examples: ['2016年12月22日(新千歳空港欠航100便超)'],
    },
    {
        id: 'heavy-wind-low-pressure',
        label: '発達した低気圧による暴風（2023年2月型）',
        conditions: {
            windGust: { min: 25 },
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 6,
            recoveryTendency: 'slow',
            advice: '過去の事例では、風速25m/sを超えると安全確保のため運転見合わせとなりました。風のピークが過ぎるまで数時間は再開されません。地下鉄などは動いている可能性があります。',
        },
        examples: ['2023年2月1日', '2024年1月15日'],
    },
    {
        id: 'spring-storm',
        label: '春の嵐・急速な融雪（3月-5月型）',
        conditions: {},
        consequences: {
            suspensionScale: 'partial',
            typicalDurationHours: 4,
            recoveryTendency: 'fast',
            advice: '春特有の低気圧による強風や、急速な融雪による線路下の地盤緩み、飛来物による架線トラブルが発生しやすい時期です。突発的な遅延や一部運休に注意してください。',
        },
        examples: ['2024年3月20日', '2024年4月9日'],
    },
    {
        id: 'night-snow-removal',
        label: '除雪作業のための計画運休',
        conditions: {
            snowfallHourly: { min: 3 },
        },
        consequences: {
            suspensionScale: 'partial',
            typicalDurationHours: 12,
            recoveryTendency: 'next-day',
            advice: '大雪予報のため、除雪作業時間を確保するための「計画運休（最終列車の繰り上げ等）」が実施される可能性があります。夜間の移動は早めに行動してください。',
        },
        examples: ['2022年1月', '2024年1月'],
    },
    {
        id: 'blizzard-coastal',
        label: '沿岸部暴風雪（オホーツク・日本海沿岸型）',
        conditions: {
            windSpeed: { min: 18 },
            snowfallHourly: { min: 2 },
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 12,
            recoveryTendency: 'slow',
            advice: '沿岸部特有の猛烈な吹き溜まりにより、除雪作業が難航するパターンです。風が止んだ後も、線路の除雪に半日以上を要することがあります。',
        },
        examples: ['石北線', '宗谷線', '根室線（花咲線）'],
    },
    {
        id: 'heavy-snow-inland',
        label: '内陸部集中豪雪（空知・上川型）',
        conditions: {
            snowDepth: { min: 30 },
            snowfallHourly: { min: 5 },
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 18,
            recoveryTendency: 'slow',
            advice: '内陸部の集中豪雪により、駅構内やポイントの除雪に長時間を要します。特に岩見沢周辺や旭川周辺での大規模な運休が発生しやすい事例です。',
        },
        examples: ['函館本線（岩見沢〜旭川）', '宗谷本線'],
    },
    {
        id: 'autumn-deer-collision',
        label: '秋季エゾシカ多発時期（10-12月夕方）',
        conditions: {},
        consequences: {
            suspensionScale: 'delay',
            typicalDurationHours: 2,
            recoveryTendency: 'fast',
            advice: '10月〜12月の夕方（16時〜20時）はエゾシカ衝突事故が年間で最も多い時間帯です。急な急停車や30分〜2時間程度の遅れが発生する確率が高いです。',
        },
        examples: ['2020年10月', '2023年11月'],
    },
];

export function findHistoricalMatch(weather: WeatherForecast): HistoricalPattern | null {
    const snow = weather.snowfall || 0;
    const wind = weather.windSpeed || 0;
    const gust = weather.windGust || 0;
    const rain = weather.precipitation || 0;

    // 日付パース
    const date = new Date(weather.date);
    const month = date.getMonth() + 1; // 1-12

    // 時間パース (YYYY-MM-DDTHH:MM or HH:MM)
    let hour = 12;
    if (weather.targetTime) {
        // targetTime might be "HH:MM" or part of ISO string depending on provider
        // OpenMeteo handler sets it as "HH:00" usually
        const timeStr = weather.targetTime;
        hour = parseInt(timeStr.split(':')[0]);
    }

    // 異常値対策: 平均風速に対して突風があまりに大きすぎる場合（3倍以上かつ平均15m/s未満）
    let effectiveGust = gust;
    if (wind < 15 && gust > wind * 3) {
        effectiveGust = Math.max(wind * 3, 15); // 最低でも15m/sは維持しつつ、3倍でキャップ
    }

    // 優先度順にチェック

    // 1. 爆弾低気圧 (猛烈な暴風: 瞬間40m/s以上、または平均25m/s以上)
    if (effectiveGust >= 40 || wind >= 25) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'explosive-cyclogenesis') || null;
    }

    // 2. 連続台風・記録的大雨 (24h降水量または現在降水量で判定)
    if (rain >= 40 || ((month >= 8 && month <= 10) && rain >= 25)) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'typhoon-multi-hit') || null;
    }

    // 3. 短時間記録的大雪 (10cm/h以上)
    if (snow >= 10) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'record-intense-snow') || null;
    }

    // 4. 災害級大雪 (5cm/h以上)
    if (snow >= 5) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'disaster-snow-sapporo') || null;
    }

    // 5. 発達した低気圧による暴風 (瞬間30m/s以上、または平均20m/s以上)
    if (effectiveGust >= 30 || wind >= 20) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'heavy-wind-low-pressure') || null;
    }

    // 🆕 沿岸部暴風雪の追加判定
    if (wind >= 18 && snow >= 2) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'blizzard-coastal') || null;
    }

    // 🆕 内陸部集中豪雪の追加判定
    if (snow >= 5 && (month === 1 || month === 2)) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'heavy-snow-inland') || null;
    }

    // 6. 春の嵐 (3-5月, 15m/s以上)
    if ((month >= 3 && month <= 5) && effectiveGust >= 20) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'spring-storm') || null;
    }

    // 7. エゾシカ (10-12月, 16-20時)
    if ((month >= 10 && month <= 12) && (hour >= 16 && hour <= 20)) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'autumn-deer-collision') || null;
    }

    // 8. 断続的な雪（冬期夜間運休リスク）
    if (snow >= 3) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'night-snow-removal') || null;
    }

    return null;
}
