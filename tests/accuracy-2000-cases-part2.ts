/**
 * 2000件テストケース定義 Part2 (K-Q)
 */
import { TestCase, makeWeather, ROUTES } from './accuracy-2000-helpers';

const W = makeWeather;

// Deer-risk routes
const DEER_ROUTES = ROUTES.filter(r => ['jr-hokkaido.sassho', 'jr-hokkaido.muroran-main', 'jr-hokkaido.sekihoku-main', 'jr-hokkaido.sekisho', 'jr-hokkaido.soya-main', 'jr-hokkaido.nemuro-main', 'jr-hokkaido.senmo-main', 'jr-hokkaido.furano'].includes(r));

// Coastal routes (high wind vulnerability)
const COASTAL_ROUTES = ['jr-hokkaido.muroran-main', 'jr-hokkaido.hidaka', 'jr-hokkaido.rumoi', 'jr-hokkaido.senmo-main', 'jr-hokkaido.hakodate-south'];

// Mountain routes (high snow vulnerability)
const MOUNTAIN_ROUTES = ['jr-hokkaido.sekihoku-main', 'jr-hokkaido.sekisho', 'jr-hokkaido.furano', 'jr-hokkaido.soya-main'];

// ============ K: 積雪深 ============
export const CATEGORY_K: TestCase[] = [
    { id: 'K1', category: 'K-積雪深', description: '積雪10cm(軽微)', input: { weather: W({ windSpeed: 5, windGust: 8, snowfall: 0, snowDepth: 10, precipitation: 0 }) }, expectedProbRange: [0, 20], expectedStatuses: ['平常運転'] },
    { id: 'K2', category: 'K-積雪深', description: '積雪25cm(中程度)', input: { weather: W({ windSpeed: 5, windGust: 8, snowfall: 0.5, snowDepth: 25, precipitation: 1 }) }, expectedProbRange: [10, 45], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'K3', category: 'K-積雪深', description: '積雪40cm(危険)', input: { weather: W({ windSpeed: 5, windGust: 8, snowfall: 1, snowDepth: 40, precipitation: 2 }) }, expectedProbRange: [30, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'K4', category: 'K-積雪深', description: '積雪60cm+雪2cm', input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 2, snowDepth: 60, precipitation: 3 }) }, expectedProbRange: [50, 85], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'K5', category: 'K-積雪深', description: '積雪80cm+風10', input: { weather: W({ windSpeed: 10, windGust: 15, snowfall: 1, snowDepth: 80, precipitation: 2 }) }, expectedProbRange: [55, 85], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'K6', category: 'K-積雪深', description: '積雪5cm(無視レベル)', input: { weather: W({ windSpeed: 3, windGust: 5, snowfall: 0, snowDepth: 5, precipitation: 0 }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 15], expectedStatuses: ['平常運転'] },
];

