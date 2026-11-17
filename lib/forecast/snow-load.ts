/**
 * 大雪・風雪の注意報・警報が出ているときの上乗せ。
 *
 * 根拠(札幌圏、報道から調べた運休日。scripts/eval/eval-snow-load-5winters.mjs):
 * - 前夜(前日12〜21時)に大雪・風雪の注意報か警報が出ていた日は、5冬で大きな運休が始まった14日のうち10日。
 *   運休のなかった日でも2〜4割で出ている → 「変化に注意」まで引き上げる。
 * - さらに前日の積雪が60cm以上だった日は、運休日の割合が高い(該当した84日のうち21日が運休日)が、
 *   嵐の当日を捉えたのは 2025-26年の冬で4/4、ほかの4冬では3/10。積雪の少ない時期の嵐は拾えない。
 *   → 「警戒」に引き上げるが、これが出ていないことは安全を意味しない。
 * 60cm という区切りは 2025-26年の冬だけで決めたもので、ほかの冬では見逃しが多かった。この冬のデータで見直す。
 */
import type { WarningSnapshot } from '@/lib/jma-warnings';
import type { ObservedSnow } from './observed-snow';
import type { RiskLevel } from './types';

export const SNOW_LOAD_DEPTH_CM = 60;
/** 大雪注意報・風雪注意報・大雪警報・暴風雪警報(特別警報を含む) */
const SNOW_ALERT_CODES = new Set(['12', '13', '06', '02', '36', '32']);

export interface SnowLoad { /** 積雪が区切り以上か(true なら「警戒」、false なら「注意」まで) */ deep: boolean; depthCm: number | null; station: string | null; alerts: string[] }

export function snowLoad(warnings: WarningSnapshot | null | undefined, snow: ObservedSnow | null | undefined, pointNames?: string[]): SnowLoad | null {
    if (!warnings?.available || !snow) return null;
    const alerts = [...new Set(warnings.alerts.filter(a => SNOW_ALERT_CODES.has(a.code)).map(a => a.name))];
    if (!alerts.length) return null;
    const deepest = snow.points.filter(p => typeof p.snowDepthCm === 'number' && (!pointNames || pointNames.includes(p.point)))
        .sort((a, b) => b.snowDepthCm! - a.snowDepthCm!)[0];
    const deep = !!deepest && deepest.snowDepthCm! >= SNOW_LOAD_DEPTH_CM;
    return { deep, depthCm: deepest?.snowDepthCm ?? null, station: deepest?.station ?? null, alerts };
}

const RANK: Record<RiskLevel, number> = { unknown: -1, low: 0, watch: 1, high: 2, severe: 3 };

/** 注意報・警報だけなら少なくとも「注意(watch)」、積雪も多ければ少なくとも「警戒(high)」に引き上げ、理由を先頭に足す */
export function withSnowLoad<T extends { level: RiskLevel; reasons: string[] }>(risk: T, load: SnowLoad | null): T {
    if (!load) return risk;
    const floor: RiskLevel = load.deep ? 'high' : 'watch';
    const reason = load.deep
        ? `${load.alerts.join('・')}が出ていて、${load.station}の積雪は${load.depthCm}cm。この条件の日は運休が多くなっています`
        : `${load.alerts.join('・')}が出ています。過去の大きな運休の多くは、前夜にこの注意報・警報が出ていました`;
    return { ...risk, level: RANK[risk.level] >= RANK[floor] ? risk.level : floor, reasons: [reason, ...risk.reasons.filter(r => !r.includes('兆候はありません'))] };
}
