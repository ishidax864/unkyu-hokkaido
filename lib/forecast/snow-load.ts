/**
 * 「雪が積もっているところに、大雪・風雪の注意報(または警報)」のときの上乗せ。
 *
 * 根拠: 真冬の札幌圏71日(2025-12-11〜2026-02-19)で、前日の積雪60cm以上 かつ 前夜に大雪・風雪注意報が出ていた日は、
 * 大きな運休が始まった4日すべてに該当し、運休記事のない59日では6日(10%)だった(scripts/eval/eval-winter-signals.mjs)。
 * 前日の気象予報だけでは同じ4日を見分けられなかった。1冬・4つの嵐だけの結果なので、この冬のデータで検証し直す。
 */
import type { WarningSnapshot } from '@/lib/jma-warnings';
import type { ObservedSnow } from './observed-snow';
import type { RiskLevel } from './types';

export const SNOW_LOAD_DEPTH_CM = 60;
/** 大雪注意報・風雪注意報・大雪警報・暴風雪警報(特別警報を含む) */
const SNOW_ALERT_CODES = new Set(['12', '13', '06', '02', '36', '32']);

export interface SnowLoad { depthCm: number; station: string; alerts: string[] }

export function snowLoad(warnings: WarningSnapshot | null | undefined, snow: ObservedSnow | null | undefined, pointNames?: string[]): SnowLoad | null {
    if (!warnings?.available || !snow) return null;
    const alerts = [...new Set(warnings.alerts.filter(a => SNOW_ALERT_CODES.has(a.code)).map(a => a.name))];
    if (!alerts.length) return null;
    const deepest = snow.points.filter(p => typeof p.snowDepthCm === 'number' && (!pointNames || pointNames.includes(p.point)))
        .sort((a, b) => b.snowDepthCm! - a.snowDepthCm!)[0];
    if (!deepest || deepest.snowDepthCm! < SNOW_LOAD_DEPTH_CM) return null;
    return { depthCm: deepest.snowDepthCm!, station: deepest.station, alerts };
}

const RANK: Record<RiskLevel, number> = { unknown: -1, low: 0, watch: 1, high: 2, severe: 3 };

/** 少なくとも「警戒(high)」に引き上げ、理由を先頭に足す */
export function withSnowLoad<T extends { level: RiskLevel; reasons: string[] }>(risk: T, load: SnowLoad | null): T {
    if (!load) return risk;
    const reason = `${load.alerts.join('・')}が出ていて、${load.station}の積雪は${load.depthCm}cm。この条件の日は運休が多くなっています`;
    return { ...risk, level: RANK[risk.level] >= RANK.high ? risk.level : 'high', reasons: [reason, ...risk.reasons.filter(r => !r.includes('兆候はありません'))] };
}