// ============ L: 警報シナリオ ============
export const CATEGORY_L: TestCase[] = [
    { id: 'L1', category: 'L-警報', description: '暴風警報のみ(風20)', input: { weather: W({ windSpeed: 20, windGust: 30, snowfall: 0, precipitation: 0, warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [65, 100], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'L2', category: 'L-警報', description: '大雪警報のみ(雪5cm)', input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 5, precipitation: 7, snowDepth: 40, warnings: [{ type: '大雪警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [65, 100], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'L3', category: 'L-警報', description: '大雨警報(雨40mm)', input: { targetDate: '2026-07-15', weather: W({ date: '2026-07-15', tempMax: 22, tempMin: 16, windSpeed: 10, windGust: 15, snowfall: 0, snowDepth: 0, precipitation: 40, warnings: [{ type: '大雨警報', area: '北海道', issuedAt: '2026-07-15T06:00:00' }] }) }, expectedProbRange: [50, 90], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'L4', category: 'L-警報', description: '雷注意報(穏やか天候)', input: { targetDate: '2026-08-01', weather: W({ date: '2026-08-01', tempMax: 30, tempMin: 20, windSpeed: 5, windGust: 10, snowfall: 0, snowDepth: 0, precipitation: 5, warnings: [{ type: '雷注意報', area: '北海道', issuedAt: '2026-08-01T12:00:00' }] }) }, expectedProbRange: [5, 25], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'L5', category: 'L-警報', description: '暴風+大雪+大雨(三重)', input: { weather: W({ windSpeed: 28, windGust: 42, snowfall: 6, precipitation: 20, snowDepth: 55, warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }, { type: '大雪警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }, { type: '大雨警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [85, 100], expectedStatuses: ['運休'] },
    { id: 'L6', category: 'L-警報', description: '暴風警報+JR正常', input: { weather: W({ windSpeed: 20, windGust: 28, snowfall: 0, precipitation: 0, warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }), jrStatus: { status: 'normal' } }, expectedProbRange: [30, 75], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
];

// ============ M: ユーザー報告 ============
export const CATEGORY_M: TestCase[] = [
    { id: 'M1', category: 'M-報告', description: '遅延報告4件', input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 0.5, precipitation: 1 }), crowdsourcedStatus: { consensusStatus: 'delayed', reportCount: 5, last15minCounts: { stopped: 0, delayed: 4, crowded: 1, resumed: 0, total: 5 } } }, expectedProbRange: [15, 70], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'M2', category: 'M-報告', description: '運休報告6件', input: { weather: W({ windSpeed: 15, windGust: 22, snowfall: 2, precipitation: 3 }), crowdsourcedStatus: { consensusStatus: 'stopped', reportCount: 8, last15minCounts: { stopped: 6, delayed: 1, crowded: 0, resumed: 1, total: 8 } } }, expectedProbRange: [40, 95], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'M3', category: 'M-報告', description: '混雑報告のみ', input: { weather: W({ windSpeed: 5, windGust: 8, snowfall: 0, precipitation: 0 }), crowdsourcedStatus: { consensusStatus: 'delayed', reportCount: 3, last15minCounts: { stopped: 0, delayed: 0, crowded: 3, resumed: 0, total: 3 } } }, expectedProbRange: [5, 30], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'M4', category: 'M-報告', description: '再開報告多数', input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 0, precipitation: 0 }), crowdsourcedStatus: { consensusStatus: 'delayed', reportCount: 6, last15minCounts: { stopped: 0, delayed: 1, crowded: 1, resumed: 4, total: 6 } } }, expectedProbRange: [5, 55], expectedStatuses: ['平常運転', '遅延', '運転見合わせ'] },
    { id: 'M5', category: 'M-報告', description: '少数報告(信頼不足)', input: { weather: W({ windSpeed: 5, windGust: 8, snowfall: 0, precipitation: 0 }), crowdsourcedStatus: { consensusStatus: 'delayed', reportCount: 1, last15minCounts: { stopped: 0, delayed: 1, crowded: 0, resumed: 0, total: 1 } } }, expectedProbRange: [0, 20], expectedStatuses: ['平常運転'] },
    { id: 'M6', category: 'M-報告', description: '全停止+悪天候', input: { weather: W({ windSpeed: 20, windGust: 30, snowfall: 3, precipitation: 4 }), crowdsourcedStatus: { consensusStatus: 'stopped', reportCount: 10, last15minCounts: { stopped: 8, delayed: 2, crowded: 0, resumed: 0, total: 10 } } }, expectedProbRange: [70, 100], expectedStatuses: ['運転見合わせ', '運休'] },
];

// ============ N: 地吹雪・特殊条件 ============
export const CATEGORY_N: TestCase[] = [
    { id: 'N1', category: 'N-特殊', description: '地吹雪(低温+風+雪)', input: { weather: W({ windSpeed: 12, windGust: 18, snowfall: 0.5, snowDepth: 30, precipitation: 1, tempMax: -3, tempMin: -8 }) }, expectedProbRange: [25, 65], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'N2', category: 'N-特殊', description: '鹿リスク時間帯', routes: DEER_ROUTES, input: { targetDate: '2026-11-15', targetTime: '17:30', weather: W({ date: '2026-11-15', tempMax: 5, tempMin: -2, windSpeed: 3, windGust: 5, snowfall: 0, snowDepth: 0, precipitation: 0, targetTime: '17:30' }), jrStatus: { status: 'normal' } }, expectedProbRange: [5, 30], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'N3', category: 'N-特殊', description: '深い粉雪+強風', input: { weather: W({ windSpeed: 15, windGust: 22, snowfall: 1, snowDepth: 50, precipitation: 2, tempMax: -8, tempMin: -15 }) }, expectedProbRange: [40, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'N4', category: 'N-特殊', description: '凍結雨(0度+雨)', input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 0, snowDepth: 10, precipitation: 10, tempMax: 1, tempMin: -1 }) }, expectedProbRange: [5, 35], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'N5', category: 'N-特殊', description: '海沿い強風', routes: COASTAL_ROUTES, input: { weather: W({ windSpeed: 18, windGust: 28, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [35, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'N6', category: 'N-特殊', description: '山岳部大雪', routes: MOUNTAIN_ROUTES, input: { weather: W({ windSpeed: 10, windGust: 15, snowfall: 4, snowDepth: 50, precipitation: 5 }) }, expectedProbRange: [45, 90], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
];

// ============ O: エッジケース ============
export const CATEGORY_O: TestCase[] = [
    { id: 'O1', category: 'O-エッジ', description: '天候データなし', input: { weather: null }, expectedProbRange: [0, 10], expectedStatuses: ['平常運転'] },
    { id: 'O2', category: 'O-エッジ', description: '全てゼロ', input: { weather: W({ windSpeed: 0, windGust: 0, snowfall: 0, snowDepth: 0, precipitation: 0, tempMax: 10, tempMin: 5 }) }, expectedProbRange: [0, 10], expectedStatuses: ['平常運転'] },
    { id: 'O3', category: 'O-エッジ', description: '極端な低温(-25度)', input: { weather: W({ windSpeed: 5, windGust: 8, snowfall: 0.5, snowDepth: 40, precipitation: 1, tempMax: -20, tempMin: -25 }) }, expectedProbRange: [15, 60], expectedStatuses: ['平常運転', '遅延', '運転見合わせ'] },
    { id: 'O4', category: 'O-エッジ', description: '全閾値ギリギリ下', input: { weather: W({ windSpeed: 12, windGust: 17, snowfall: 0.4, snowDepth: 24, precipitation: 9 }) }, expectedProbRange: [5, 35], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'O5', category: 'O-エッジ', description: '確率50%(ちょうど中間)', input: { weather: W({ windSpeed: 18, windGust: 25, snowfall: 1, snowDepth: 25, precipitation: 3 }) }, expectedProbRange: [30, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'O6', category: 'O-エッジ', description: '風速0+大雪10cm', input: { weather: W({ windSpeed: 0, windGust: 2, snowfall: 10, snowDepth: 60, precipitation: 12 }) }, expectedProbRange: [60, 100], expectedStatuses: ['運転見合わせ', '運休'] },
];

// ============ P: 段階的悪化 ============
export const CATEGORY_P: TestCase[] = [
    { id: 'P1', category: 'P-段階的', description: '悪化Step1(風10)', input: { weather: W({ windSpeed: 10, windGust: 14, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [0, 25], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'P2', category: 'P-段階的', description: '悪化Step2(風15)', input: { weather: W({ windSpeed: 15, windGust: 21, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [15, 85], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'P3', category: 'P-段階的', description: '悪化Step3(風20)', input: { weather: W({ windSpeed: 20, windGust: 28, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [35, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'P4', category: 'P-段階的', description: '悪化Step4(風25)', input: { weather: W({ windSpeed: 25, windGust: 35, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [60, 100], expectedStatuses: ['運転見合わせ', '運休'] },
];

// ============ Q: 路線特性テスト (select routes) ============
export const CATEGORY_Q: TestCase[] = [
    // 留萌(脆弱1.6, 風閾値14) - 低閾値で反応すべき
    { id: 'Q1', category: 'Q-路線', description: '留萌・風14(閾値)', routes: ['jr-hokkaido.rumoi'], input: { weather: W({ windSpeed: 14, windGust: 20, snowfall: 0.5, snowDepth: 15, precipitation: 1 }) }, expectedProbRange: [30, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 函館本線(脆弱1.0, 風閾値20) - 安定路線
    { id: 'Q2', category: 'Q-路線', description: '函館本線・風14(余裕)', routes: ['jr-hokkaido.hakodate-main'], input: { weather: W({ windSpeed: 14, windGust: 20, snowfall: 0.5, snowDepth: 15, precipitation: 1 }) }, expectedProbRange: [10, 55], expectedStatuses: ['平常運転', '遅延', '運転見合わせ'] },
    // 千歳線(脆弱1.4, 風閾値18) - 空港線
    { id: 'Q3', category: 'Q-路線', description: '千歳・風18(閾値)', routes: ['jr-hokkaido.chitose'], input: { weather: W({ windSpeed: 18, windGust: 25, snowfall: 1, snowDepth: 20, precipitation: 2 }) }, expectedProbRange: [35, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 宗谷本線(脆弱1.8, 風閾値25) - 高脆弱だが強風耐性
    { id: 'Q4', category: 'Q-路線', description: '宗谷・風20(閾値下)', routes: ['jr-hokkaido.soya-main'], input: { weather: W({ windSpeed: 20, windGust: 28, snowfall: 1, snowDepth: 25, precipitation: 2 }) }, expectedProbRange: [25, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 石北本線(脆弱1.6, 雪閾値3) - 山間部
    { id: 'Q5', category: 'Q-路線', description: '石北・雪3cm(閾値)', routes: ['jr-hokkaido.sekihoku-main'], input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 3, snowDepth: 35, precipitation: 4 }) }, expectedProbRange: [40, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 日高本線(脆弱1.4, 風閾値16) - 海沿い
    { id: 'Q6', category: 'Q-路線', description: '日高・風16(閾値)', routes: ['jr-hokkaido.hidaka'], input: { weather: W({ windSpeed: 16, windGust: 23, snowfall: 0.5, snowDepth: 10, precipitation: 1 }) }, expectedProbRange: [30, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 釧網本線(脆弱1.6, 風閾値14) - 観光路線
    { id: 'Q7', category: 'Q-路線', description: '釧網・冬季雪2cm', routes: ['jr-hokkaido.senmo-main'], input: { targetDate: '2026-01-20', weather: W({ date: '2026-01-20', tempMax: -5, tempMin: -12, windSpeed: 10, windGust: 15, snowfall: 2, snowDepth: 30, precipitation: 3 }) }, expectedProbRange: [30, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 石勝線(脆弱1.5, 風閾値16) - 峠越え
    { id: 'Q8', category: 'Q-路線', description: '石勝・風16+雪2', routes: ['jr-hokkaido.sekisho'], input: { weather: W({ windSpeed: 16, windGust: 23, snowfall: 2, snowDepth: 30, precipitation: 3 }) }, expectedProbRange: [40, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 札沼線(脆弱1.1, 風閾値15) - 都市近郊
    { id: 'Q9', category: 'Q-路線', description: '札沼・風15(閾値)', routes: ['jr-hokkaido.sassho'], input: { weather: W({ windSpeed: 15, windGust: 21, snowfall: 1, snowDepth: 20, precipitation: 2 }) }, expectedProbRange: [20, 70], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 室蘭本線(脆弱1.3, 風閾値16) - 海沿い
    { id: 'Q10', category: 'Q-路線', description: '室蘭・風18+雪1', routes: ['jr-hokkaido.muroran-main'], input: { weather: W({ windSpeed: 18, windGust: 25, snowfall: 1, snowDepth: 20, precipitation: 2 }) }, expectedProbRange: [35, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 富良野線(脆弱1.3, 雪閾値3) - 内陸
    { id: 'Q11', category: 'Q-路線', description: '富良野・雪4cm+積雪40', routes: ['jr-hokkaido.furano'], input: { weather: W({ windSpeed: 6, windGust: 10, snowfall: 4, snowDepth: 40, precipitation: 5 }) }, expectedProbRange: [45, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 根室本線(脆弱1.5, 風閾値20) - 長距離
    { id: 'Q12', category: 'Q-路線', description: '根室・風20(閾値)+雪1', routes: ['jr-hokkaido.nemuro-main'], input: { weather: W({ windSpeed: 20, windGust: 28, snowfall: 1, snowDepth: 25, precipitation: 2 }) }, expectedProbRange: [40, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    // 函館本線南(脆弱1.4, 風閾値18)
    { id: 'Q13', category: 'Q-路線', description: '函館南・風18(閾値)', routes: ['jr-hokkaido.hakodate-south'], input: { weather: W({ windSpeed: 18, windGust: 25, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [30, 75], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
];

export const ALL_CATEGORIES_PART2 = [
    CATEGORY_K, CATEGORY_L, CATEGORY_M, CATEGORY_N,
    CATEGORY_O, CATEGORY_P, CATEGORY_Q,
];
