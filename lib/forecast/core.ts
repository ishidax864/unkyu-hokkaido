/**
 * 運休リスクの中核 (risk-core)。
 *
 * 予報の時系列から「その時刻までの24時間降雪量」「6時間降雪量」「最大瞬間風速」「雨量」などの特徴を作り、
 * 実績(路線×日の気象起因運休)で当てはめたロジスティックモデルで「その路線で気象による運休が出る見込み」を出す。
 * 係数は scripts/eval/fit-core.ts が、嵐ごとに分けた交差検証つきで core-coefficients.json に書き出す。
 *
 * - 単調性: すべての重みは0以上。雪・風・雨が増えてリスクが下がることはない。
 * - 欠損: 24時間分の時系列が揃わない場合は complete24=false。呼び出し側で「不明」に倒す。
 * - これは確率の推定値だが、陽性43件(独立した嵐は十数回)からの推定で幅が大きい。画面ではレベルで示す。
 */
import type { WeatherForecast } from '@/lib/types';
import coefficients from './core-coefficients.json';

export const CORE_VERSION = 'risk-core-1.1' as const;

export interface HourFeatures {
    snow1: number;   // その時刻の降雪 cm/h
    snow6: number;   // 直前6時間の降雪合計 cm
    snow24: number;  // 直前24時間の降雪合計 cm
    gust: number;    // 最大瞬間風速 m/s
    wind: number;    // 平均風速 m/s
    rain1: number;   // その時刻の雨 mm/h (降水量から雪の水量を除いたもの)
    rain24: number;  // 直前24時間の雨 mm
    precip1: number; // その時刻の降水量 mm/h (雪の水量を含む)
    complete24: boolean;
}

export const FEATURE_NAMES = ['precip1', 'snow1', 'snow6', 'snow24', 'gustExcess', 'blowingSnow', 'rain1', 'rain24'] as const;
export type FeatureName = typeof FEATURE_NAMES[number];

/** 降雪 cm を水量 mm に換算する係数 (Open-Meteo の降雪は降水量 mm × 0.7 cm)。 */
const SNOW_CM_PER_MM = 0.7;
const key = (h: WeatherForecast) => `${h.date}T${h.targetTime}`;
const indexCache = new WeakMap<WeatherForecast[], Map<string, WeatherForecast>>();

function indexOf(hours: WeatherForecast[]) {
    let map = indexCache.get(hours);
    if (!map) {
        map = new Map();
        for (const h of hours) {
            // 同じ時刻が重複していたら信用できないので欠損扱いにする
            if (map.has(key(h))) map.set(key(h), null as unknown as WeatherForecast);
            else map.set(key(h), h);
        }
        indexCache.set(hours, map);
    }
    return map;
}

function shiftHour(date: string, time: string, back: number): string {
    const t = Date.parse(`${date}T${time}:00+09:00`) - back * 3_600_000;
    const jst = new Date(t + 9 * 3_600_000).toISOString();
    return `${jst.slice(0, 10)}T${jst.slice(11, 16)}`;
}

const rainOf = (h: WeatherForecast) => Math.max(0, h.precipitation - (h.snowfall ?? 0) / SNOW_CM_PER_MM);

/** 指定時刻 (HH:00) の特徴。対象時刻自体が無ければ null。 */
export function hourFeatures(hours: WeatherForecast[], date: string, time: string): HourFeatures | null {
    const map = indexOf(hours);
    const hour = `${time.slice(0, 2)}:00`;
    const now = map.get(`${date}T${hour}`);
    if (!now) return null;
    let snow6 = 0, snow24 = 0, rain24 = 0, seen = 0;
    for (let back = 0; back < 24; back++) {
        const h = map.get(shiftHour(date, hour, back));
        if (!h || typeof h.snowfall !== 'number' || !Number.isFinite(h.snowfall) || h.snowfall < 0) continue;
        seen++;
        snow24 += h.snowfall;
        if (back < 6) snow6 += h.snowfall;
        rain24 += rainOf(h);
    }
    return {
        snow1: now.snowfall ?? 0, snow6, snow24,
        gust: now.windGust ?? now.windSpeed, wind: now.windSpeed,
        rain1: rainOf(now), rain24, precip1: now.precipitation, complete24: seen === 24,
    };
}

