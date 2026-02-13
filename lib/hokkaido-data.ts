import { Route } from './types';

// 北海道JR路線データ
export const HOKKAIDO_ROUTES: Route[] = [
    // 道央圏
    { id: 'jr-hokkaido.hakodate-main', name: '函館本線', company: 'JR北海道', region: '道央', color: '#2563eb' },
    { id: 'jr-hokkaido.chitose', name: '千歳線', company: 'JR北海道', region: '道央', color: '#059669' },
    { id: 'jr-hokkaido.sassho', name: '学園都市線（札沼線）', company: 'JR北海道', region: '道央', color: '#7c3aed' },
    { id: 'jr-hokkaido.muroran-main', name: '室蘭本線', company: 'JR北海道', region: '道央', color: '#dc2626' },

    // 道北
    { id: 'jr-hokkaido.soya-main', name: '宗谷本線', company: 'JR北海道', region: '道北', color: '#0891b2' },
    { id: 'jr-hokkaido.sekihoku-main', name: '石北本線', company: 'JR北海道', region: '道北', color: '#ca8a04' },
    { id: 'jr-hokkaido.furano', name: '富良野線', company: 'JR北海道', region: '道北', color: '#a855f7' }, // 🆕
    { id: 'jr-hokkaido.rumoi', name: '留萌本線', company: 'JR北海道', region: '道北', color: '#64748b' }, // 🆕

    // 道東
    { id: 'jr-hokkaido.hidaka', name: '日高本線', company: 'JR北海道', region: '道東', color: '#be185d' }, // 🆕
    { id: 'jr-hokkaido.sekisho', name: '石勝線', company: 'JR北海道', region: '道東', color: '#d97706' }, // 🆕
    { id: 'jr-hokkaido.nemuro-main', name: '根室本線', company: 'JR北海道', region: '道東', color: '#ea580c' },
    { id: 'jr-hokkaido.senmo-main', name: '釧網本線', company: 'JR北海道', region: '道東', color: '#16a34a' },

    // 道南
    { id: 'jr-hokkaido.hakodate-south', name: '函館本線（道南）', company: 'JR北海道', region: '道南', color: '#9333ea' },
];

// JR公式運行情報URL（エリア別）
export const JR_STATUS_URLS: Record<string, { url: string; label: string }> = {
    // 札幌近郊
    'jr-hokkaido.hakodate-main': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_spo.html',
        label: '札幌近郊の運行情報',
    },
    'jr-hokkaido.chitose': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_spo.html',
        label: '札幌近郊の運行情報',
    },
    'jr-hokkaido.sassho': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_spo.html',
        label: '札幌近郊の運行情報',
    },
    // 道央
    'jr-hokkaido.muroran-main': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_doo.html',
        label: '道央エリアの運行情報',
    },
    // 道北
    'jr-hokkaido.soya-main': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_dohoku.html',
        label: '道北エリアの運行情報',
    },
    'jr-hokkaido.sekihoku-main': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_dohoku.html',
        label: '道北エリアの運行情報',
    },
    'jr-hokkaido.rumoi': { // 🆕
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_dohoku.html',
        label: '道北エリアの運行情報',
    },
    // 道東
    'jr-hokkaido.hidaka': { // 🆕
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_doo.html',
        label: '道央エリアの運行情報', // 苫小牧側なので道央扱いが多いがAPI定義に合わせる
    },
    'jr-hokkaido.nemuro-main': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_doto.html',
        label: '道東エリアの運行情報',
    },
    'jr-hokkaido.sekisho': { // 🆕
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_doto.html',
        label: '道東エリアの運行情報',
    },
    'jr-hokkaido.senmo-main': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_doto.html',
        label: '道東エリアの運行情報',
    },
    // 道南
    'jr-hokkaido.hakodate-south': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_donan.html',
        label: '道南エリアの運行情報',
    },
};

// 路線IDからJR公式URLを取得
export function getJRStatusUrl(routeId: string): { url: string; label: string } {
    return JR_STATUS_URLS[routeId] || {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/',
        label: 'JR北海道運行情報',
    };
}
export interface Station {
    id: string;
    name: string;
    kana: string;      // 🆕 読み（ひらがな）
    lines: string[];  // 接続路線IDs
    region: '道央' | '道北' | '道東' | '道南';
    isMajor?: boolean; // 主要駅フラグ
    lat?: number; // 緯度
    lon?: number; // 経度
}

