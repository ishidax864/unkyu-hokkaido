/**
 * 画面に出す路線(全路線ボードの行)の唯一の定義。
 *
 * - 公式状態は JR の線区(units.ts)そのままの粒度で持つ。推測で細かくしない。
 * - 予報(risk-core)は weatherPoints の各地点で評価し、最も悪い地点を採る。
 *   当てはめに使った地点(旧 ROUTE_COORDINATES)を基本に、現行の運行区間に合わせて補った。
 * - routeIds は駅データ(hokkaido-stations.json の lines)や過去データとの対応に使う旧ID。
 * - 2026-11 時点の現行路線網: 留萌線は2026-04-01に全線廃止、日高線は苫小牧–鵡川、根室線は富良野–新得なし。
 */
import type { UnitId } from './units';

export type Region = '札幌圏' | '道央' | '道南' | '道北' | '道東' | '新幹線';

export interface WeatherPointDef { name: string; lat: number; lon: number }

export interface LineDef {
    /** URL・保存に使う安定ID */
    slug: string;
    name: string;
    /** 補足(区間など) */
    note?: string;
    region: Region;
    units: UnitId[];
    /** 北海道新幹線は線区でなくエリア状態 shin で出る */
    shinkansen?: true;
    routeIds: string[];
    weatherPoints: WeatherPointDef[];
    /** 公式の概況文からこの路線に関するお知らせを選ぶ語 */
    keywords: string[];
}

const P = {
    sapporo: { name: '札幌', lat: 43.0621, lon: 141.3544 },
    otaru: { name: '小樽', lat: 43.2, lon: 140.9833 },
    iwamizawa: { name: '岩見沢', lat: 43.3333, lon: 141.9167 },
    chitose: { name: '千歳', lat: 42.7752, lon: 141.6922 },
    ishikariTobetsu: { name: '石狩当別', lat: 43.2167, lon: 141.35 },
    kutchan: { name: '倶知安', lat: 42.9, lon: 140.75 },
    takikawa: { name: '滝川', lat: 43.5552, lon: 141.908 },
    asahikawa: { name: '旭川', lat: 43.7628, lon: 142.3587 },
    muroran: { name: '室蘭', lat: 42.315, lon: 140.9736 },
    tomakomai: { name: '苫小牧', lat: 42.6333, lon: 141.6 },
    mukawa: { name: '鵡川', lat: 42.5747, lon: 141.9265 },
    hakodate: { name: '函館', lat: 41.7686, lon: 140.7289 },
    oshamambe: { name: '長万部', lat: 42.5, lon: 140.2333 },
    shinHakodate: { name: '新函館北斗', lat: 41.9048, lon: 140.6481 },
    wakkanai: { name: '稚内', lat: 45.4167, lon: 141.6833 },
    nayoro: { name: '名寄', lat: 44.35, lon: 142.3833 },
    kitami: { name: '北見', lat: 43.8, lon: 143.9 },
    kamikawa: { name: '上川（白滝）', lat: 43.7706, lon: 142.365 },
    furano: { name: '富良野', lat: 43.35, lon: 142.3833 },
    shimukappu: { name: '占冠', lat: 43.0, lon: 142.75 },
    obihiro: { name: '帯広', lat: 42.92, lon: 143.2 },
    kushiro: { name: '釧路', lat: 42.9849, lon: 144.3816 },
    nemuro: { name: '根室', lat: 43.3304, lon: 145.5826 },
    abashiri: { name: '網走', lat: 44.02, lon: 144.27 },
} satisfies Record<string, WeatherPointDef>;

