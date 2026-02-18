import type { Route, Station } from './types';
export type { Route, Station };
import routesData from '../data/hokkaido-routes.json';
import stationsData from '../data/hokkaido-stations.json';
import statusUrlsData from '../data/jr-status-urls.json';
import areasData from '../data/areas.json';
import alternativeRoutesData from '../data/alternative-routes.json';

// 北海道JR路線データ (JSONから読込)
export const HOKKAIDO_ROUTES: Route[] = routesData as Route[];

// JR公式運行情報URL (JSONから読込)
export const JR_STATUS_URLS: Record<string, { url: string; label: string }> = statusUrlsData;

/**
 * 路線IDからJR公式URLを取得
 */
export function getJRStatusUrl(routeId: string): { url: string; label: string } {
    return JR_STATUS_URLS[routeId] || {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/',
        label: 'JR北海道運行情報',
    };
}

// 北海道全駅データ (JSONから読込)
export const HOKKAIDO_STATIONS: Station[] = stationsData as Station[];

// 駅をIDで検索
export function getStationById(id: string): Station | undefined {
    return HOKKAIDO_STATIONS.find(s => s.id === id);
}

// 駅を地域でグループ化
export function getStationsByRegion(): Map<string, Station[]> {
    const map = new Map<string, Station[]>();
    for (const station of HOKKAIDO_STATIONS) {
        const existing = map.get(station.region) || [];
        existing.push(station);
        map.set(station.region, existing);
    }
    return map;
}

// 2駅間の共通路線を取得
export function getCommonLines(stationA: Station, stationB: Station): Route[] {
    const commonLineIds = stationA.lines.filter(l => stationB.lines.includes(l));
    return HOKKAIDO_ROUTES.filter(r => commonLineIds.includes(r.id));
}

// エリア定義 (JSONから読込)
const AREAS: Record<string, string[]> = areasData;

// getConnectingRoute用の広域エリア定義 (後方互換性)
const SAPPORO_METRO_IDS = new Set([...AREAS.sapporo, ...AREAS.otaru]);
const DOUTO_IDS = new Set([...AREAS.obihiro_kushiro, ...AREAS.abashiri_kitami]);
const DONAN_IDS = new Set(AREAS.hakodate);
const DOHOKU_IDS = new Set(AREAS.asahikawa); // 旭川周辺のみを道北（広義）とする
const MURORAN_IDS = new Set(AREAS.muroran);

function eitherInArea(ids: string[], area: Set<string>): boolean {
    return ids.some(id => area.has(id));
}

// 2駅間の「連絡ルート」を取得
export function getConnectingRoute(stationA: Station, stationB: Station): Route | null {
    const ids = [stationA.id, stationB.id];

    // 1. 札幌圏 ↔ 道東 → 石勝線
    if (eitherInArea(ids, SAPPORO_METRO_IDS) && eitherInArea(ids, DOUTO_IDS)) {
        return HOKKAIDO_ROUTES.find(r => r.id === 'jr-hokkaido.sekisho') || null;
    }
    // 2. 札幌圏 ↔ 道南 → 室蘭本線
    if (eitherInArea(ids, SAPPORO_METRO_IDS) && eitherInArea(ids, DONAN_IDS)) {
        return HOKKAIDO_ROUTES.find(r => r.id === 'jr-hokkaido.muroran-main') || null;
    }
    // 3. 札幌圏 ↔ 道北 → 函館本線/宗谷本線
    if (eitherInArea(ids, SAPPORO_METRO_IDS) && eitherInArea(ids, DOHOKU_IDS)) {
        const soyaStations = AREAS.wakkanai_nayoro;
        if (ids.some(id => soyaStations.includes(id))) {
            return HOKKAIDO_ROUTES.find(r => r.id === 'jr-hokkaido.soya-main') || null;
        }
        return HOKKAIDO_ROUTES.find(r => r.id === 'jr-hokkaido.hakodate-main') || null;
    }
    // 4. 札幌圏 ↔ 室蘭エリア → 室蘭本線
    if (eitherInArea(ids, SAPPORO_METRO_IDS) && eitherInArea(ids, MURORAN_IDS)) {
        return HOKKAIDO_ROUTES.find(r => r.id === 'jr-hokkaido.muroran-main') || null;
    }

    // デフォルト（到着駅の路線）
    const arrivalLine = stationB.lines[0];
    return arrivalLine ? (HOKKAIDO_ROUTES.find(r => r.id === arrivalLine) || null) : null;
}

// 路線をIDで検索
export function getRouteById(id: string): Route | undefined {
    return HOKKAIDO_ROUTES.find(r => r.id === id);
}

// 路線を地域でグループ化
export function getRoutesByRegion(): Map<string, Route[]> {
    const map = new Map<string, Route[]>();
    for (const route of HOKKAIDO_ROUTES) {
        const existing = map.get(route.region) || [];
        existing.push(route);
        map.set(route.region, existing);
    }
    return map;
}

// 主要駅のみを取得
export function getMajorStations(): Station[] {
    return HOKKAIDO_STATIONS.filter(s => s.isMajor);
}

// 2点間の距離を計算
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// タクシー料金推定
export function estimateTaxiFare(station1: Station, station2: Station): {
    estimatedFare: number;
    distance: number;
    duration: string;
} | null {
    if (!station1?.lat || !station1?.lon || !station2?.lat || !station2?.lon) return null;
    const distanceKm = calculateDistance(station1.lat, station1.lon, station2.lat, station2.lon);
    const baseFare = 670;
    const distanceFare = Math.max(0, distanceKm - 1.6) * 400;
    const estimatedFare = Math.round((baseFare + distanceFare) / 100) * 100;
    return {
        estimatedFare,
        distance: Math.round(distanceKm * 10) / 10,
        duration: `約${Math.round(distanceKm * 2.5)}分`
    };
}

// 代替ルート定義
export interface AlternativeRouteOption {
    type: 'bus' | 'subway' | 'train' | 'other';
    name: string;
    details: string;
    time: string;
    note?: string;
    url?: string;
}

// マッチする代替手段を取得 (JSONデータを使用)
export function getAlternativeRoutes(depId: string, arrId: string): AlternativeRouteOption[] {
    // 1. 直一致のチェック
    const directMatch = alternativeRoutesData.find(m =>
        ('from' in m && 'to' in m) && (
            (m.from === depId && m.to === arrId) ||
            (m.from === arrId && m.to === depId)
        )
    );
    if (directMatch) return directMatch.options as AlternativeRouteOption[];

    // 2. エリア一致のチェック
    const areaMatch = (alternativeRoutesData as any[]).find(m => {
        if (!m.fromArea || !m.toArea) return false;
        const depInFrom = AREAS[m.fromArea]?.includes(depId);
        const arrInTo = AREAS[m.toArea]?.includes(arrId);
        const depInTo = AREAS[m.toArea]?.includes(depId);
        const arrInFrom = AREAS[m.fromArea]?.includes(arrId);
        return (depInFrom && arrInTo) || (depInTo && arrInFrom);
    });

    return areaMatch ? (areaMatch.options as AlternativeRouteOption[]) : [];
}