export const HOKKAIDO_STATIONS: Station[] = [
    // 道央圏 - 札幌周辺 (座標は概算)
    { id: 'sapporo', name: '札幌', kana: 'さっぽろ', lines: ['jr-hokkaido.hakodate-main', 'jr-hokkaido.chitose', 'jr-hokkaido.sassho'], region: '道央', isMajor: true, lat: 43.0687, lon: 141.3508 },
    { id: 'shin-sapporo', name: '新札幌', kana: 'しんさっぽろ', lines: ['jr-hokkaido.chitose'], region: '道央', isMajor: true, lat: 43.0388, lon: 141.4733 },
    { id: 'shin-chitose-airport', name: '新千歳空港', kana: 'しんちとせくうこう', lines: ['jr-hokkaido.chitose'], region: '道央', isMajor: true, lat: 42.7877, lon: 141.6795 },
    { id: 'minami-chitose', name: '南千歳', kana: 'みなみちとせ', lines: ['jr-hokkaido.chitose', 'jr-hokkaido.sekihoku-main'], region: '道央', isMajor: true, lat: 42.8091, lon: 141.6748 },
    { id: 'chitose', name: '千歳', kana: 'ちとせ', lines: ['jr-hokkaido.chitose'], region: '道央', lat: 42.8282, lon: 141.6521 },
    { id: 'osatsu', name: '長都', kana: 'おさつ', lines: ['jr-hokkaido.chitose'], region: '道央', lat: 42.8532, lon: 141.6136 },
    { id: 'sapporo-beer-teien', name: 'サッポロビール庭園', kana: 'さっぽろびーるていえん', lines: ['jr-hokkaido.chitose'], region: '道央', lat: 42.8632, lon: 141.5936 },
    { id: 'eniwa', name: '恵庭', kana: 'えにわ', lines: ['jr-hokkaido.chitose'], region: '道央', lat: 42.8832, lon: 141.5836 },
    { id: 'megumino', name: '恵み野', kana: 'めぐみの', lines: ['jr-hokkaido.chitose'], region: '道央', lat: 42.8932, lon: 141.5736 },
    { id: 'shimamatsu', name: '島松', kana: 'しままつ', lines: ['jr-hokkaido.chitose'], region: '道央', lat: 42.9032, lon: 141.5636 },
    { id: 'kitahiroshima', name: '北広島', kana: 'きたひろしま', lines: ['jr-hokkaido.chitose'], region: '道央', lat: 42.9806, lon: 141.5649 },
    { id: 'kaminopporo', name: '上野幌', kana: 'かみのっぽろ', lines: ['jr-hokkaido.chitose'], region: '道央', lat: 43.0188, lon: 141.4933 },

    // 道央圏 - 函館本線（札幌〜小樽・余市）
    { id: 'otaru', name: '小樽', kana: 'おたる', lines: ['jr-hokkaido.hakodate-main'], region: '道央', isMajor: true, lat: 43.1977, lon: 140.9937 },
    { id: 'otaru-chikko', name: '小樽築港', kana: 'おたるちっこう', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.1818, lon: 141.0269 },
    { id: 'zenibako', name: '銭函', kana: 'ぜにばこ', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.1438, lon: 141.1594 },
    { id: 'yoichi', name: '余市', kana: 'よいち', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.1878, lon: 140.7847 },
    { id: 'hosui-susukino', name: '豊水すすきの', kana: 'ほうすいすすきの', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.0555, lon: 141.3555 }, // 便宜上
    { id: 'hassamu-chuo', name: '発寒中央', kana: 'はっさむちゅうおう', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.0918, lon: 141.2864 },
    { id: 'hassamu', name: '発寒', kana: 'はっさむ', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.1018, lon: 141.2664 },
    { id: 'teine', name: '手稲', kana: 'ていね', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.1118, lon: 141.2464 },
    { id: 'kotoni', name: '琴似', kana: 'ことに', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.0815, lon: 141.3060 },
    { id: 'naebo', name: '苗穂', kana: 'なえぼ', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.0685, lon: 141.3800 },
    { id: 'shiroishi', name: '白石', kana: 'しろいし', lines: ['jr-hokkaido.hakodate-main', 'jr-hokkaido.chitose'], region: '道央', lat: 43.0545, lon: 141.4135 },
    { id: 'atsubetsu', name: '厚別', kana: 'あつべつ', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.0450, lon: 141.4550 },
    { id: 'oochi', name: '大麻', kana: 'おおち', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.0700, lon: 141.5000 },
    { id: 'nopporo', name: '野幌', kana: 'のっぽろ', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.0900, lon: 141.5300 },
    { id: 'ebetsu', name: '江別', kana: 'えべつ', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.1100, lon: 141.5500 },

    // 道央圏 - 函館本線（札幌〜旭川）
    { id: 'iwamizawa', name: '岩見沢', kana: 'いわみざわ', lines: ['jr-hokkaido.hakodate-main', 'jr-hokkaido.muroran-main'], region: '道央', isMajor: true, lat: 43.2042, lon: 141.7596 },
    { id: 'bibai', name: '美唄', kana: 'びばい', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.2977, lon: 141.8617 },
    { id: 'naie', name: '奈井江', kana: 'ないえ', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.4200, lon: 141.8900 },
    { id: 'sunagawa', name: '砂川', kana: 'すながわ', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.4934, lon: 141.9083 },
    { id: 'takikawa', name: '滝川', kana: 'たきかわ', lines: ['jr-hokkaido.hakodate-main', 'jr-hokkaido.nemuro-main'], region: '道央', lat: 43.5552, lon: 141.9080 },
    { id: 'osamunai', name: '納内', kana: 'おさむない', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.6800, lon: 142.0000 },
    { id: 'fukagawa', name: '深川', kana: 'ふかがわ', lines: ['jr-hokkaido.hakodate-main'], region: '道央', lat: 43.7212, lon: 142.0416 },
    { id: 'asahikawa', name: '旭川', kana: 'あさひかわ', lines: ['jr-hokkaido.hakodate-main', 'jr-hokkaido.soya-main', 'jr-hokkaido.sekihoku-main'], region: '道央', isMajor: true, lat: 43.7628, lon: 142.3587 },

    // 道央圏 - 学園都市線
    { id: 'ainosato-kyoiku-dai', name: 'あいの里教育大', kana: 'あいのさときょういくだい', lines: ['jr-hokkaido.sassho'], region: '道央', lat: 43.1554, lon: 141.4011 },
    { id: 'ishikari-tobetsu', name: '石狩当別', kana: 'いしかりとうべつ', lines: ['jr-hokkaido.sassho'], region: '道央', lat: 43.2208, lon: 141.5126 },
    { id: 'hokkaido-iryo-daigaku', name: '北海道医療大学', kana: 'ほっかいどういりょうだいがく', lines: ['jr-hokkaido.sassho'], region: '道央', lat: 43.2384, lon: 141.5422 },

    // 道央圏 - 室蘭本線・石勝線
    { id: 'tomakomai', name: '苫小牧', kana: 'とまこまい', lines: ['jr-hokkaido.muroran-main', 'jr-hokkaido.chitose'], region: '道央', isMajor: true, lat: 42.6416, lon: 141.5973 },
    { id: 'shiraoi', name: '白老', kana: 'しらおい', lines: ['jr-hokkaido.muroran-main'], region: '道央', lat: 42.5539, lon: 141.3533 },
    { id: 'noboribetsu', name: '登別', kana: 'のぼりべつ', lines: ['jr-hokkaido.muroran-main'], region: '道央', lat: 42.4552, lon: 141.1764 },
    { id: 'higashi-muroran', name: '東室蘭', kana: 'ひがしむろらん', lines: ['jr-hokkaido.muroran-main'], region: '道央', isMajor: true, lat: 42.3392, lon: 141.0263 },
    { id: 'muroran', name: '室蘭', kana: 'むろらん', lines: ['jr-hokkaido.muroran-main'], region: '道央', lat: 42.3152, lon: 140.9753 },
    { id: 'datemombetsu', name: '伊達紋別', kana: 'だてもんべつ', lines: ['jr-hokkaido.muroran-main'], region: '道央', lat: 42.4697, lon: 140.8542 },
    { id: 'toya', name: '洞爺', kana: 'とうや', lines: ['jr-hokkaido.muroran-main'], region: '道央', lat: 42.5592, lon: 140.7589 },
    { id: 'kuriyama', name: '栗山', kana: 'くりやま', lines: ['jr-hokkaido.muroran-main'], region: '道央', lat: 43.0589, lon: 141.7761 },
    { id: 'yuni', name: '由仁', kana: 'ゆに', lines: ['jr-hokkaido.muroran-main'], region: '道央', lat: 43.0039, lon: 141.7850 },
    { id: 'abira', name: '安平', kana: 'あびら', lines: ['jr-hokkaido.muroran-main'], region: '道央', lat: 42.8767, lon: 141.7633 },
    { id: 'oizawake', name: '追分', kana: 'おいざわけ', lines: ['jr-hokkaido.muroran-main', 'jr-hokkaido.sekisho'], region: '道央', lat: 42.8731, lon: 141.8106 },

    // 石勝線（トマム・占冠）
    { id: 'shimukappu', name: '占冠', kana: 'しむかっぷ', lines: ['jr-hokkaido.sekisho'], region: '道央', lat: 42.9900, lon: 142.3900 },
    { id: 'tomamu', name: 'トマム', kana: 'とまむ', lines: ['jr-hokkaido.sekisho'], region: '道東', isMajor: true, lat: 43.0558, lon: 142.6122 },

    // 道北（富良野線含む）
    { id: 'furano', name: '富良野', kana: 'ふらの', lines: ['jr-hokkaido.furano', 'jr-hokkaido.nemuro-main'], region: '道北', isMajor: true, lat: 43.3469, lon: 142.3917 },
    { id: 'biei', name: '美瑛', kana: 'びえい', lines: ['jr-hokkaido.furano'], region: '道北', lat: 43.5908, lon: 142.4628 },
    { id: 'wakkanai', name: '稚内', kana: 'わっかない', lines: ['jr-hokkaido.soya-main'], region: '道北', isMajor: true, lat: 45.4162, lon: 141.6734 },
    { id: 'shibetsu', name: '士別', kana: 'しべつ', lines: ['jr-hokkaido.soya-main'], region: '道北', lat: 44.1794, lon: 142.3969 },
    { id: 'wassamu', name: '和寒', kana: 'わっさむ', lines: ['jr-hokkaido.soya-main'], region: '道北', lat: 44.0200, lon: 142.4200 },
    { id: 'kenbuchi', name: '剣淵', kana: 'けんぶち', lines: ['jr-hokkaido.soya-main'], region: '道北', lat: 44.1000, lon: 142.4200 },
    { id: 'nayoro', name: '名寄', kana: 'なよろ', lines: ['jr-hokkaido.soya-main'], region: '道北', lat: 44.3562, lon: 142.4641 },
    { id: 'bifuka', name: '美深', kana: 'びふか', lines: ['jr-hokkaido.soya-main'], region: '道北', lat: 44.4800, lon: 142.3500 },
    { id: 'kamikawa', name: '上川', kana: 'かみかわ', lines: ['jr-hokkaido.sekihoku-main'], region: '道北', lat: 43.8483, lon: 142.7725 },
    { id: 'engaru', name: '遠軽', kana: 'えんがる', lines: ['jr-hokkaido.sekihoku-main'], region: '道北', lat: 44.0617, lon: 143.5283 },
    { id: 'abashiri', name: '網走', kana: 'あばしり', lines: ['jr-hokkaido.sekihoku-main', 'jr-hokkaido.senmo-main'], region: '道北', isMajor: true, lat: 44.0202, lon: 144.2547 },
    { id: 'bihoro', name: '美幌', kana: 'びほろ', lines: ['jr-hokkaido.sekihoku-main'], region: '道北', lat: 43.8322, lon: 144.1083 },
    { id: 'kitami', name: '北見', kana: 'きたみ', lines: ['jr-hokkaido.sekihoku-main'], region: '道北', lat: 43.8057, lon: 143.8962 },

    // 道東
    { id: 'shintoku', name: '新得', kana: 'しんとく', lines: ['jr-hokkaido.sekisho', 'jr-hokkaido.nemuro-main'], region: '道東', lat: 43.0833, lon: 142.8333 },
    { id: 'obihiro', name: '帯広', kana: 'おびひろ', lines: ['jr-hokkaido.nemuro-main'], region: '道東', isMajor: true, lat: 42.9180, lon: 143.2088 },
    { id: 'ikeda', name: '池田', kana: 'いけだ', lines: ['jr-hokkaido.nemuro-main'], region: '道東', lat: 42.9267, lon: 143.4475 },
    { id: 'kushiro', name: '釧路', kana: 'くしろ', lines: ['jr-hokkaido.nemuro-main', 'jr-hokkaido.senmo-main'], region: '道東', isMajor: true, lat: 42.9904, lon: 144.3814 },
    { id: 'atsukeshi', name: '厚岸', kana: 'あっけし', lines: ['jr-hokkaido.nemuro-main'], region: '道東', lat: 43.0514, lon: 144.8458 },
    { id: 'nemuro', name: '根室', kana: 'ねむろ', lines: ['jr-hokkaido.nemuro-main'], region: '道東', lat: 43.3304, lon: 145.5826 },
    { id: 'mashu', name: '摩周', kana: 'ましゅう', lines: ['jr-hokkaido.senmo-main'], region: '道東', lat: 43.4883, lon: 144.5333 },
    { id: 'shiretoko-shari', name: '知床斜里', kana: 'しれとこしゃり', lines: ['jr-hokkaido.senmo-main'], region: '道東', lat: 43.9103, lon: 144.6610 },

    // 道南
    { id: 'hakodate', name: '函館', kana: 'はこだて', lines: ['jr-hokkaido.hakodate-south'], region: '道南', isMajor: true, lat: 41.7737, lon: 140.7264 },
    { id: 'shin-hakodate-hokuto', name: '新函館北斗', kana: 'しんはこだてほくと', lines: ['jr-hokkaido.hakodate-south'], region: '道南', isMajor: true, lat: 41.9048, lon: 140.6481 },
    { id: 'mori', name: '森', kana: 'もり', lines: ['jr-hokkaido.hakodate-south'], region: '道南', lat: 42.1098, lon: 140.5746 },
    { id: 'yakumo', name: '八雲', kana: 'やくも', lines: ['jr-hokkaido.hakodate-south'], region: '道南', lat: 42.2533, lon: 140.2725 },
    { id: 'oshamambe', name: '長万部', kana: 'おしゃまんべ', lines: ['jr-hokkaido.hakodate-south', 'jr-hokkaido.muroran-main'], region: '道南', lat: 42.5126, lon: 140.3752 },
];

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

