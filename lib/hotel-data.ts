export interface Hotel {
    id: string;
    name: string;
    description: string;
    city: string;
    affiliateUrl: string;
    imageUrl?: string;
    priceRange?: string;
}

const AFFILIATE_ID = '50ed201f.eca7f160.50ed2020.0b4b05de';

function createAffiliateUrl(hotelId: string): string {
    const travelUrl = encodeURIComponent(`https://travel.rakuten.co.jp/HOTEL/${hotelId}/${hotelId}.html`);
    return `https://hb.afl.rakuten.co.jp/hgc/${AFFILIATE_ID}/?pc=${travelUrl}`;
}

export const HOTEL_DATA: Record<string, Hotel[]> = {
    'sapporo': [
        {
            id: '41pieces-sapporo',
            name: '41PIECES Sapporo',
            description: '全室33㎡以上の広々とした客室。キッチン付きでグループ旅に最適。',
            city: '札幌',
            affiliateUrl: createAffiliateUrl('182874'),
            priceRange: '10,000円〜'
        },
        {
            id: 'sapporo-stream',
            name: 'SAPPORO STREAM HOTEL',
            description: '「COCONO SUSUKINO」直結。洗練された空間と街の眺望を楽しめるライフスタイルホテル。',
            city: '札幌',
            affiliateUrl: createAffiliateUrl('188162'),
            priceRange: '15,000円〜'
        },
        {
            id: 'keikyu-ex-sapporo',
            name: '京急ＥＸホテル札幌',
            description: '札幌駅北口から徒歩1分。機能的で清潔感のある客室がビジネス・観光に人気。',
            city: '札幌',
            affiliateUrl: createAffiliateUrl('182561'),
            priceRange: '8,000円〜'
        }
    ],
    'asahikawa': [
        {
            id: 'oshonen',
            name: '和風旅館 扇松園',
            description: '旭川市内唯一、大雪山系の眺望を楽しめる旅館。打ちたて蕎麦と地場産食材が自慢。',
            city: '旭川',
            affiliateUrl: createAffiliateUrl('144963'),
            priceRange: '12,000円〜'
        },
        {
            id: 'omo7-asahikawa',
            name: 'OMO7旭川 by 星野リゾート',
            description: '街を楽しむ仕掛けが満載。ご近所ガイドが旭川の魅力を深掘り。',
            city: '旭川',
            affiliateUrl: createAffiliateUrl('852'),
            priceRange: '10,000円〜'
        }
    ],
    'hakodate': [
        {
            id: 'century-marina-hakodate',
            name: 'センチュリーマリーナ函館',
            description: '空中露天風呂と豪華朝食ビュッフェが全国屈指の評価。',
            city: '函館',
            affiliateUrl: createAffiliateUrl('168681'),
            priceRange: '18,000円〜'
        },
        {
            id: 'la-vista-hakodate',
            name: 'ラ・ビスタ函館ベイ',
            description: '赤レンガ倉庫隣接。大正ロマンな客室と「日本一」と評される朝食。',
            city: '函館',
            affiliateUrl: createAffiliateUrl('69295'),
            priceRange: '15,000円〜'
        }
    ],
    'obihiro': [
        {
            id: 'seijakubo',
            name: '十勝川モール温泉 清寂房',
            description: '全室に源泉かけ流し露天風呂完備。静寂と旬の味覚を楽しむ大人の隠れ宿。',
            city: '帯広',
            affiliateUrl: createAffiliateUrl('184142'),
            priceRange: '25,000円〜'
        },
        {
            id: 'obihiro-yachiyo',
            name: '星空自慢の宿 帯広八千代',
            description: '日高山脈の麓に位置し、満点の星空が自慢。十勝産食材の家庭料理が人気。',
            city: '帯広',
            affiliateUrl: createAffiliateUrl('28354'),
            priceRange: '8,000円〜'
        }
    ],
    'kushiro': [
        {
            id: 'shirarutoro-lodge',
            name: 'ロッジ シラルトロ',
            description: '釧路湿原を一望できる高台。カヌーツアーなどアクティビティ充実。',
            city: '釧路',
            affiliateUrl: createAffiliateUrl('29138'),
            priceRange: '12,000円〜'
        }
    ],
    'wakkanai': [
        {
            id: 'soyamisaki-minshuku',
            name: '民宿 宗谷岬',
            description: '日本最北端・宗谷岬の目の前。サハリンを望む絶景とボリューム満点の海鮮。',
            city: '稚内',
            affiliateUrl: createAffiliateUrl('28271'),
            priceRange: '7,000円〜'
        },
        {
            id: 'surfeel-wakkanai',
            name: 'サフィールホテル稚内',
            description: '稚内港近くの最高級シティホテル。上質な空間で北の旅を満喫。',
            city: '稚内',
            affiliateUrl: createAffiliateUrl('20711'),
            priceRange: '12,000円〜'
        }
    ],
    'abashiri': [
        {
            id: 'northern-lodge-kanto',
            name: 'ノーザンロッジカント',
            description: '1日3組限定。北海道フードマイスターのオーナーが振る舞う本格コース料理。',
            city: '網走',
            affiliateUrl: createAffiliateUrl('73992'),
            priceRange: '15,000円〜'
        },
        {
            id: 'hokuten-no-oka',
            name: '北天の丘 あばしり湖 鶴雅リゾート',
            description: '古代オホーツク文化をデザインコンセプトにしたリゾート。自家源泉の温泉。',
            city: '網走',
            affiliateUrl: createAffiliateUrl('68067'),
            priceRange: '20,000円〜'
        }
    ]
};

export function getHotelsForStation(stationId: string): Hotel[] {
    return HOTEL_DATA[stationId] || [];
}
