/**
 * 代替手段のカタログ。出典は各事業者の公式ページ(2026-11-16 に確認。詳細は artifacts/代替手段の調査_2026-11-16.md)。
 *
 * - minutes / perDay は確認日の時刻表(夏ダイヤ)から数えた値。中央バス・北都交通は 2026-12-11 に冬ダイヤへ切り替わるため、
 *   timesValidUntil を過ぎたら所要時間・本数は表示しない(リンクだけ出す)。
 * - 順番は「予約なしで乗れるもの → 予約が必要なもの」。収益の有無で順番を変えない。
 * - 札幌駅のバス乗り場は屋外(札幌駅バスターミナルは2028年度まで閉鎖)。
 */
export type AltMode = 'bus' | 'subway' | 'air';

export interface AltOption {
    mode: AltMode;
    name: string;
    operator: string;
    /** 乗り場(札幌側) */
    boarding: string;
    /** 所要時間(分)の幅 */
    minutes?: [number, number];
    /** 1日の本数(片道) */
    perDay?: number;
    reservation: 'none' | 'required' | 'unknown';
    note?: string;
    url: string;
    /** 運休情報のページ */
    statusUrl?: string;
}

export interface Corridor {
    id: string;
    /** 札幌圏でない側の拠点駅。区間の端がこの駅から nearKm 以内なら該当 */
    hubs: string[];
    nearKm: number;
    label: string;
    options: AltOption[];
}

export const CATALOG_CHECKED_AT = '2026-11-16';
/** 中央バス・北都交通の冬ダイヤ開始の前日まで有効 */
export const TIMES_VALID_UNTIL = '2026-12-10';

const CHUO_STATUS = 'https://www.chuo-bus.co.jp/support/stop/';
const SAPPORO_STOP = '札幌駅前（屋外のりば）';