export const LINES: LineDef[] = [
    {
        slug: 'airport', keywords: ['エアポート'], name: '快速エアポート', note: '小樽・札幌〜新千歳空港', region: '札幌圏',
        units: ['01:airport', '02:airport'], routeIds: ['jr-hokkaido.chitose', 'jr-hokkaido.hakodate-main'],
        weatherPoints: [P.sapporo, P.otaru, P.chitose],
    },
    {
        slug: 'sapporo-hakodate-chitose', keywords: ['函館線', '千歳線'], name: '函館線・千歳線', note: '札幌近郊（小樽〜岩見沢・札幌〜苫小牧）', region: '札幌圏',
        units: ['01:hakochise'], routeIds: ['jr-hokkaido.hakodate-main', 'jr-hokkaido.chitose'],
        weatherPoints: [P.sapporo, P.otaru, P.iwamizawa, P.chitose],
    },
    {
        slug: 'gakuen-toshi', keywords: ['学園都市線', '札沼線'], name: '学園都市線', note: '札幌〜北海道医療大学', region: '札幌圏',
        units: ['01:gakuen', '02:gakuen'], routeIds: ['jr-hokkaido.sassho', 'jr-hokkaido.gakuentoshi'],
        weatherPoints: [P.ishikariTobetsu],
    },
    {
        slug: 'doo-hakodate-chitose', keywords: ['函館線', '千歳線'], name: '函館線・千歳線', note: '道央（長万部〜小樽・岩見沢〜旭川ほか）', region: '道央',
        units: ['02:hakochise'], routeIds: ['jr-hokkaido.hakodate-main', 'jr-hokkaido.chitose'],
        weatherPoints: [P.otaru, P.kutchan, P.iwamizawa, P.takikawa, P.asahikawa, P.chitose],
    },
    {
        slug: 'muroran', keywords: ['室蘭線', 'すずらん'], name: '室蘭線', note: '長万部〜東室蘭〜苫小牧〜岩見沢', region: '道央',
        units: ['02:muroran'], routeIds: ['jr-hokkaido.muroran-main'],
        weatherPoints: [P.muroran, P.tomakomai],
    },
    {
        slug: 'hidaka', keywords: ['日高線'], name: '日高線', note: '苫小牧〜鵡川', region: '道央',
        units: ['02:hidaka'], routeIds: ['jr-hokkaido.hidaka'],
        weatherPoints: [P.tomakomai, P.mukawa],
    },
    {
        slug: 'hakodate-liner', keywords: ['はこだてライナー'], name: 'はこだてライナー', note: '函館〜新函館北斗', region: '道南',
        units: ['03:hakodateLiner'], routeIds: ['jr-hokkaido.hakodate-south'],
        weatherPoints: [P.hakodate, P.shinHakodate],
    },
    {
        slug: 'donan-hakodate', keywords: ['函館線'], name: '函館線', note: '道南（函館〜長万部）', region: '道南',
        units: ['03:hakodate'], routeIds: ['jr-hokkaido.hakodate-south'],
        weatherPoints: [P.hakodate, P.oshamambe],
    },
    {
        slug: 'soya', keywords: ['宗谷線', 'サロベツ', '特急宗谷'], name: '宗谷線', note: '旭川〜稚内', region: '道北',
        units: ['04:soya'], routeIds: ['jr-hokkaido.soya-main'],
        weatherPoints: [P.wakkanai, P.nayoro],
    },
    {
        slug: 'sekihoku', keywords: ['石北線', 'オホーツク', '特急大雪'], name: '石北線', note: '新旭川〜網走', region: '道北',
        units: ['04:sekihoku'], routeIds: ['jr-hokkaido.sekihoku-main'],
        weatherPoints: [P.kitami, P.kamikawa],
    },
    {
        slug: 'furano', keywords: ['富良野線'], name: '富良野線', note: '旭川〜富良野', region: '道北',
        units: ['04:furano'], routeIds: ['jr-hokkaido.furano'],
        weatherPoints: [P.furano],
    },
    {
        slug: 'sekisho', keywords: ['石勝線', 'おおぞら', 'とかち'], name: '石勝線', note: '南千歳〜新得', region: '道東',
        units: ['05:sekisho'], routeIds: ['jr-hokkaido.sekisho'],
        weatherPoints: [P.shimukappu, P.obihiro],
    },
    {
        slug: 'nemuro', keywords: ['根室線', 'おおぞら', 'とかち'], name: '根室線', note: '滝川〜富良野・新得〜釧路', region: '道東',
        units: ['05:nemuro'], routeIds: ['jr-hokkaido.nemuro-main'],
        weatherPoints: [P.obihiro, P.kushiro],
    },
    {
        slug: 'hanasaki', keywords: ['花咲線'], name: '花咲線', note: '釧路〜根室', region: '道東',
        units: ['05:hanasaki'], routeIds: ['jr-hokkaido.nemuro-main'],
        weatherPoints: [P.kushiro, P.nemuro],
    },
    {
        slug: 'senmo', keywords: ['釧網線'], name: '釧網線', note: '東釧路〜網走', region: '道東',
        units: ['05:senmo'], routeIds: ['jr-hokkaido.senmo-main'],
        weatherPoints: [P.abashiri, P.kushiro],
    },
    {
        slug: 'express', keywords: ['特急'], name: '特急列車', note: '北斗・ライラック・カムイ・宗谷・オホーツク・おおぞら・とかち ほか', region: '道央',
        units: ['01:express', '02:express', '03:express', '04:express', '05:express'], routeIds: [],
        weatherPoints: [],
    },
    {
        slug: 'shinkansen', keywords: ['新幹線'], name: '北海道新幹線', note: '新函館北斗〜新青森', region: '新幹線',
        units: [], shinkansen: true, routeIds: [],
        weatherPoints: [P.shinHakodate],
    },
];

export const LINE_BY_SLUG = new Map(LINES.map(l => [l.slug, l]));

/** 旧ID・旧URLの読み替え。旧IDは保存データ・過去データに残っているため削除しない。 */
export const ROUTE_ID_ALIASES: Record<string, string> = {
    'jr-hokkaido.gakuentoshi': 'jr-hokkaido.sassho',
};
export const canonicalRouteId = (id: string) => ROUTE_ID_ALIASES[id] ?? id;

/** 旧 /route/[routeId] から新しい路線ページへ */
export const LEGACY_ROUTE_TO_SLUG: Record<string, string> = {
    'jr-hokkaido.hakodate-main': 'sapporo-hakodate-chitose',
    'jr-hokkaido.chitose': 'sapporo-hakodate-chitose',
    'jr-hokkaido.sassho': 'gakuen-toshi',
    'jr-hokkaido.gakuentoshi': 'gakuen-toshi',
    'jr-hokkaido.muroran-main': 'muroran',
    'jr-hokkaido.hidaka': 'hidaka',
    'jr-hokkaido.hakodate-south': 'donan-hakodate',
    'jr-hokkaido.soya-main': 'soya',
    'jr-hokkaido.sekihoku-main': 'sekihoku',
    'jr-hokkaido.furano': 'furano',
    'jr-hokkaido.sekisho': 'sekisho',
    'jr-hokkaido.nemuro-main': 'nemuro',
    'jr-hokkaido.senmo-main': 'senmo',
};
