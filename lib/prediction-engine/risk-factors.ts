import { PredictionInput, RiskFactor, VulnerabilityData } from '../types';
import { getStatusWeight, JROperationStatus } from '../jr-status';
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
} from './constants';

// 路線別の運休しやすさ係数（北海道の路線特性を反映）
export const ROUTE_VULNERABILITY: Record<string, VulnerabilityData> = {
    'jr-hokkaido.hakodate-main': {
        windThreshold: 15, // 平均風速
        snowThreshold: 5,  // 時間降雪量(cm/h)
        vulnerabilityScore: 1.0,
        description: '主要幹線、比較的安定',
        hasDeerRisk: false,
    },
    'jr-hokkaido.chitose': {
        windThreshold: 15,
        snowThreshold: 4,
        vulnerabilityScore: 0.8,
        description: '空港連絡線、優先的に運行維持',
        hasDeerRisk: false,
    },
    'jr-hokkaido.gakuentoshi': {
        windThreshold: 12,
        snowThreshold: 4,
        vulnerabilityScore: 1.1,
        description: '一部単線区間あり',
        hasDeerRisk: true,
    },
    'jr-hokkaido.muroran': {
        windThreshold: 12,
        snowThreshold: 4,
        vulnerabilityScore: 1.3,
        description: '海沿い区間で強風の影響受けやすい',
        hasDeerRisk: true,
    },
    'jr-hokkaido.sekihoku': {
        windThreshold: 10,
        snowThreshold: 3,
        vulnerabilityScore: 1.6,
        description: '山間部多く積雪・強風に弱い',
        hasDeerRisk: true,
    },
    'jr-hokkaido.soya': {
        windThreshold: 10,
        snowThreshold: 3,
        vulnerabilityScore: 1.8,
        description: '最北端路線、厳寒期は運休多い',
        hasDeerRisk: true,
    },
    'jr-hokkaido.nemuro': {
        windThreshold: 12,
        snowThreshold: 3,
        vulnerabilityScore: 1.5,
        description: '長距離路線、部分運休が発生しやすい',
        hasDeerRisk: true,
    },
    'jr-hokkaido.senmo': {
        windThreshold: 10,
        snowThreshold: 3,
        vulnerabilityScore: 1.6,
        description: '観光路線、冬季は運休しやすい',
        hasDeerRisk: true,
    },
    'jr-hokkaido.hidaka': {
        windThreshold: 12,
        snowThreshold: 3,
        vulnerabilityScore: 1.4,
        description: '海沿い区間あり',
        hasDeerRisk: true,
    },
    'jr-hokkaido.rumoi': { // 🆕
        windThreshold: 10,
        snowThreshold: 3,
        vulnerabilityScore: 1.6,
        description: '海岸線に近い・強風・積雪',
        hasDeerRisk: true,
    },
    'jr-hokkaido.sekisho': { // 🆕
        windThreshold: 12,
        snowThreshold: 4,
        vulnerabilityScore: 1.5,
        description: '山間部・峠越え区間（強風・積雪）',
        hasDeerRisk: true,
    },
    'jr-hokkaido.furano': {
        windThreshold: 12,
        snowThreshold: 3,
        vulnerabilityScore: 1.3,
        description: '内陸部、積雪の影響',
        hasDeerRisk: true,
    },
};

export const DEFAULT_VULNERABILITY: VulnerabilityData = {
    windThreshold: 15,
    snowThreshold: 5,
    vulnerabilityScore: 1.0,
    description: '',
    hasDeerRisk: false,
};

export const RISK_FACTORS: RiskFactor[] = [
    // 暴風警報
    {
        condition: (input) => input.weather?.warnings.some(w => w.type === '暴風警報') ?? false,
        weight: () => STORM_WARNING_SCORE,
        reason: () => '暴風警報が発令されています',
        priority: 1,
    },
    // 大雪警報
    {
        condition: (input) => input.weather?.warnings.some(w => w.type === '大雪警報') ?? false,
        weight: () => HEAVY_SNOW_WARNING_SCORE,
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
            const base = getStatusWeight({ status: input.jrStatus!.status } as JROperationStatus);
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
            return STRONG_WIND_BASE_SCORE + Math.min(excess * STRONG_WIND_EXCESS_COEFFICIENT, STRONG_WIND_MAX_BONUS);
        },
        reason: (input) => `風速${input.weather?.windSpeed}m/sの予報（運転規制基準）`,
        priority: 4,
    },
    // やや強い風
    {
        condition: (input, vuln) => {
            const ws = input.weather?.windSpeed ?? 0;
            return ws >= MODERATE_WIND_MIN && ws < vuln.windThreshold;
        },
        weight: (input) => {
            const ws = input.weather?.windSpeed ?? 0;
            return MODERATE_WIND_BASE_SCORE + Math.round((ws - MODERATE_WIND_MIN) * MODERATE_WIND_COEFFICIENT);
        },
        reason: (input) => `風速${input.weather?.windSpeed}m/sの予報（徐行運転の可能性）`,
        priority: 7,
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
        reason: (input) => `積雪${input.weather?.snowfall}cmの予報（除雪作業により遅延見込み）`,
        priority: 5,
    },
    // 中程度の積雪
    {
        condition: (input, vuln) => {
            const snow = input.weather?.snowfall ?? 0;
            return snow >= MODERATE_SNOW_MIN && snow < vuln.snowThreshold;
        },
        weight: (input) => {
            const snow = input.weather?.snowfall ?? 0;
            return MODERATE_SNOW_BASE_SCORE + Math.round(snow * MODERATE_SNOW_COEFFICIENT);
        },
        reason: (input) => `積雪${input.weather?.snowfall}cmの予報（遅延の可能性）`,
        priority: 8,
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
        weight: (input) => {
            const gust = input.weather?.windGust ?? 0;
            const mean = input.weather?.windSpeed ?? 0;

            // 異常値対策: 平均風速に対して突風があまりに大きすぎる場合（3倍以上かつ平均15m/s未満）
            if (mean < 15 && gust > mean * 3) {
                const effectiveGust = Math.min(gust, mean * 3);
                return WIND_GUST_BASE_SCORE + Math.min(Math.max(0, effectiveGust - WIND_GUST_DANGER_THRESHOLD), WIND_GUST_MAX_BONUS) * 0.5;
            }

            return WIND_GUST_BASE_SCORE + Math.min(gust - WIND_GUST_DANGER_THRESHOLD, WIND_GUST_MAX_BONUS);
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
        priority: 12,
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
        const now = new Date();
        const hour = now.getHours().toString().padStart(2, '0');
        return TIME_MULTIPLIERS[hour] || 1.0;
    }
    const hour = time.slice(0, 2);
    return TIME_MULTIPLIERS[hour] || 1.0;
}

// 季節補正を取得
export function getSeasonMultiplier(): number {
    const month = new Date().getMonth() + 1;
    // 厳冬期（1-2月）
    if (month === 1 || month === 2) return 1.2;
    // 冬季（12月、3月）
    if (month === 12 || month === 3) return 1.1;
    // それ以外
    return 1.0;
}
