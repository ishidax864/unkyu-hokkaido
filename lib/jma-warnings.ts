import { logger } from './logger';
import type { WeatherWarning } from './types';
import mapping from '@/data/jma-area-mapping.json';

export interface OfficialWeatherAlert {
    code: string; name: string; area: string; areaCode: string; issuedAt: string;
    severity: 'advisory' | 'warning' | 'emergency';
}
export interface WarningSnapshot {
    available: boolean; checkedAt: string; alerts: OfficialWeatherAlert[]; url: string;
}
// Code table in JMA's own https://www.jma.go.jp/bosai/warning/, checked 2026-10-13.
// The old /data/warning/ endpoint stopped updating in May 2026.
const codes: Record<string, [string, OfficialWeatherAlert['severity']]> = {
    '02': ['暴風雪警報', 'warning'], '05': ['暴風警報', 'warning'], '06': ['大雪警報', 'warning'],
    '07': ['波浪警報', 'warning'], '12': ['大雪注意報', 'advisory'], '13': ['風雪注意報', 'advisory'],
    '14': ['雷注意報', 'advisory'], '15': ['強風注意報', 'advisory'], '16': ['波浪注意報', 'advisory'],
    '17': ['融雪注意報', 'advisory'], '20': ['濃霧注意報', 'advisory'], '21': ['乾燥注意報', 'advisory'],
    '22': ['なだれ注意報', 'advisory'], '23': ['低温注意報', 'advisory'], '24': ['霜注意報', 'advisory'],
    '25': ['着氷注意報', 'advisory'], '26': ['着雪注意報', 'advisory'],
    '32': ['暴風雪特別警報', 'emergency'], '35': ['暴風特別警報', 'emergency'],
    '36': ['大雪特別警報', 'emergency'], '37': ['波浪特別警報', 'emergency'],
    '03': ['レベル3大雨警報', 'warning'], '43': ['レベル4大雨危険警報', 'emergency'],
    '33': ['レベル5大雨特別警報', 'emergency'], '10': ['レベル2大雨注意報', 'advisory'],
    '09': ['レベル3土砂災害警報', 'warning'], '49': ['レベル4土砂災害危険警報', 'emergency'],
    '39': ['レベル5土砂災害特別警報', 'emergency'], '29': ['レベル2土砂災害注意報', 'advisory'],
    '08': ['レベル3高潮警報', 'warning'], '48': ['レベル4高潮危険警報', 'emergency'],
    '38': ['レベル5高潮特別警報', 'emergency'], '19': ['レベル2高潮注意報', 'advisory'],
};
const localAreas: Record<string, string> = {
    '011010': '宗谷北部', '011020': '宗谷南部', '011030': '利尻・礼文',
    '012010': '上川地方', '012020': '留萌地方', '013010': '網走地方', '013020': '北見地方', '013030': '紋別地方',
    '014010': '根室地方', '014020': '釧路地方', '014030': '十勝地方',
    '015010': '胆振地方', '015020': '日高地方', '016010': '石狩地方', '016020': '空知地方', '016030': '後志地方',
    '017010': '渡島地方', '017020': '檜山地方',
};
/** r8 contains separate hazard documents, not one chronological event list.
 * Old releases can remain valid; ancient active alerts cannot. No name fields
 * exist in the feed. Unknown schemas/codes must not become 'no warnings'. */
export function parseJMAWarnings(payload: unknown, now = new Date()): OfficialWeatherAlert[] | null {
    if (!Array.isArray(payload) || !payload.length) return null;
    const alerts = new Map<string, OfficialWeatherAlert>();
    for (const doc of payload) {
        const at = Date.parse(doc?.reportDatetime);
        if (!Number.isFinite(at) || at > now.getTime() + 60_000 || !Array.isArray(doc?.warning?.class10Items) || !doc.warning.class10Items.length) return null;
        for (const area of doc.warning.class10Items) {
            if (!localAreas[area.areaCode] || !Array.isArray(area.kinds) || !area.kinds.length) return null;
            for (const kind of area.kinds) {
                if (kind.status === '解除' || kind.status === '発表警報・注意報はなし') continue;
                if (!['発表', '継続'].includes(kind.status) || !codes[kind.code]) return null;
                if (now.getTime() - at > 48 * 3_600_000) return null;
                const [name, severity] = codes[kind.code];
                alerts.set(`${area.areaCode}:${kind.code}`, { code: kind.code, name, severity, areaCode: area.areaCode,
                    area: localAreas[area.areaCode], issuedAt: new Date(at).toISOString() });
            }
        }
    }
    return [...alerts.values()];
}
const cache = new Map<string, { expires: number; value: Promise<OfficialWeatherAlert[] | null> }>();
async function fetchOffice(code: string): Promise<OfficialWeatherAlert[] | null> {
    const hit = cache.get(code);
    if (hit && hit.expires > Date.now()) return hit.value;
    const value = (async () => {
        try {
            const response = await fetch(`https://www.jma.go.jp/bosai/warning/data/r8/${code}.json`,
                { signal: AbortSignal.timeout(5000), cache: 'no-store' });
            return response.ok ? parseJMAWarnings(await response.json()) : null;
        } catch (error) { logger.warn('[JMA] Warning feed unavailable', { code, error: String(error) }); return null; }
    })();
    cache.set(code, { expires: Date.now() + 300_000, value });
    const result = await value;
    if (result === null) cache.delete(code);
    return result;
}
export async function getJourneyWarnings(routeIds: string[]): Promise<WarningSnapshot> {
    const routeMap = mapping.routes as Record<string, { areaCodes: string[] }>;
    const routes = routeIds.map(id => id === 'jr-hokkaido.sassho' ? 'jr-hokkaido.gakuentoshi' : id);
    const offices = [...new Set(routes.flatMap(id => routeMap[id]?.areaCodes || []))];
    const results = await Promise.all(offices.map(fetchOffice));
    const unique = new Map(results.flatMap(result => result || []).map(alert => [`${alert.areaCode}:${alert.code}`, alert]));
    return { available: offices.length > 0 && results.every(result => result !== null) && routes.every(id => !!routeMap[id]),
        checkedAt: new Date().toISOString(), alerts: [...unique.values()],
        url: `https://www.jma.go.jp/bosai/warning/#area_type=offices&area_code=${offices[0] || '016000'}` };
}
// Compatibility only; the journey UI preserves the full official alert name.
export async function getJMAWarningsForRoute(routeId: string): Promise<WeatherWarning[] | null> {
    const result = await getJourneyWarnings([routeId]);
    if (!result.available) return null;
    const legacy: Record<string, WeatherWarning['type']> = {
        '02': '暴風雪警報', '32': '暴風雪警報', '05': '暴風警報', '35': '暴風警報',
        '06': '大雪警報', '36': '大雪警報', '12': '大雪注意報', '13': '暴風注意報', '15': '暴風注意報',
        '14': '雷注意報', '03': '大雨警報', '33': '大雨警報', '43': '大雨警報', '10': '大雨注意報',
    };
    return result.alerts.flatMap(a => legacy[a.code] ? [{ type: legacy[a.code], area: a.area, issuedAt: a.issuedAt, source: 'jma' as const }] : []);
}
export function clearJMACache() { cache.clear(); }