/** モデルへの入力。変換はすべて単調増加。 */
export function featureVector(f: HourFeatures): Record<FeatureName, number> {
    return {
        precip1: Math.log1p(f.precip1),
        snow1: Math.log1p(f.snow1),
        snow24: Math.log1p(f.snow24),
        snow6: Math.log1p(f.snow6),
        gustExcess: Math.max(0, f.gust - 12),
        blowingSnow: f.snow6 >= 1 ? Math.max(0, f.wind - 8) : 0,
        rain24: Math.log1p(f.rain24),
        rain1: Math.log1p(f.rain1),
    };
}

export interface Thresholds { watch: number; high: number; severe: number }
export const isDeepWinter = (date: string) => [12, 1, 2].includes(Number(date.slice(5, 7)));

export interface CoreModel {
    bias: number;
    weights: Record<FeatureName, number>;
    thresholds: Thresholds;
    /** 12〜2月用の区切り。真冬は「降っても走る」日が多く、同じ区切りでは警告が出すぎるため */
    deepWinterThresholds?: Thresholds;
}

export const MODEL: CoreModel = {
    bias: coefficients.bias,
    weights: coefficients.weights as Record<FeatureName, number>,
    thresholds: coefficients.thresholds,
    deepWinterThresholds: (coefficients as { deepWinterThresholds?: Thresholds }).deepWinterThresholds,
};

export function logit(f: HourFeatures, model: CoreModel = MODEL): number {
    const x = featureVector(f);
    return FEATURE_NAMES.reduce((sum, name) => sum + model.weights[name] * x[name], model.bias);
}

export function probability(f: HourFeatures, model: CoreModel = MODEL): number {
    return 1 / (1 + Math.exp(-logit(f, model)));
}

export type CoreLevel = 'low' | 'watch' | 'high' | 'severe';
/** date (YYYY-MM-DD) を渡すと、12〜2月は真冬用の区切りを使う */
export function levelOf(p: number, date?: string, model: CoreModel = MODEL): CoreLevel {
    const t = date && isDeepWinter(date) && model.deepWinterThresholds ? model.deepWinterThresholds : model.thresholds;
    return p >= t.severe ? 'severe' : p >= t.high ? 'high' : p >= t.watch ? 'watch' : 'low';
}

/** 画面に出す根拠。寄与の大きい順に、予報値そのものを示す。 */
export function explain(f: HourFeatures, model: CoreModel = MODEL): string[] {
    const x = featureVector(f);
    const text: Record<FeatureName, string> = {
        precip1: `1時間に ${f.precip1.toFixed(1)} mm の降水（雪を含む）の予報`,
        snow1: `1時間に ${f.snow1.toFixed(1)} cm の降雪の予報`,
        snow24: `直前24時間の降雪 ${f.snow24.toFixed(1)} cm の予報`,
        snow6: `直前6時間の降雪 ${f.snow6.toFixed(1)} cm の予報`,
        gustExcess: `最大瞬間風速 ${f.gust.toFixed(1)} m/s の予報`,
        blowingSnow: `降雪中に平均風速 ${f.wind.toFixed(1)} m/s（吹雪の恐れ）`,
        rain24: `直前24時間の雨 ${f.rain24.toFixed(1)} mm の予報`,
        rain1: `1時間に ${f.rain1.toFixed(1)} mm の雨の予報`,
    };
    const ranked = FEATURE_NAMES.map(name => ({ name, c: model.weights[name] * x[name] }))
        .filter(r => r.c >= 0.25).sort((a, b) => b.c - a.c).map(r => text[r.name]);
    return ranked.length ? ranked.slice(0, 3) : ['取得した気象予報に強い雪・風・雨の兆候はありません'];
}