export const CORRIDORS: Corridor[] = [
    {
        id: 'airport', hubs: ['shin-chitose-airport', 'minami-chitose', 'chitose'], nearKm: 8, label: '札幌 ↔ 新千歳空港',
        options: [
            { mode: 'bus', name: '空港連絡バス（札幌都心線）', operator: '北海道中央バス・北都交通', boarding: SAPPORO_STOP, minutes: [74, 77], perDay: 79, reservation: 'none',
                note: '福住駅（地下鉄東豊線）経由。雪の日は渋滞で遅れやすい', url: 'https://www.chuo-bus.co.jp/airport/timetable/?ope=det&n=34&o=1&t=14', statusUrl: CHUO_STATUS },
            { mode: 'bus', name: '空港連絡バス（大谷地駅発着）', operator: '北海道中央バス', boarding: '地下鉄東西線 大谷地駅', minutes: [32, 32], perDay: 23, reservation: 'none',
                note: '札幌駅からは地下鉄で大通乗り換え・大谷地へ', url: 'https://www.chuo-bus.co.jp/airport/timetable/?ope=det&n=37&o=1&t=14', statusUrl: CHUO_STATUS },
        ],
    },
    {
        id: 'otaru', hubs: ['otaru'], nearKm: 12, label: '札幌 ↔ 小樽',
        options: [
            { mode: 'bus', name: '高速おたる号（円山経由）', operator: '北海道中央バス・JR北海道バス', boarding: SAPPORO_STOP, minutes: [57, 69], perDay: 67, reservation: 'none',
                url: 'https://www.chuo-bus.co.jp/highway/index.cgi?ope=det&n=23&o=1&t=21', statusUrl: CHUO_STATUS },
        ],
    },
    {
        id: 'iwamizawa', hubs: ['iwamizawa'], nearKm: 12, label: '札幌 ↔ 岩見沢',
        options: [
            { mode: 'bus', name: '高速いわみざわ号', operator: '北海道中央バス', boarding: SAPPORO_STOP, minutes: [50, 58], perDay: 32, reservation: 'none',
                note: '岩見沢ターミナル着', url: 'https://www.chuo-bus.co.jp/highway/?t=43&ope=list&o=1', statusUrl: CHUO_STATUS },
        ],
    },
    {
        id: 'takikawa', hubs: ['takikawa'], nearKm: 15, label: '札幌 ↔ 滝川',
        options: [
            { mode: 'bus', name: '高速たきかわ号', operator: '北海道中央バス', boarding: SAPPORO_STOP, minutes: [101, 106], perDay: 7, reservation: 'none',
                url: 'https://www.chuo-bus.co.jp/highway/?t=48&ope=list&o=1', statusUrl: CHUO_STATUS },
        ],
    },
    {
        id: 'asahikawa', hubs: ['asahikawa'], nearKm: 15, label: '札幌 ↔ 旭川',
        options: [
            { mode: 'bus', name: '高速あさひかわ号', operator: '北海道中央バス・JR北海道バス・道北バス', boarding: SAPPORO_STOP, minutes: [125, 125], perDay: 36, reservation: 'none',
                url: 'https://www.chuo-bus.co.jp/highway/?t=170&ope=list&o=1', statusUrl: CHUO_STATUS },
        ],
    },
    {
        id: 'tomakomai', hubs: ['tomakomai'], nearKm: 12, label: '札幌 ↔ 苫小牧',
        options: [
            { mode: 'bus', name: '高速とまこまい号', operator: '北海道中央バス・道南バス', boarding: SAPPORO_STOP, minutes: [97, 101], perDay: 15, reservation: 'none',
                url: 'https://www.chuo-bus.co.jp/highway/?t=150&ope=list&o=1', statusUrl: CHUO_STATUS },
        ],
    },
    {
        id: 'muroran', hubs: ['higashi-muroran', 'muroran', 'noboribetsu'], nearKm: 15, label: '札幌 ↔ 室蘭・登別',
        options: [
            { mode: 'bus', name: '高速白鳥号', operator: '道南バス', boarding: '札幌駅前（7番のりば・屋外）', minutes: [111, 162], perDay: 7, reservation: 'none',
                note: '登別駅前まで約1時間50分、室蘭駅前まで約2時間40分', url: 'https://www.donanbus.co.jp/', statusUrl: 'https://www.donanbus.co.jp/' },
        ],
    },
    {
        id: 'obihiro', hubs: ['obihiro'], nearKm: 30, label: '札幌 ↔ 帯広',
        options: [
            { mode: 'bus', name: 'ポテトライナー', operator: '北海道中央バス・JR北海道バス・北都交通・十勝バス・北海道拓殖バス', boarding: SAPPORO_STOP, minutes: [210, 245], perDay: 11, reservation: 'required',
                note: '冬は4時間前後。満席のことがあるので先に空席を確認', url: 'https://www.chuo-bus.co.jp/highway/?t=87&ope=list&o=1', statusUrl: CHUO_STATUS },
        ],
    },
    {
        id: 'kushiro', hubs: ['kushiro'], nearKm: 30, label: '札幌 ↔ 釧路',
        options: [
            { mode: 'bus', name: 'スターライト釧路号', operator: '北海道中央バス・くしろバス・阿寒バス', boarding: SAPPORO_STOP, minutes: [315, 335], perDay: 4, reservation: 'required',
                url: 'https://www.chuo-bus.co.jp/highway/?t=107&ope=list&o=1', statusUrl: CHUO_STATUS },
            { mode: 'air', name: '飛行機（丘珠 → 釧路）', operator: 'JALグループ（HAC）', boarding: '札幌丘珠空港', perDay: 4, reservation: 'required',
                note: '吹雪の日は欠航も多い。運航状況を先に確認', url: 'https://okadama-airport.co.jp/flight/', statusUrl: 'https://okadama-airport.co.jp/flight/' },
        ],
    },
    {
        id: 'kitami-abashiri', hubs: ['kitami', 'abashiri'], nearKm: 30, label: '札幌 ↔ 北見・網走',
        options: [
            { mode: 'bus', name: 'ドリーミントオホーツク号', operator: '北海道中央バス・北海道北見バス・網走バス', boarding: SAPPORO_STOP, minutes: [280, 395], perDay: 9, reservation: 'required',
                note: '北見まで約4時間40分〜、網走まで約6時間〜（網走行きは1日6本）', url: 'https://www.chuo-bus.co.jp/highway/?t=69&ope=list&o=1', statusUrl: CHUO_STATUS },
            { mode: 'air', name: '飛行機（丘珠 → 女満別）', operator: 'JALグループ（HAC）', boarding: '札幌丘珠空港', perDay: 2, reservation: 'required',
                url: 'https://okadama-airport.co.jp/flight/', statusUrl: 'https://okadama-airport.co.jp/flight/' },
        ],
    },
    {
        id: 'hakodate', hubs: ['hakodate', 'shin-hakodate-hokuto'], nearKm: 25, label: '札幌 ↔ 函館',
        options: [
            { mode: 'bus', name: '高速はこだて号', operator: '北海道中央バス・函館バス', boarding: SAPPORO_STOP, minutes: [320, 365], perDay: 4, reservation: 'required',
                url: 'https://www.chuo-bus.co.jp/highway/?t=129&ope=list&o=1', statusUrl: CHUO_STATUS },
            { mode: 'air', name: '飛行機（丘珠 → 函館）', operator: 'JALグループ（HAC）', boarding: '札幌丘珠空港', perDay: 7, reservation: 'required',
                url: 'https://okadama-airport.co.jp/flight/', statusUrl: 'https://okadama-airport.co.jp/flight/' },
        ],
    },
    {
        id: 'nayoro', hubs: ['nayoro'], nearKm: 25, label: '札幌 ↔ 名寄',
        options: [
            { mode: 'bus', name: '高速なよろ号', operator: '北海道中央バス・道北バス', boarding: SAPPORO_STOP, minutes: [205, 240], perDay: 3, reservation: 'required',
                url: 'https://www.chuo-bus.co.jp/highway/?t=172&ope=list&o=1', statusUrl: CHUO_STATUS },
        ],
    },
    {
        id: 'wakkanai', hubs: ['wakkanai'], nearKm: 30, label: '札幌 ↔ 稚内',
        options: [
            { mode: 'bus', name: 'わっかない号', operator: '北都交通・宗谷バス', boarding: '大通バスセンター（屋内）', minutes: [345, 345], perDay: 5, reservation: 'unknown',
                note: '夜行便は2026年12月1日〜2027年3月19日は運休', url: 'https://www.hokto.co.jp/sapporo-wakkanai/', statusUrl: 'http://www.soyabus.co.jp/traffic/' },
        ],
    },
];

