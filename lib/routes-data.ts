import { Route } from './types';

// 主要路線マスタデータ（ODPT APIのIDに対応）
export const ROUTES: Route[] = [
    // JR東日本
    { id: 'odpt.Railway:JR-East.Yamanote', name: 'JR山手線', company: 'JR東日本', region: '東京', color: '#9acd32' },
    { id: 'odpt.Railway:JR-East.ChuoRapid', name: 'JR中央線快速', company: 'JR東日本', region: '東京', color: '#ff4500' },
    { id: 'odpt.Railway:JR-East.ChuoSobuLocal', name: 'JR中央・総武線各停', company: 'JR東日本', region: '東京', color: '#ffd700' },
    { id: 'odpt.Railway:JR-East.KeihinTohokuNegishi', name: 'JR京浜東北線', company: 'JR東日本', region: '東京', color: '#00bfff' },
    { id: 'odpt.Railway:JR-East.Tokaido', name: 'JR東海道線', company: 'JR東日本', region: '東京', color: '#ff8c00' },
    { id: 'odpt.Railway:JR-East.ShonanShinjuku', name: 'JR湘南新宿ライン', company: 'JR東日本', region: '東京', color: '#e21f26' },
    { id: 'odpt.Railway:JR-East.Yokosuka', name: 'JR横須賀線', company: 'JR東日本', region: '東京', color: '#0000cd' },
    { id: 'odpt.Railway:JR-East.Saikyo', name: 'JR埼京線', company: 'JR東日本', region: '東京', color: '#00a651' },

    // 東京メトロ
    { id: 'odpt.Railway:TokyoMetro.Ginza', name: '東京メトロ銀座線', company: '東京メトロ', region: '東京', color: '#ff9500' },
    { id: 'odpt.Railway:TokyoMetro.Marunouchi', name: '東京メトロ丸ノ内線', company: '東京メトロ', region: '東京', color: '#f62e36' },
    { id: 'odpt.Railway:TokyoMetro.Hibiya', name: '東京メトロ日比谷線', company: '東京メトロ', region: '東京', color: '#b5b5ac' },
    { id: 'odpt.Railway:TokyoMetro.Tozai', name: '東京メトロ東西線', company: '東京メトロ', region: '東京', color: '#009bbf' },
    { id: 'odpt.Railway:TokyoMetro.Chiyoda', name: '東京メトロ千代田線', company: '東京メトロ', region: '東京', color: '#00a650' },
    { id: 'odpt.Railway:TokyoMetro.Yurakucho', name: '東京メトロ有楽町線', company: '東京メトロ', region: '東京', color: '#c1a470' },
    { id: 'odpt.Railway:TokyoMetro.Hanzomon', name: '東京メトロ半蔵門線', company: '東京メトロ', region: '東京', color: '#8f76d6' },
    { id: 'odpt.Railway:TokyoMetro.Namboku', name: '東京メトロ南北線', company: '東京メトロ', region: '東京', color: '#00ac9b' },
    { id: 'odpt.Railway:TokyoMetro.Fukutoshin', name: '東京メトロ副都心線', company: '東京メトロ', region: '東京', color: '#9c5e31' },

    // 都営地下鉄
    { id: 'odpt.Railway:Toei.Asakusa', name: '都営浅草線', company: '東京都交通局', region: '東京', color: '#e85298' },
    { id: 'odpt.Railway:Toei.Mita', name: '都営三田線', company: '東京都交通局', region: '東京', color: '#0079c2' },
    { id: 'odpt.Railway:Toei.Shinjuku', name: '都営新宿線', company: '東京都交通局', region: '東京', color: '#6cbb5a' },
    { id: 'odpt.Railway:Toei.Oedo', name: '都営大江戸線', company: '東京都交通局', region: '東京', color: '#b6007a' },

    // 私鉄
    { id: 'odpt.Railway:Tokyu.Toyoko', name: '東急東横線', company: '東急電鉄', region: '東京', color: '#da0442' },
    { id: 'odpt.Railway:Tokyu.DenEnToshi', name: '東急田園都市線', company: '東急電鉄', region: '東京', color: '#00a040' },
    { id: 'odpt.Railway:Odakyu.Odawara', name: '小田急線', company: '小田急電鉄', region: '東京', color: '#1e90ff' },
    { id: 'odpt.Railway:Keio.Keio', name: '京王線', company: '京王電鉄', region: '東京', color: '#dd0077' },
    { id: 'odpt.Railway:Seibu.Ikebukuro', name: '西武池袋線', company: '西武鉄道', region: '東京', color: '#1d2088' },
    { id: 'odpt.Railway:Seibu.Shinjuku', name: '西武新宿線', company: '西武鉄道', region: '東京', color: '#1d2088' },
    { id: 'odpt.Railway:Tobu.Tojo', name: '東武東上線', company: '東武鉄道', region: '東京', color: '#0062a8' },
    { id: 'odpt.Railway:Tobu.Skytree', name: '東武スカイツリーライン', company: '東武鉄道', region: '東京', color: '#0062a8' },
];

// 路線をIDで検索
export function getRouteById(id: string): Route | undefined {
    return ROUTES.find(r => r.id === id);
}

// 路線を会社でグループ化
export function getRoutesByCompany(): Map<string, Route[]> {
    const map = new Map<string, Route[]>();
    for (const route of ROUTES) {
        const existing = map.get(route.company) || [];
        existing.push(route);
        map.set(route.company, existing);
    }
    return map;
}
