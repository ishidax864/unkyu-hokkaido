import { RiskFactor, VulnerabilityData } from '../types';
import { getJRStatusWeight } from '../jr-status';
import { getRecencyWeight } from './helpers';

import {
    STORM_WARNING_SCORE,
    HEAVY_SNOW_WARNING_SCORE,
    HEAVY_RAIN_WARNING_SCORE,
    THUNDER_ADVISORY_SCORE,
    STRONG_WIND_BASE_SCORE,
    STRONG_WIND_EXCESS_COEFFICIENT,
    STRONG_WIND_MAX_BONUS,
    MODERATE_WIND_MIN,
    MODERATE_WIND_BASE_SCORE,
    MODERATE_WIND_COEFFICIENT,
    LIGHT_WIND_MIN,
    LIGHT_WIND_MAX,
    LIGHT_WIND_SCORE,
    HEAVY_SNOW_BASE_SCORE,
    HEAVY_SNOW_EXCESS_COEFFICIENT,
    HEAVY_SNOW_MAX_BONUS,
    MODERATE_SNOW_MIN,
    MODERATE_SNOW_BASE_SCORE,
    MODERATE_SNOW_COEFFICIENT,
    LIGHT_SNOW_MIN,
    LIGHT_SNOW_MAX,
    LIGHT_SNOW_SCORE,
    HEAVY_RAIN_BASE_SCORE,
    HEAVY_RAIN_EXCESS_COEFFICIENT,
    HEAVY_RAIN_MAX_BONUS,
    HEAVY_RAIN_THRESHOLD,
    MODERATE_RAIN_MIN,
    MODERATE_RAIN_MAX,
    MODERATE_RAIN_BASE_SCORE,
    MODERATE_RAIN_COEFFICIENT,
    WIND_GUST_DANGER_THRESHOLD,
    WIND_GUST_BASE_SCORE,
    WIND_GUST_MAX_BONUS,
    USER_REPORT_STOPPED_SCORE,
    USER_REPORT_DELAYED_SCORE,
    USER_REPORT_CROWDED_SCORE,
    USER_REPORT_COUNT_BONUS_COEFFICIENT,
    USER_REPORT_MAX_BONUS,
    MIN_USER_REPORT_COUNT,
    MODERATE_SNOW_DEPTH_THRESHOLD, // 🆕
    MODERATE_SNOW_DEPTH_SCORE, // 🆕
    CRITICAL_SNOW_DEPTH_THRESHOLD, // 🆕
    CRITICAL_SNOW_DEPTH_SCORE, // 🆕
    SAFE_WIND_DIRECTION_MULTIPLIER,
    DRIFTING_SNOW_TEMP_THRESHOLD, // 🆕
    DRIFTING_SNOW_WIND_THRESHOLD, // 🆕
    DRIFTING_SNOW_BASE_SCORE,     // 🆕
    DRIFTING_SNOW_WIND_COEFFICIENT, // 🆕
} from './constants';

import vulnerabilitiesData from '../../data/hokkaido-vulnerabilities.json';

// 路線別の運休しやすさ係数（JSONから読込）
export const ROUTE_VULNERABILITY: Record<string, VulnerabilityData> = vulnerabilitiesData as Record<string, VulnerabilityData>;

export const DEFAULT_VULNERABILITY: VulnerabilityData = {
    windThreshold: 15,
    snowThreshold: 5,
    vulnerabilityScore: 1.0,
    description: '',
    hasDeerRisk: false,
};

// 風向が安全範囲内かチェック
function isSafeWindDirection(direction: number | undefined, safeRanges: number[][] | undefined): boolean {
    if (direction === undefined || !safeRanges) return false;
    return safeRanges.some(([min, max]) => direction >= min && direction <= max);
}