/** 札幌市内で JR が止まったときの地下鉄(路線 → 並行する地下鉄) */
export const SUBWAY: { lineSlugs: string[]; option: AltOption }[] = [
    { lineSlugs: ['gakuen-toshi'], option: { mode: 'subway', name: '地下鉄南北線（さっぽろ ↔ 麻生）', operator: '札幌市交通局', boarding: '地下鉄さっぽろ駅', minutes: [9, 9], reservation: 'none',
        note: '麻生駅からJR新琴似駅は徒歩10分強。その先はバス', url: 'https://www.city.sapporo.jp/st/time/index.html', statusUrl: 'https://x.com/operation_st' } },
    { lineSlugs: ['sapporo-hakodate-chitose', 'airport'], option: { mode: 'subway', name: '地下鉄東西線（大通 ↔ 新さっぽろ・琴似・宮の沢）', operator: '札幌市交通局', boarding: '地下鉄大通駅', minutes: [11, 19], reservation: 'none',
        note: '新さっぽろ駅はJR新札幌駅と直結。手稲方面は宮の沢からバス', url: 'https://www.city.sapporo.jp/st/time/index.html', statusUrl: 'https://x.com/operation_st' } },
];

export interface StayPlace { name: string; detail: string; url: string; kind: 'hotel' | 'wait' }

