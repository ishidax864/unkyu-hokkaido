/**
 * 駅の組から、関係する路線(ボードの行)を求める。ブラウザでも使えるよう純粋関数のみ。
 */
import { HOKKAIDO_STATIONS, getStationById } from '@/lib/hokkaido-data';
import areas from '@/data/areas.json';
import { LINE_BY_SLUG, canonicalRouteId, type LineDef } from './lines';

/** 駅の共有から経由路線(旧ID)を幅優先で求める。到着駅の路線を勝手に選ばない。 */
export function journeyRouteIds(departureId: string, arrivalId: string): string[] | null {
    const departure = getStationById(departureId), arrival = getStationById(arrivalId);
    if (!departure || !arrival || departureId === arrivalId) return null;
    const queue = departure.lines.map(line => [line]);
    const seen = new Set(departure.lines);
    while (queue.length) {
        const path = queue.shift()!;
        const line = path[path.length - 1];
        if (arrival.lines.includes(line)) return path;
        for (const station of HOKKAIDO_STATIONS.filter(s => s.lines.includes(line))) {
            for (const next of station.lines) if (!seen.has(next)) {
                seen.add(next); queue.push([...path, next]);
            }
        }
    }
    return null;
}

/** JR の「札幌近郊」エリアに相当する駅(小樽〜札幌〜岩見沢・千歳方面・学園都市線)。 */
const SAPPORO_NEAR = new Set<string>([
    ...areas.sapporo, 'otaru', 'otaru-chikko', 'zenibako', 'asari', 'minami-otaru', 'shin-chitose-airport',
]);
const LINER_STATIONS = new Set(['hakodate', 'goryokaku', 'kikyo', 'onakayama', 'nanae', 'shin-hakodate-hokuto']);
/** 釧路より東(花咲線)の判定 */
const HANASAKI_MIN_LON = 144.45;

function distanceKm(a: { lat?: number; lon?: number }, b: { lat?: number; lon?: number }) {
    if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return 0;
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * 区間に関係する路線。公式状態はこれらの最悪値、予報はこれらの地点の最悪値で判断する。
 * 区間単位の対応(影響マップ)ができるまでは、区間をやや広めに含める(見逃しを避ける側)。
 */
export function linesForJourney(departureId: string, arrivalId: string): LineDef[] | null {
    const routeIds = journeyRouteIds(departureId, arrivalId);
    if (!routeIds) return null;
    const from = getStationById(departureId)!, to = getStationById(arrivalId)!;
    const ends = [from, to];
    const slugs = new Set<string>();
    for (const raw of routeIds) {
        const id = canonicalRouteId(raw);
        switch (id) {
            case 'jr-hokkaido.hakodate-main':
            case 'jr-hokkaido.chitose':
                slugs.add('sapporo-hakodate-chitose');
                if (!ends.every(s => SAPPORO_NEAR.has(s.id))) slugs.add('doo-hakodate-chitose');
                if (ends.some(s => s.id === 'shin-chitose-airport' || s.id === 'minami-chitose')) slugs.add('airport');
                break;
            case 'jr-hokkaido.sassho': slugs.add('gakuen-toshi'); break;
            case 'jr-hokkaido.muroran-main': slugs.add('muroran'); break;
            case 'jr-hokkaido.hidaka': slugs.add('hidaka'); break;
            case 'jr-hokkaido.hakodate-south':
                if (ends.every(s => LINER_STATIONS.has(s.id))) slugs.add('hakodate-liner');
                else slugs.add('donan-hakodate');
                break;
            case 'jr-hokkaido.soya-main': slugs.add('soya'); break;
            case 'jr-hokkaido.sekihoku-main': slugs.add('sekihoku'); break;
            case 'jr-hokkaido.furano': slugs.add('furano'); break;
            case 'jr-hokkaido.sekisho': slugs.add('sekisho'); break;
            case 'jr-hokkaido.nemuro-main':
                if (ends.some(s => (s.lon ?? 0) < HANASAKI_MIN_LON)) slugs.add('nemuro');
                if (ends.some(s => (s.lon ?? 0) >= HANASAKI_MIN_LON)) slugs.add('hanasaki');
                break;
            case 'jr-hokkaido.senmo-main': slugs.add('senmo'); break;
        }
    }
    // 長距離は特急を使うことが多い。特急の運休も関係する。
    if (distanceKm(from, to) > 60) slugs.add('express');
    return [...slugs].map(s => LINE_BY_SLUG.get(s)).filter((l): l is LineDef => !!l);
}