// 2駅間の「連絡ルート」を取得（直通がない場合の主要コリドー）
// 例: 札幌〜帯広 -> 石勝・根室線ルート
export function getConnectingRoute(stationA: Station, stationB: Station): Route | null {
    const ids = [stationA.id, stationB.id];

    // 1. 札幌 ↔ 道東（帯広・釧路）
    // 石勝線（峠越え）を主要リスク区間とする
    if (ids.includes('sapporo') && (ids.includes('obihiro') || ids.includes('kushiro') || ids.includes('shiretoko-shari'))) {
        return HOKKAIDO_ROUTES.find(r => r.id === 'jr-hokkaido.sekisho') || null;
    }

    // 2. 札幌 ↔ 函館・道南
    // 函館本線（山線）より室蘭本線（海線）が特急ルートだが、長万部〜札幌は室蘭本線or千歳線。
    // 特急北斗は「千歳・室蘭・函館」を経由。
    // 最も風に弱い「室蘭本線」をリスク指標とするのが安全
    if (ids.includes('sapporo') && (ids.includes('hakodate') || ids.includes('shin-hakodate-hokuto') || ids.includes('oshamambe'))) {
        return HOKKAIDO_ROUTES.find(r => r.id === 'jr-hokkaido.muroran-main') || null;
    }

    // 3. 札幌 ↔ 稚内（宗谷本線）
    // 宗谷本線をリスク指標とする
    if (ids.includes('sapporo') && (ids.includes('wakkanai') || ids.includes('nayoro'))) {
        return HOKKAIDO_ROUTES.find(r => r.id === 'jr-hokkaido.soya-main') || null;
    }

    // 4. 札幌 ↔ 網走（石北本線）
    // 石北本線をリスク指標とする
    if (ids.includes('sapporo') && (ids.includes('abashiri') || ids.includes('kitami'))) {
        return HOKKAIDO_ROUTES.find(r => r.id === 'jr-hokkaido.sekihoku-main') || null;
    }

    return null;
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

// 2点間の距離を計算 (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 地球の半径 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 駅間のタクシー概算料金を計算
export function estimateTaxiFare(station1Id: string, station2Id: string): number | null {
    const s1 = getStationById(station1Id);
    const s2 = getStationById(station2Id);

    if (!s1?.lat || !s1?.lon || !s2?.lat || !s2?.lon) {
        return null;
    }

    const distanceKm = calculateDistance(s1.lat, s1.lon, s2.lat, s2.lon);

    // 簡易計算: 初乗り670円(1.6km) + その後300mごとに100円 (約333円/km) + 迎車等予備費
    // 実際は信号待ち等の時間距離併用運賃があるため、少し多めに見積もる (400円/km)
    const baseFare = 670;
    const distanceFare = Math.max(0, distanceKm - 1.6) * 400;

    return Math.round((baseFare + distanceFare) / 100) * 100; // 100円単位に丸める
}

// 代替ルート定義
// 特定の区間（出発・到着）に対して、推奨される代替手段を定義
export interface AlternativeRouteOption {
    type: 'bus' | 'subway' | 'train' | 'other'; // 'train' は他社線や迂回ルート
    name: string;
    details: string; // "地下鉄東豊線（福住駅）→ 空港連絡バス" など詳細
    time: string; // 所要時間目安
    note?: string; // "雪に強い" "混雑注意" など
    url?: string; // 公式サイトがあれば
}

const SAPPORO_AREA = ['sapporo', 'shin-sapporo', 'kotoni', 'teine'];
const OTARU_AREA = ['otaru', 'otaru-chikko', 'zenibako', 'yoichi'];
const ASAHIKAWA_AREA = ['asahikawa', 'fukagawa', 'takikawa', 'sunagawa', 'bibai', 'iwamizawa'];
const MURORAN_AREA = ['tomakomai', 'shiraoi', 'noboribetsu', 'higashi-muroran', 'muroran', 'datemombetsu', 'toya'];
const HAKODATE_AREA = ['hakodate', 'shin-hakodate-hokuto', 'mori', 'yakumo', 'oshamambe'];
const OBIHIRO_KUSHIRO_AREA = ['tomamu', 'shintoku', 'obihiro', 'ikeda', 'atsukeshi', 'kushiro', 'nemuro'];
const SAKHALIN_AREA = ['wakkanai', 'shibetsu', 'nayoro'];
const ABASHIRI_AREA = ['kamikawa', 'engaru', 'bihoro', 'kitami', 'abashiri', 'shiretoko-shari'];

export const ALTERNATIVE_ROUTE_MAPPING: {
    match: (depId: string, arrId: string) => boolean;
    options: AlternativeRouteOption[];
}[] = [
        // 1. 札幌 ↔ 新千歳空港
        {
            match: (d, a) => (d === 'sapporo' && a === 'shin-chitose-airport') || (d === 'shin-chitose-airport' && a === 'sapporo'),
            options: [
                {
                    type: 'bus',
                    name: '空港連絡バス（中央バス/北都交通）',
                    details: '札幌市内各所・主要ホテルから直行。確実に座れるが、雪による渋滞リスクあり。',
                    time: '約70-80分',
                    note: '高速道路通行止めの場合は下道迂回で大幅遅延あり',
                    url: 'https://www.chuo-bus.co.jp/airport/'
                },
                {
                    type: 'subway',
                    name: '地下鉄東豊線 + バス',
                    details: '地下鉄「福住駅」まで移動し、そこから空港連絡バスに乗車。',
                    time: '約60分',
                    note: '札幌中心部の渋滞を回避できるため、雪の日は比較的安定。荷物が多いと乗り換えが少し大変。'
                }
            ]
        },
        // 2. 札幌 ↔ 小樽方面
        {
            match: (d, a) => (SAPPORO_AREA.includes(d) && OTARU_AREA.includes(a)) || (OTARU_AREA.includes(d) && SAPPORO_AREA.includes(a)),
            options: [
                {
                    type: 'bus',
                    name: '高速おたる号（中央バス/JRバス）',
                    details: '札幌ターミナル・札幌駅から頻発。円山経由・北大経由あり。',
                    time: '約65分',
                    url: 'https://www.chuo-bus.co.jp/highway/index.cgi?ope=det&n=8'
                },
                {
                    type: 'subway',
                    name: '地下鉄東西線 + バス',
                    details: '地下鉄「宮の沢駅」まで移動し、ターミナルから小樽行きバスに乗車。',
                    time: '約50分',
                    note: '札幌市内の渋滞を完全回避。宮の沢駅は屋内ターミナル直結で快適。'
                }
            ]
        },
        // 3. 札幌 ↔ 旭川方面
        {
            match: (d, a) => (SAPPORO_AREA.includes(d) && ASAHIKAWA_AREA.includes(a)) || (ASAHIKAWA_AREA.includes(d) && SAPPORO_AREA.includes(a)),
            options: [
                {
                    type: 'bus',
                    name: '高速あさひかわ号',
                    details: '札幌駅前ターミナル発。30分間隔で運行。',
                    time: '約130分', // 冬期は+α
                    note: 'JR特急運休時は非常に混雑し、積み残し発生の可能性あり。予約推奨（一部便）。',
                    url: 'https://www.chuo-bus.co.jp/highway/index.cgi?ope=det&n=1'
                }
            ]
        },
        // 4. 札幌 ↔ 苫小牧・室蘭方面
        {
            match: (d, a) => (SAPPORO_AREA.includes(d) && MURORAN_AREA.includes(a)) || (MURORAN_AREA.includes(d) && SAPPORO_AREA.includes(a)),
            options: [
                {
                    type: 'bus',
                    name: '高速とまこまい号 / 高速むろらん号',
                    details: '札幌駅前ターミナル発。',
                    time: '苫小牧:約100分 / 室蘭:約150分',
                    url: 'https://www.chuo-bus.co.jp/highway/'
                }
            ]
        },
        // 5. 札幌 ↔ 函館方面
        {
            match: (d, a) => (SAPPORO_AREA.includes(d) && HAKODATE_AREA.includes(a)) || (HAKODATE_AREA.includes(d) && SAPPORO_AREA.includes(a)),
            options: [
                {
                    type: 'bus',
                    name: '高速はこだて号',
                    details: '札幌駅前 ↔ 函館駅前。要予約。所要約5時間30分。',
                    time: '約5時間30分',
                    note: 'JR運休時は満席になりやすい。夜行便もあり。',
                    url: 'https://www.chuo-bus.co.jp/highway/index.cgi?ope=det&n=2'
                }
            ]
        },
        // 6. 札幌 ↔ 帯広・釧路方面（一括）
        {
            match: (d, a) => (SAPPORO_AREA.includes(d) && OBIHIRO_KUSHIRO_AREA.includes(a)) || (OBIHIRO_KUSHIRO_AREA.includes(d) && SAPPORO_AREA.includes(a)),
            options: [
                {
                    type: 'bus',
                    name: 'ポテトライナー / スターライト釧路号',
                    details: '札幌駅前 ↔ 帯広・釧路。要予約。',
                    time: '帯広:約4時間 / 釧路:約5.5時間',
                    note: '冬季は峠越えのため遅延リスクあり。暴風雪時は運休リスク高。',
                    url: 'https://www.chuo-bus.co.jp/highway/'
                }
            ]
        },
        // 8. 札幌 ↔ 稚内方面
        {
            match: (d, a) => (SAPPORO_AREA.includes(d) && SAKHALIN_AREA.includes(a)) || (SAKHALIN_AREA.includes(d) && SAPPORO_AREA.includes(a)),
            options: [
                {
                    type: 'bus',
                    name: 'わっかない号',
                    details: '札幌駅前 ↔ 稚内駅前。要予約。',
                    time: '約5時間50分',
                    note: '海沿いルートのため、宗谷本線と同様に強風リスクあり。',
                    url: 'https://www.chuo-bus.co.jp/highway/index.cgi?ope=det&n=34'
                }
            ]
        },
        // 9. 札幌 ↔ 北見・網走方面
        {
            match: (d, a) => (SAPPORO_AREA.includes(d) && ABASHIRI_AREA.includes(a)) || (ABASHIRI_AREA.includes(d) && SAPPORO_AREA.includes(a)),
            options: [
                {
                    type: 'bus',
                    name: 'ドリーミントオホーツク号',
                    details: '札幌 ↔ 北見・網走。要予約。',
                    time: '約6時間',
                    url: 'https://www.chuo-bus.co.jp/highway/index.cgi?ope=det&n=6'
                }
            ]
        }
    ];

// マッチする代替手段を取得
export function getAlternativeRoutes(depId: string, arrId: string): AlternativeRouteOption[] {
    for (const mapping of ALTERNATIVE_ROUTE_MAPPING) {
        if (mapping.match(depId, arrId)) {
            return mapping.options;
        }
    }
    return [];
}
