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
            snowDepth: { min: 40 }, // 24時間で40cm以上など
            snowfallHourly: { min: 5 }, // 1時間に5cm以上が続く
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 24, // 実質丸1日止まることが多い
            recoveryTendency: 'next-day',
            advice: '過去の事例では、このクラスの大雪は終日運休となり、運転再開は早くても「翌日の朝」以降でした。無理に駅で待機せず、他の移動手段か宿泊を検討してください。',
        },
        examples: ['2022年2月6日', '2026年1月25日'],
    },
    {
        id: 'heavy-wind-low-pressure',
        label: '発達した低気圧による暴風（2023年2月型）',
        conditions: {
            windGust: { min: 25 },
            windSpeed: { min: 20 },
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 6,
            recoveryTendency: 'slow',
            advice: '過去の事例では、風速25m/sを超えると安全確保のため運転見合わせとなりました。風のピークが過ぎるまで数時間は再開されません。地下鉄などは動いている可能性があります。',
        },
        examples: ['2023年2月1日', '2026年1月19日'],
    },
    {
        id: 'night-snow-removal',
        label: '除雪作業のための計画運休',
        conditions: {
            snowfallHourly: { min: 3 }, // 断続的な雪
        },
        consequences: {
            suspensionScale: 'partial',
            typicalDurationHours: 12, // 夜間〜翌朝
            recoveryTendency: 'next-day',
            advice: '大雪予報のため、除雪作業時間を確保するための「計画運休（最終列車の繰り上げ等）」が実施される可能性があります。夜間の移動は早めに行動してください。',
        },
        examples: ['2026年1月28日'],
    },
    {
        id: 'autumn-deer-collision',
        label: '秋季エゾシカ多発時期（10-12月夕方）',
        conditions: {
            // 条件は季節・時間帯（ロジック側で判定）
        },
        consequences: {
            suspensionScale: 'delay',
            typicalDurationHours: 2, // 処理に2時間程度
            recoveryTendency: 'fast',
            advice: '10月〜12月の夕方（16時〜20時）はエゾシカ衝突事故が年間で最も多い時間帯です。急な急停車や30分〜2時間程度の遅れが発生する確率が高いです。',
        },
        examples: ['2020年10月', '2023年11月'],
    },
    {
        id: 'heavy-rain-typhoon',
        label: '秋季台風・大雨（2022年8月型）',
        conditions: {
            // 降水量
        },
        consequences: {
            suspensionScale: 'all',
            typicalDurationHours: 12,
            recoveryTendency: 'slow',
            advice: '過去の事例では、この規模の大雨（土砂流入リスク）により始発から終日運休となりました。雨が止んでも点検に半日以上かかることがあります。',
        },
        examples: ['2022年8月16日', '2021年10月20日'],
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

    // 1. 災害級大雪 (季節問わず、降雪量で判定)
    if (snow >= 5) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'disaster-snow-sapporo') || null;
    }

    // 2. 秋季台風・大雨 (8-10月, 30mm/h以上)
    if ((month >= 8 && month <= 10) && rain >= 30) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'heavy-rain-typhoon') || null;
    }

    // 3. 暴風 (季節問わず、有効最大風速33m/s以上)
    if (effectiveGust >= 35 || wind >= 33) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'heavy-wind-low-pressure') || null;
    }

    // 4. エゾシカ (10-12月, 16-20時)
    if ((month >= 10 && month <= 12) && (hour >= 16 && hour <= 20)) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'autumn-deer-collision') || null;
    }

    // 5. 断続的な雪（冬期夜間運休リスク）
    if (snow >= 3) {
        return HISTORICAL_PATTERNS.find(p => p.id === 'night-snow-removal') || null;
    }

    return null;
}
