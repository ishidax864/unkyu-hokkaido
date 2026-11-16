import { hourFeatures, probability, levelOf, explain } from './core';
import type { PointForecast, RiskAssessment, RiskLevel } from './types';
import type { WarningSnapshot } from '@/lib/jma-warnings';

export const RISK_LABELS: Record<RiskLevel, string> = {
    low: '気象リスクは低め', watch: '変化に注意', high: '移動計画の見直しを',
    severe: '強い気象リスク', unknown: '判断に必要な情報が不足',
};

const LEVEL_RANK: Record<RiskLevel, number> = { unknown: -1, low: 0, watch: 1, high: 2, severe: 3 };
/**
 * 当てはめたモデルとは別の、明示的な下限。学習データに強風による運休が2〜3件しかなく、
 * 予報の突風だけでは運休を見分けられなかった(AUC 0.58)ため重みは0になった。
 * それでも強風規制は実在するので、突風25m/s以上の予報では少なくとも「変化に注意」にする。
 */
export const GUST_WATCH_FLOOR = 25;

/**
 * 指定時刻の気象リスク。中核モデル (./core.ts) を各地点に当て、最も高い地点で判定する。
 * 地点ごとに一貫して評価し、別地点の最大値を寄せ集めない。
 * 地点や24時間分の時系列が欠けている場合、低めとは表示せず「不明」にする。
 */
export function assessWeather(points: PointForecast[], expectedPoints: number, date: string, time: string): RiskAssessment {
    const hour = `${time.slice(0, 2)}:00`;
    const candidates = points.flatMap(point => {
        const weather = point.hours.find(h => h.date === date && h.targetTime === hour);
        const features = weather ? hourFeatures(point.hours, date, hour) : null;
        return weather && features ? [{ weather, features, p: probability(features), location: point.point.name }] : [];
    });
    const coverage = { available: candidates.length, total: expectedPoints };
    // Missing a point may hide the worst conditions: never turn incomplete coverage into reassurance.
    if (candidates.length < expectedPoints || !candidates.length) return {
        level: 'unknown', score: null, reasons: ['対象時刻・地点の気象データが揃っていません。公式情報を確認してください。'],
        location: null, weather: null, coverage,
    };
    const worst = candidates.reduce((a, b) => a.p >= b.p ? a : b);
    let level: RiskLevel = levelOf(worst.p, date);
    let reasons = explain(worst.features);
    const gusty = candidates.reduce((a, b) => b.features.gust > a.features.gust ? b : a);
    if (gusty.features.gust >= GUST_WATCH_FLOOR && LEVEL_RANK[level] < LEVEL_RANK.watch) {
        level = 'watch';
        reasons = [`${gusty.location}で最大瞬間風速 ${gusty.features.gust.toFixed(1)} m/s の予報（強風規制の目安）`];
    }
    const winter = [12, 1, 2, 3].includes(Number(date.slice(5, 7)));
    if (winter && LEVEL_RANK[level] < LEVEL_RANK.high && candidates.some(c => !c.features.complete24)) return {
        level: 'unknown', score: null, location: worst.location, weather: worst.weather, coverage,
        reasons: ['直前24時間の降雪データが不足しています。積雪の影響を評価できません。'],
    };
    return { level, score: Math.round(worst.p * 100), reasons, location: worst.location, weather: worst.weather, coverage };
}

/** Current official alerts are a separate nowcast guard. Never leak them into
 * tomorrow's forecast, historical replay, or a past hour's evaluation. */
export function withCurrentWarnings(risk: RiskAssessment, snapshot: WarningSnapshot, target: number, now: Date): RiskAssessment {
    if (target < now.getTime() - 3_600_000 || target > now.getTime() + 3_600_000) return risk;
    const critical = snapshot.alerts.filter(a => a.severity !== 'advisory');
    if (critical.length) {
        const score = Math.max(risk.score ?? 0, critical.some(a => a.severity === 'emergency') ? 90 : 75);
        return { ...risk, score, level: 'severe', reasons: [...critical.map(a => `${a.area}：${a.name}（現在）`), ...risk.reasons] };
    }
    if (!snapshot.available && risk.level === 'low') return { ...risk, level: 'unknown', score: null,
        reasons: ['現在の気象庁の警報を確認できません。', ...risk.reasons] };
    const winterCautions = snapshot.alerts.filter(a => ['12', '13', '17', '22', '23', '25', '26', '15'].includes(a.code));
    if (winterCautions.length && risk.level === 'low') return { ...risk, score: Math.max(25, risk.score ?? 0), level: 'watch',
        reasons: [...winterCautions.map(a => `${a.area}：${a.name}（現在）`), ...risk.reasons] };
    return risk;
}