export const RISK_FACTORS: RiskFactor[] = [
    // 暴風警報
    {
        condition: (input) => input.weather?.warnings.some(w => w.type === '暴風警報') ?? false,
        weight: () => STORM_WARNING_SCORE,
        overrideWeight: (input) => {
            // 過去事例に暴風系がマッチしている場合、100%運休(100点)に引き上げる
            if (input.historicalMatch?.id === 'explosive-cyclogenesis' || input.historicalMatch?.id === 'heavy-wind-low-pressure') {
                return 100;
            }
            return null;
        },
        reason: () => '暴風警報が発令されています',
        priority: 1,
    },
    // 大雪警報
    {
        condition: (input) => input.weather?.warnings.some(w => w.type === '大雪警報') ?? false,
        weight: () => HEAVY_SNOW_WARNING_SCORE,
        overrideWeight: (input) => {
            // 過去事例に大雪系がマッチしている場合、100%運休に引き上げる
            if (input.historicalMatch?.id === 'disaster-snow-sapporo' || input.historicalMatch?.id === 'record-intense-snow') {
                return 100;
            }
            return null;
        },
        reason: () => '大雪警報が発令されています',
        priority: 2,
    },
    // 大雨警報
    {
        condition: (input) => input.weather?.warnings.some(w => w.type === '大雨警報') ?? false,
        weight: () => HEAVY_RAIN_WARNING_SCORE,
        reason: () => '大雨警報が発令されています',
        priority: 3,
    },
    // 現在JR運行情報で遅延・運休（最優先）
    {
        condition: (input) => input.jrStatus != null && input.jrStatus.status !== 'normal',
        weight: (input) => {
            const base = getJRStatusWeight(input.jrStatus!.status);
            const recency = getRecencyWeight(input.jrStatus?.updatedAt);
            return Math.round(base * recency);
        },
        reason: (input) => `【公式】${input.jrStatus?.statusText || 'JR北海道運行情報で遅れ・運休'}`,
        priority: 0,
    },
    // 路線別風速閾値超過
    {
        condition: (input, vuln) => (input.weather?.windSpeed ?? 0) >= vuln.windThreshold,
        weight: (input, vuln) => {
            const ws = input.weather?.windSpeed ?? 0;
            const excess = ws - vuln.windThreshold;
            const score = STRONG_WIND_BASE_SCORE + Math.min(excess * STRONG_WIND_EXCESS_COEFFICIENT, STRONG_WIND_MAX_BONUS);

            // 安全な風向ならスコア大幅減
            if (isSafeWindDirection(input.weather?.windDirection, vuln.safeWindDirections)) {
                return Math.round(score * SAFE_WIND_DIRECTION_MULTIPLIER);
            }
            return score;
        },
        reason: (input) => `風速${input.weather?.windSpeed}m/sの予報（運転規制基準）`,
        priority: 4,
    },
    // やや強い風（遅延リスク）
    {
        condition: (input, vuln) => {
            const ws = input.weather?.windSpeed ?? 0;
            // 閾値の70%〜100%の範囲を「やや強い風」として捕捉
            return ws >= MODERATE_WIND_MIN && ws < vuln.windThreshold;
        },
        weight: (input, vuln) => {
            const ws = input.weather?.windSpeed ?? 0;
            // スコア計算: 基本18点 + 超過分 * 2.0
            // 例: 閾値20m/sの路線で、風速18m/sの場合
            // 18 + (18 - 13) * 2.0 = 28点 -> 脆弱性1.0なら28点（遅延閾値20%を超える）
            const score = MODERATE_WIND_BASE_SCORE + Math.round((ws - MODERATE_WIND_MIN) * MODERATE_WIND_COEFFICIENT);

            // 安全な風向ならスコア大幅減
            if (isSafeWindDirection(input.weather?.windDirection, vuln.safeWindDirections)) {
                return Math.round(score * SAFE_WIND_DIRECTION_MULTIPLIER);
            }
            return score;
        },
        reason: (input) => `風速${input.weather?.windSpeed}m/sの予報（徐行運転による遅延の可能性）`,
        priority: 6, // 優先度上げ (7 -> 6)
    },
    // 軽い風
    {
        condition: (input) => {
            const ws = input.weather?.windSpeed ?? 0;
            return ws >= LIGHT_WIND_MIN && ws < LIGHT_WIND_MAX;
        },
        weight: () => LIGHT_WIND_SCORE,
        reason: (input) => `風速${input.weather?.windSpeed}m/s（軽微な影響の可能性）`,
        priority: 10,
    },
    // 積雪（路線別閾値）
    {
        condition: (input, vuln) => (input.weather?.snowfall ?? 0) >= vuln.snowThreshold,
        weight: (input, vuln) => {
            const snow = input.weather?.snowfall ?? 0;
            const excess = snow - vuln.snowThreshold;
            return HEAVY_SNOW_BASE_SCORE + Math.min(excess * HEAVY_SNOW_EXCESS_COEFFICIENT, HEAVY_SNOW_MAX_BONUS);
        },
        overrideWeight: (input) => {
            // 過去事例マッチがあれば強引にスコアを上げる
            if (input.historicalMatch?.id === 'record-intense-snow') return 100;
            if (input.historicalMatch?.id === 'disaster-snow-sapporo') return 90;
            return null;
        },
        reason: (input) => `積雪${input.weather?.snowfall}cmの予報（除雪作業により遅延見込み）`,
        priority: 5,
    },
    // 中程度の積雪（遅延リスク）
    {
        condition: (input, vuln) => {
            const snow = input.weather?.snowfall ?? 0;
            return snow >= MODERATE_SNOW_MIN && snow < vuln.snowThreshold;
        },
        weight: (input) => {
            const snow = input.weather?.snowfall ?? 0;
            // スコア計算: 基本30点 + 超過分 * 15
            // 例: 閾値5cmの路線で、積雪3cmの場合
            // 30 + (3 - 2) * 15 = 45点 -> 脆弱性1.0なら45点（遅延濃厚）
            return MODERATE_SNOW_BASE_SCORE + Math.round((snow - MODERATE_SNOW_MIN) * MODERATE_SNOW_COEFFICIENT);
        },
        reason: (input) => `積雪${input.weather?.snowfall}cmの予報（除雪作業による遅延の可能性）`,
        priority: 7, // 優先度上げ (8 -> 7)
    },
    // 軽い積雪
    {
        condition: (input) => {
            const snow = input.weather?.snowfall ?? 0;
            return snow >= LIGHT_SNOW_MIN && snow < LIGHT_SNOW_MAX;
        },
        weight: () => LIGHT_SNOW_SCORE,
        reason: (input) => `積雪${input.weather?.snowfall}cm（軽微な影響の可能性）`,
        priority: 10,
    },
    // 🆕 湿り雪（着雪・架線凍結リスク）
    // 条件: 降雪があり、かつ気温が -1.0℃ 〜 +1.5℃ の範囲
    // 理由: 水分を含んだ重い雪は架線やパンタグラフに付着しやすく、ポイント不転換も起きやすい
    {
        condition: (input) => {
            const snow = input.weather?.snowfall ?? 0;
            const temp = input.weather?.temperature ?? -99;
            return snow > 0 && temp >= -1.0 && temp <= 1.5;
        },
        weight: () => 20, // 比較的高めのリスク（遅延要因）
        reason: (input) => `気温${input.weather?.temperature}℃での降雪（湿った雪による着雪・ポイント不具合リスク）`,
        priority: 4,
    },
    // 🆕 積雪急増（スタックリスク）
    {
        condition: (input) => (input.weather?.snowDepthChange ?? 0) >= 3,
        weight: (input) => {
            const change = input.weather?.snowDepthChange ?? 0;
            // 3cm/h以上の増加は非常に危険 (湿った雪がへばりつく、あるいは吹き溜まり)
            // 1cm増加ごとに+5点
            return 15 + (change - 3) * 5;
        },
        reason: (input) => `積雪が急増中（${input.weather?.snowDepthChange}cm/h）: 車両スタックのリスク増大`,
        priority: 4, // 比較的優先度高め
    },
    // 🆕 地吹雪（Drifting Snow）
    // 条件: 氷点下(-2℃未満) + 風がある程度強い(10m/s以上) + 積雪がある
    // 降雪がなくても、積もった雪が舞い上がって視界不良になる現象
    {
        condition: (input) => {
            const temp = input.weather?.temperature ?? 0;
            const wind = input.weather?.windSpeed ?? 0;
            const depth = input.weather?.snowDepth ?? 0;

            // 雪が積もっていないと地吹雪は起きない
            if (depth < 5) return false;

            return temp <= DRIFTING_SNOW_TEMP_THRESHOLD && wind >= DRIFTING_SNOW_WIND_THRESHOLD;
        },
        weight: (input) => {
            const wind = input.weather?.windSpeed ?? 0;
            // 基本スコア + 風速超過分
            return DRIFTING_SNOW_BASE_SCORE + Math.max(0, (wind - DRIFTING_SNOW_WIND_THRESHOLD) * DRIFTING_SNOW_WIND_COEFFICIENT);
        },
        reason: (input) => `低温(-2℃未満)かつ強風(${input.weather?.windSpeed}m/s): 地吹雪による視界不良リスク`,
        priority: 5,
    },
    // 🆕 累積降雪（除雪作業・計画運休リスク）
    {
        // 積雪深がある程度あり、かつ「降り続いている」または「風がある（吹き溜まり）」場合のみリスクとする
        // 単に積雪が深いだけ（晴れ・無風）なら、除雪済みであれば運行可能
        condition: (input, _vuln) => {
            const depth = input.weather?.snowDepth ?? 0;
            const snowfall = input.weather?.snowfall ?? 0;

            // 🆕 修正(v4): 風だけで「積雪深リスク」を発動させない。
            // 降雪 >= 1cm (0.25 -> 1.0へ引き上げ) のみ条件とする。
            // 地吹雪リスクは風速そのもの（または暴風警報）で評価する。
            const activeDisruption = (snowfall >= 1.0);

            return depth >= MODERATE_SNOW_DEPTH_THRESHOLD && activeDisruption;
        },
        weight: (input) => {
            const depth = input.weather?.snowDepth ?? 0;
            // 40cm超: 運休リスク大 (Jan 28: 47cm -> 40点)
            if (depth >= CRITICAL_SNOW_DEPTH_THRESHOLD) return CRITICAL_SNOW_DEPTH_SCORE; // 40

            // 15cm超: 遅延リスク (Jan 20: 32cm -> 15点)
            return MODERATE_SNOW_DEPTH_SCORE; // 15
        },
        reason: (input) => `短期間の記録的積雪（${input.weather?.snowDepth}cm）: 排雪作業による運休・遅延の可能性`,
        priority: 3,
    },
    // 🆕 週末夜間の計画除雪（1月-2月）
    {
        condition: (input) => {
            const date = new Date(input.targetDate);
            const month = date.getMonth() + 1;
            const dayOfWeek = date.getDay(); // 6 = Saturday
            const depth = input.weather?.snowDepth ?? 0;

            // 時間帯チェック: 20時以降のみ対象 (18時は早すぎる)
            if (!input.targetTime) return false;
            const hour = parseInt(input.targetTime.slice(0, 2));

            // 1月・2月の土曜日、かつ積雪が少しでもある場合 (5cm以上)、かつ20時以降
            return (month === 1 || month === 2) && dayOfWeek === 6 && depth >= 5 && hour >= 20;
        },
        weight: () => 20, // 遅延〜運休リスク底上げ
        reason: () => '冬季土曜夜間の計画除雪（20時以降、運休・間引き運転の可能性）',
        priority: 5,
    },
    // 大雨
    {
        condition: (input) => (input.weather?.precipitation ?? 0) >= HEAVY_RAIN_THRESHOLD,
        weight: (input) => {
            const rain = input.weather?.precipitation ?? 0;
            return HEAVY_RAIN_BASE_SCORE + Math.min(Math.round((rain - HEAVY_RAIN_THRESHOLD) * HEAVY_RAIN_EXCESS_COEFFICIENT), HEAVY_RAIN_MAX_BONUS);
        },
        reason: (input) => `降水量${input.weather?.precipitation}mmの予報`,
        priority: 6,
    },
    // 中程度の雨
    {
        condition: (input) => {
            const rain = input.weather?.precipitation ?? 0;
            return rain >= MODERATE_RAIN_MIN && rain < MODERATE_RAIN_MAX;
        },
        weight: (input) => {
            const rain = input.weather?.precipitation ?? 0;
            return MODERATE_RAIN_BASE_SCORE + Math.round(rain * MODERATE_RAIN_COEFFICIENT);
        },
        reason: (input) => `降水量${input.weather?.precipitation}mm（視界不良の可能性）`,
        priority: 9,
    },
    // ユーザー報告（クラウドソーシング）
    {
        condition: (input) => {
            const cs = input.crowdsourcedStatus;
            return cs != null && cs.reportCount >= MIN_USER_REPORT_COUNT && cs.consensusStatus !== 'normal';
        },
        weight: (input) => {
            const cs = input.crowdsourcedStatus!;
            const baseWeight = cs.consensusStatus === 'stopped' ? USER_REPORT_STOPPED_SCORE :
                cs.consensusStatus === 'delayed' ? USER_REPORT_DELAYED_SCORE : USER_REPORT_CROWDED_SCORE;
            // 報告数が多いほど信頼性アップ
            const countBonus = Math.min(cs.reportCount * USER_REPORT_COUNT_BONUS_COEFFICIENT, USER_REPORT_MAX_BONUS);
            return baseWeight + countBonus;
        },
        reason: (input) => {
            const cs = input.crowdsourcedStatus!;
            return `ユーザー${cs.reportCount}件の報告: ${cs.consensusStatus === 'stopped' ? '運休・見合わせ' : '遅延あり'}`;
        },
        priority: 10,
    },
    // 雷注意報
    {
        condition: (input) => input.weather?.warnings.some(w => w.type === '雷注意報') ?? false,
        weight: () => THUNDER_ADVISORY_SCORE,
        reason: () => '雷注意報が発令されています',
        priority: 11,
    },
    // 瞬間風速が非常に強い
    {
        condition: (input) => (input.weather?.windGust ?? 0) >= WIND_GUST_DANGER_THRESHOLD,
        weight: (input, vuln) => {
            const gust = input.weather?.windGust ?? 0;
            const mean = input.weather?.windSpeed ?? 0;
            let score = 0;

            // 異常値対策: 平均風速に対して突風があまりに大きすぎる場合（3倍以上かつ平均15m/s未満）
            if (mean < 15 && gust > mean * 3) {
                const effectiveGust = Math.min(gust, mean * 3);
                score = WIND_GUST_BASE_SCORE + Math.min(Math.max(0, effectiveGust - WIND_GUST_DANGER_THRESHOLD), WIND_GUST_MAX_BONUS) * 0.5;
            } else {
                score = WIND_GUST_BASE_SCORE + Math.min(gust - WIND_GUST_DANGER_THRESHOLD, WIND_GUST_MAX_BONUS);
            }

            // 安全な風向ならスコア大幅減
            if (isSafeWindDirection(input.weather?.windDirection, vuln.safeWindDirections)) {
                return Math.round(score * SAFE_WIND_DIRECTION_MULTIPLIER);
            }
            return score;
        },
        reason: (input) => {
            const gust = input.weather?.windGust ?? 0;
            const mean = input.weather?.windSpeed ?? 0;
            if (mean < 15 && gust > mean * 3) {
                return `瞬間風速${gust}m/sの予報（突風による影響の可能性 ※予測値不安定）`;
            }
            return `瞬間風速${gust}m/sの予報（突風による一時運転見合わせの可能性）`;
        },
        priority: 6,
    },
    // エゾシカ衝突リスク
    {
        condition: (input, vuln) => {
            // リスク路線かつ、秋〜冬(10月-3月)の夕方・夜間(16時-6時)
            if (!vuln.hasDeerRisk) return false;

            const date = new Date(input.targetDate);
            const month = date.getMonth() + 1; // 1-12
            const isDeerSeason = (month >= 10 || month <= 3);

            if (!isDeerSeason) return false;

            // 時間帯チェック
            if (!input.targetTime) return true; // 時間指定なしならリスクありとする
            const hour = parseInt(input.targetTime.slice(0, 2));
            const isNight = (hour >= 16 || hour <= 6);

            return isNight;
        },
        weight: () => 10, // 10%加算（確率は低いが影響は大きい）
        reason: () => 'エゾシカ多発時期・時間帯（衝突リスクあり）',
        priority: 8,
    },
];

// 時間帯別補正係数
const TIME_MULTIPLIERS: Record<string, number> = {
    '06': 1.1,  // 始発
    '07': 1.25, // 朝ラッシュ
    '08': 1.25,
    '09': 1.15,
    '17': 1.2,  // 夕ラッシュ
    '18': 1.2,
    '19': 1.1,
};

// 時間帯補正を取得
export function getTimeMultiplier(time?: string): number {
    if (!time) {
        const hour = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit', hour12: false, timeZone: 'Asia/Tokyo'
        }).format(new Date()).padStart(2, '0');
        return TIME_MULTIPLIERS[hour] || 1.0;
    }
    const hour = time.slice(0, 2);
    return TIME_MULTIPLIERS[hour] || 1.0;
}

// 季節補正を取得（JST対応）
export function getSeasonMultiplier(): number {
    const month = parseInt(new Intl.DateTimeFormat('en-US', {
        month: 'numeric', timeZone: 'Asia/Tokyo'
    }).format(new Date()));
    // 厳冬期（1-2月）
    if (month === 1 || month === 2) return 1.1;
    // 冬季（12月、3月）
    if (month === 12 || month === 3) return 1.05;
    // それ以外
    return 1.0;
}
