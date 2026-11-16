/**
 * 区間に合う代替手段と、いる駅の近くの宿・待てる場所を選ぶ。
 * 時刻表由来の数字(所要時間・本数)は有効期限を過ぎたら出さない。
 */
import areas from '@/data/areas.json';
import { getStationById } from '@/lib/hokkaido-data';
import { CORRIDORS, SUBWAY, STAYS, TIMES_VALID_UNTIL, CATALOG_CHECKED_AT, type AltOption, type StayPlace } from '@/data/alternatives/catalog';

export interface AlternativesView {
    corridor: string | null;
    options: AltOption[];
    /** 所要時間・本数を表示してよいか(時刻表の有効期限内) */
    timesValid: boolean;
    checkedAt: string;
    /** 出発駅(いまいる駅)の近く */
    stays: { station: string; places: StayPlace[] } | null;
}

const SAPPORO_AREA = new Set<string>(areas.sapporo);

function km(a: { lat?: number; lon?: number }, b: { lat?: number; lon?: number }) {
    if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return Infinity;
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const nearestHub = (stationId: string) => {
    const station = getStationById(stationId);
    if (!station) return null;
    let best: { corridor: typeof CORRIDORS[number]; d: number } | null = null;
    for (const corridor of CORRIDORS) for (const hub of corridor.hubs) {
        const h = getStationById(hub);
        const d = h ? km(station, h) : Infinity;
        if (d <= corridor.nearKm && (!best || d < best.d)) best = { corridor, d };
    }
    return best?.corridor ?? null;
};

/** other が札幌側の端か(札幌圏にあり、同じ拠点の近くではない) */
const toSapporoSide = (other: string, hub: typeof CORRIDORS[number]) => SAPPORO_AREA.has(other) && nearestHub(other)?.id !== hub.id;

export function findAlternatives(fromId: string, toId: string, lineSlugs: string[], now = new Date()): AlternativesView {
    const today = new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
    const fromSapporo = SAPPORO_AREA.has(fromId), toSapporo = SAPPORO_AREA.has(toId);
    const options: AltOption[] = [];
    let corridor: string | null = null;
    // 札幌圏 ↔ 拠点(片方が札幌圏、もう片方が拠点の近く)
    // 拠点側の端を探す。新千歳空港のように札幌圏の駅一覧に入っている拠点もあるので、拠点かどうかを先に見る
    const hubOf = { from: nearestHub(fromId), to: nearestHub(toId) };
    const hub = hubOf.to && toSapporoSide(fromId, hubOf.to) ? hubOf.to : hubOf.from && toSapporoSide(toId, hubOf.from) ? hubOf.from : null;
    if (hub) { corridor = hub.label; options.push(...hub.options); }
    // 札幌市内どうし、または札幌圏を通る区間は地下鉄も
    if (fromSapporo || toSapporo) for (const s of SUBWAY) {
        if (s.lineSlugs.some(l => lineSlugs.includes(l)) && (fromSapporo && toSapporo || !options.length)) options.push(s.option);
    }
    // いまいる駅(出発駅)の近く。無ければ同じ拠点の駅
    const stayKey = STAYS[fromId] ? fromId : fromSapporo ? 'sapporo' : nearestHub(fromId)?.hubs.find(h => STAYS[h]) ?? null;
    const stays = stayKey && STAYS[stayKey] ? { station: getStationById(stayKey)?.name ?? '', places: STAYS[stayKey] } : null;
    return { corridor, options, timesValid: today <= TIMES_VALID_UNTIL, checkedAt: CATALOG_CHECKED_AT, stays };
}