/** 駅に直結または徒歩数分の宿・待てる場所(公式ページで確認。空室は未確認) */
export const STAYS: Record<string, StayPlace[]> = {
    sapporo: [
        { kind: 'hotel', name: 'JRタワーホテル日航札幌', detail: '札幌駅直結', url: 'https://www.jrhotels.co.jp/tower/' },
        { kind: 'hotel', name: 'JRイン札幌', detail: '札幌駅から徒歩4分', url: 'https://www.jr-inn.jp/sapporo/' },
        { kind: 'wait', name: '札幌駅前通地下歩行空間（チ・カ・ホ）', detail: '屋内・ベンチあり（5:45〜24:30）', url: 'https://www.sapporo-chikamichi.jp/about/' },
    ],
    'shin-chitose-airport': [
        { kind: 'hotel', name: 'エアターミナルホテル', detail: '国内線ターミナル内', url: 'https://www.air-terminal-hotel.jp/' },
        { kind: 'wait', name: '新千歳空港温泉', detail: 'ターミナル内・10:00〜翌9:00（深夜も滞在可）', url: 'https://www.new-chitose-airport-onsen.com/' },
        { kind: 'hotel', name: 'ポルトムインターナショナル北海道', detail: '国際線ターミナル直結', url: 'https://www.portom.jp/jp/' },
    ],
    asahikawa: [
        { kind: 'hotel', name: 'JRイン旭川', detail: '旭川駅北口・イオンモール旭川駅前内', url: 'https://www.jr-inn.jp/asahikawa/' },
        { kind: 'hotel', name: 'KOKO HOTEL 旭川駅前', detail: '旭川駅から徒歩2分', url: 'https://koko-hotels.com/asahikawa_station/' },
    ],
    hakodate: [
        { kind: 'hotel', name: 'JRイン函館', detail: '函館駅に隣接（屋内から行ける）', url: 'https://www.jr-inn.jp/hakodate/' },
        { kind: 'hotel', name: 'ホテルルートイングランティア函館駅前', detail: '函館駅から徒歩1分', url: 'https://www.hotel-grantia.co.jp/hakodate-st/' },
    ],
    obihiro: [
        { kind: 'hotel', name: 'ホテル日航ノースランド帯広', detail: '帯広駅に隣接', url: 'https://www.jrhotels.co.jp/obihiro/' },
        { kind: 'hotel', name: 'ホテルルートイン帯広駅前', detail: '帯広駅から徒歩2分', url: 'https://www.route-inn.co.jp/hotel_list/hokkaido/index_hotel_id_68/' },
    ],
    kushiro: [
        { kind: 'hotel', name: '釧路ロイヤルイン', detail: '釧路駅から徒歩1分', url: 'https://www.royalinn.jp/' },
        { kind: 'hotel', name: 'ホテルルートイン釧路駅前', detail: '釧路駅から徒歩2分', url: 'https://www.route-inn.co.jp/hotel_list/hokkaido/index_hotel_id_242/' },
    ],
    otaru: [
        { kind: 'hotel', name: 'ドーミーインPREMIUM小樽', detail: '小樽駅から徒歩1分', url: 'https://dormy-hotels.com/dormyinn/hotels/otaru/' },
        { kind: 'hotel', name: 'オーセントホテル小樽', detail: '小樽駅から徒歩5分', url: 'https://www.authent.co.jp/' },
    ],
    tomakomai: [
        { kind: 'hotel', name: 'ホテルルートイン苫小牧駅前', detail: '苫小牧駅から徒歩1分', url: 'https://www.route-inn.co.jp/hotel_list/hokkaido/index_hotel_id_245/' },
        { kind: 'hotel', name: '東横INN苫小牧駅前', detail: '苫小牧駅から徒歩1分', url: 'https://www.toyoko-inn.com/search/detail/00108/' },
    ],
    kitami: [
        { kind: 'hotel', name: 'ホテルルートインGrand北見駅前', detail: '北見駅から徒歩1分', url: 'https://www.route-inn.co.jp/hotel_list/hokkaido/index_hotel_id_644/' },
        { kind: 'hotel', name: '東横INN北見駅前', detail: '北見駅から徒歩1分', url: 'https://www.toyoko-inn.com/search/detail/00088/' },
    ],
    abashiri: [
        { kind: 'hotel', name: 'ホテルルートイン網走駅前', detail: '網走駅から徒歩1分', url: 'https://www.route-inn.co.jp/hotel_list/hokkaido/index_hotel_id_502/' },
        { kind: 'hotel', name: '東横INN網走駅前', detail: '網走駅から徒歩1分', url: 'https://www.toyoko-inn.com/search/detail/00003/' },
    ],
    wakkanai: [
        { kind: 'hotel', name: 'ドーミーイン稚内', detail: '稚内駅から徒歩3分', url: 'https://dormy-hotels.com/dormyinn/hotels/wakkanai/' },
    ],
};
