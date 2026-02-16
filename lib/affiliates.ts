/**
 * アフィリエイト・外部サービス連携の集中定義
 * 北海道での実用性を重視したセレクション
 */

export interface AffiliateLink {
    id: string;
    name: string;
    description: string;
    webUrl: string;
    type: 'taxi' | 'bus' | 'rental' | 'hotel' | 'shuttle' | 'cafe';
    region: 'hokkaido' | 'all';
    priority: number;
}

export const AFFILIATE_REGISTRY: AffiliateLink[] = [
    // --- タクシー (北海道で強いもの) ---
    {
        id: 'didi-taxi',
        name: 'Didiタクシー',
        description: '札幌・旭川・函館・富良野などで強い。迎車料金無料が多くユーザーに不評が少ない。',
        webUrl: 'https://research.didi-food.com/t/hokkaido',
        type: 'taxi',
        region: 'hokkaido',
        priority: 1,
    },
    {
        id: 'go-taxi',
        name: 'GOタクシー',
        description: '北海道全域（主要都市すべて）をカバー。最も汎用性が高い。',
        webUrl: 'https://go.mo-t.com/',
        type: 'taxi',
        region: 'all',
        priority: 2,
    },
    {
        id: 'uber-taxi',
        name: 'Uber Taxi',
        description: '札幌・空港周辺・恵庭などに特化。観光客やビジネス客に最適。',
        webUrl: 'https://www.uber.com/jp/ja/ride/taxi/',
        type: 'taxi',
        region: 'hokkaido',
        priority: 3,
    },

    // --- 空港シャトル (NearMe) ---
    {
        id: 'nearme-shuttle',
        name: 'NearMe（空港送迎シャトル）',
        description: '新千歳空港 ↔ 札幌市内の定額相乗り。JR運休時の「詰み」を回避する最強手段。',
        webUrl: 'https://px.a8.net/svt/ejp?a8mat=4AX4SE+16VZM+4Q64+5YJRM',
        type: 'shuttle',
        region: 'hokkaido',
        priority: 1,
    },

    // --- バス (北海道最大手) ---
    {
        id: 'chuo-bus',
        name: '北海道中央バス',
        description: '道内最大のバスネットワーク。高速バスの空席確認に。',
        webUrl: 'https://www.chuo-bus.co.jp/',
        type: 'bus',
        region: 'hokkaido',
        priority: 1,
    },
    {
        id: 'rakuten-bus',
        name: '楽天トラベル（高速バス予約）',
        description: 'JR運休時の代替バスをオンライン予約。ポイントも貯まる。',
        webUrl: 'https://hb.afl.rakuten.co.jp/hsc/50ead9ce.151a5ac5.50e9f038.48437186/',
        type: 'bus',
        region: 'all',
        priority: 2,
    },

    // --- レンタカー ---
    {
        id: 'rakuten-rental',
        name: '楽天レンタカー',
        description: '北海道各駅のレンタカーを比較・予約。４WD指定も可能。',
        webUrl: 'https://hb.afl.rakuten.co.jp/hsc/50ead955.debb157c.50e9f038.48437186/',
        type: 'rental',
        region: 'all',
        priority: 1,
    },

    // --- ホテル ---
    {
        id: 'rakuten-travel',
        name: '楽天トラベル',
        description: '駅に近いホテルを今すぐ予約。吹雪の日の安全確保に。',
        webUrl: 'https://travel.rakuten.co.jp/',
        type: 'hotel',
        region: 'all',
        priority: 1,
    },

    // --- カフェ ---
    {
        id: 'cafe-search',
        name: '駅周辺のカフェ',
        description: '運転再開待ちの時間つぶしに。',
        webUrl: 'https://www.google.com/maps/search/カフェ/',
        type: 'cafe',
        region: 'all',
        priority: 1,
    }
];

/**
 * タイプ別に有効なアフィリエイトを取得
 */
export function getAffiliatesByType(type: AffiliateLink['type']): AffiliateLink[] {
    return AFFILIATE_REGISTRY
        .filter(a => a.type === type)
        .sort((a, b) => a.priority - b.priority);
}

/**
 * IDで特定のアフィリエイトを取得
 */
export function getAffiliateById(id: string): AffiliateLink | undefined {
    return AFFILIATE_REGISTRY.find(a => a.id === id);
}
