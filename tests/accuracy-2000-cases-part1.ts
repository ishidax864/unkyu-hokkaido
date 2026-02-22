/**
 * 2000件テストケース定義
 */
import { TestCase, makeWeather } from './accuracy-2000-helpers';

const W = makeWeather; // shorthand

// ============ A: 穏やかな天候 (0-20% expected) ============
export const CATEGORY_A: TestCase[] = [
    { id: 'A1', category: 'A-穏やか', description: '快晴・無風', input: { weather: W({ windSpeed: 2, windGust: 4, snowfall: 0, precipitation: 0, snowDepth: 5 }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 15], expectedStatuses: ['平常運転'] },
    { id: 'A2', category: 'A-穏やか', description: '微風・曇り', input: { weather: W({ windSpeed: 6, windGust: 9, snowfall: 0, precipitation: 0 }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 20], expectedStatuses: ['平常運転'] },
    { id: 'A3', category: 'A-穏やか', description: '微雪0.2cm', input: { weather: W({ windSpeed: 4, windGust: 7, snowfall: 0.2, precipitation: 0.5 }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 20], expectedStatuses: ['平常運転'] },
    { id: 'A4', category: 'A-穏やか', description: '夏季平穏', input: { targetDate: '2026-07-15', weather: W({ date: '2026-07-15', tempMax: 28, tempMin: 18, windSpeed: 3, windGust: 5, snowfall: 0, snowDepth: 0, precipitation: 0 }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 10], expectedStatuses: ['平常運転'] },
    { id: 'A5', category: 'A-穏やか', description: '秋季晴天', input: { targetDate: '2026-10-10', targetTime: '10:00', weather: W({ date: '2026-10-10', tempMax: 15, tempMin: 5, windSpeed: 4, windGust: 7, snowfall: 0, snowDepth: 0, precipitation: 0, targetTime: '10:00' }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 12], expectedStatuses: ['平常運転'] },
    { id: 'A6', category: 'A-穏やか', description: '微雨3mm', input: { targetDate: '2026-06-15', weather: W({ date: '2026-06-15', tempMax: 20, tempMin: 12, windSpeed: 5, windGust: 8, snowfall: 0, snowDepth: 0, precipitation: 3, targetTime: '12:00' }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 15], expectedStatuses: ['平常運転'] },
    { id: 'A7', category: 'A-穏やか', description: '風速10+JR正常', input: { weather: W({ windSpeed: 10, windGust: 14, snowfall: 0, precipitation: 0 }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 25], expectedStatuses: ['平常運転'] },
    { id: 'A8', category: 'A-穏やか', description: '春3月穏やか', input: { targetDate: '2026-03-25', weather: W({ date: '2026-03-25', tempMax: 8, tempMin: 0, windSpeed: 5, windGust: 8, snowfall: 0, snowDepth: 3, precipitation: 0 }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 18], expectedStatuses: ['平常運転'] },
    { id: 'A9', category: 'A-穏やか', description: '公式データなし穏やか', input: { weather: W({ windSpeed: 4, windGust: 6, snowfall: 0, precipitation: 0 }), jrStatus: null }, expectedProbRange: [0, 20], expectedStatuses: ['平常運転'] },
    { id: 'A10', category: 'A-穏やか', description: '晩秋穏やか', input: { targetDate: '2026-11-05', weather: W({ date: '2026-11-05', tempMax: 10, tempMin: 2, windSpeed: 6, windGust: 9, snowfall: 0, snowDepth: 0, precipitation: 0 }) }, expectedProbRange: [0, 20], expectedStatuses: ['平常運転'] },
];

// ============ B: 境界域天候 (15-45% expected) ============
export const CATEGORY_B: TestCase[] = [
    { id: 'B1', category: 'B-境界域', description: '風速13(やや強い境界)', input: { weather: W({ windSpeed: 13, windGust: 18, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [10, 70], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'B2', category: 'B-境界域', description: '風速15+JR正常', input: { weather: W({ windSpeed: 15, windGust: 20, snowfall: 0, precipitation: 0 }), jrStatus: { status: 'normal' } }, expectedProbRange: [10, 75], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'B3', category: 'B-境界域', description: '降雪1.5cm(中程度境界)', input: { weather: W({ windSpeed: 5, windGust: 8, snowfall: 1.5, precipitation: 2, snowDepth: 20 }) }, expectedProbRange: [10, 75], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'B4', category: 'B-境界域', description: '風12+雪0.5(複合弱)', input: { weather: W({ windSpeed: 12, windGust: 17, snowfall: 0.5, precipitation: 1, snowDepth: 15 }), jrStatus: { status: 'normal' } }, expectedProbRange: [10, 40], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'B5', category: 'B-境界域', description: '雨15mm中程度', input: { targetDate: '2026-06-15', weather: W({ date: '2026-06-15', tempMax: 18, tempMin: 10, windSpeed: 8, windGust: 12, snowfall: 0, snowDepth: 0, precipitation: 15, targetTime: '12:00' }) }, expectedProbRange: [5, 35], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'B6', category: 'B-境界域', description: '積雪深25cm', input: { weather: W({ windSpeed: 5, windGust: 8, snowfall: 0.5, snowDepth: 25, precipitation: 1 }) }, expectedProbRange: [10, 45], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'B7', category: 'B-境界域', description: '突風20+平均11', input: { weather: W({ windSpeed: 11, windGust: 20, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [15, 65], expectedStatuses: ['平常運転', '遅延', '運転見合わせ'] },
    { id: 'B8', category: 'B-境界域', description: '降雪2cm境界', input: { weather: W({ windSpeed: 6, windGust: 10, snowfall: 2.0, precipitation: 3, snowDepth: 15 }) }, expectedProbRange: [15, 85], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'B9', category: 'B-境界域', description: '風速16+雪0', input: { weather: W({ windSpeed: 16, windGust: 22, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [20, 85], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'B10', category: 'B-境界域', description: '気温0+風12+積雪20', input: { weather: W({ windSpeed: 12, windGust: 16, snowfall: 0.3, snowDepth: 20, precipitation: 0.5, tempMax: 0, tempMin: -5 }) }, expectedProbRange: [5, 45], expectedStatuses: ['平常運転', '遅延'] },
];

// ============ C: 中程度悪天候 (30-75% expected) ============
export const CATEGORY_C: TestCase[] = [
    { id: 'C1', category: 'C-中程度', description: '風速20', input: { weather: W({ windSpeed: 20, windGust: 28, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [35, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'C2', category: 'C-中程度', description: '降雪4cm/h', input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 4, precipitation: 5, snowDepth: 35 }) }, expectedProbRange: [40, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'C3', category: 'C-中程度', description: '風15+雪2(複合)', input: { weather: W({ windSpeed: 15, windGust: 22, snowfall: 2, precipitation: 3, snowDepth: 25 }) }, expectedProbRange: [35, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'C4', category: 'C-中程度', description: '積雪深45cm', input: { weather: W({ windSpeed: 5, windGust: 8, snowfall: 2, snowDepth: 45, precipitation: 3 }) }, expectedProbRange: [40, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'C5', category: 'C-中程度', description: '大雨40mm', input: { targetDate: '2026-08-15', weather: W({ date: '2026-08-15', tempMax: 25, tempMin: 18, windSpeed: 10, windGust: 15, snowfall: 0, snowDepth: 0, precipitation: 40, targetTime: '12:00' }) }, expectedProbRange: [25, 75], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'C6', category: 'C-中程度', description: '風18+雪1', input: { weather: W({ windSpeed: 18, windGust: 25, snowfall: 1, precipitation: 2, snowDepth: 20 }) }, expectedProbRange: [40, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'C7', category: 'C-中程度', description: '降雪3cm+積雪30', input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 3, precipitation: 4, snowDepth: 30 }) }, expectedProbRange: [35, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'C8', category: 'C-中程度', description: '風22+雪0', input: { weather: W({ windSpeed: 22, windGust: 30, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [50, 90], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'C9', category: 'C-中程度', description: '雨30mm+風12', input: { targetDate: '2026-07-15', weather: W({ date: '2026-07-15', tempMax: 22, tempMin: 16, windSpeed: 12, windGust: 18, snowfall: 0, snowDepth: 0, precipitation: 30, targetTime: '12:00' }) }, expectedProbRange: [25, 70], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'C10', category: 'C-中程度', description: '降雪5cm', input: { weather: W({ windSpeed: 6, windGust: 10, snowfall: 5, precipitation: 7, snowDepth: 40 }) }, expectedProbRange: [50, 90], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
];

// ============ D: 極端な悪天候 (70-100% expected) ============
export const CATEGORY_D: TestCase[] = [
    { id: 'D1', category: 'D-極端', description: '暴風27m/s+警報', input: { weather: W({ windSpeed: 27, windGust: 38, snowfall: 1, precipitation: 2, warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [70, 100], expectedStatuses: ['運休', '運転見合わせ'] },
    { id: 'D2', category: 'D-極端', description: '大雪8cm/h+警報', input: { weather: W({ windSpeed: 12, windGust: 18, snowfall: 8, precipitation: 10, snowDepth: 50, warnings: [{ type: '大雪警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [65, 100], expectedStatuses: ['運休', '運転見合わせ'] },
    { id: 'D3', category: 'D-極端', description: '爆弾低気圧(複合警報)', input: { weather: W({ windSpeed: 25, windGust: 40, snowfall: 5, precipitation: 8, snowDepth: 60, warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }, { type: '大雪警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [80, 100], expectedStatuses: ['運休'] },
    { id: 'D4', category: 'D-極端', description: '猛暴風突風45m/s', input: { weather: W({ windSpeed: 30, windGust: 45, snowfall: 3, precipitation: 5, snowDepth: 40, warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [85, 100], expectedStatuses: ['運休'] },
    { id: 'D5', category: 'D-極端', description: '記録的大雪12cm/h', input: { weather: W({ windSpeed: 10, windGust: 15, snowfall: 12, precipitation: 15, snowDepth: 80, warnings: [{ type: '大雪警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [80, 100], expectedStatuses: ['運休'] },
    { id: 'D6', category: 'D-極端', description: '暴風30m/s+大雪6cm', input: { weather: W({ windSpeed: 30, windGust: 42, snowfall: 6, precipitation: 8, snowDepth: 55, warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }, { type: '大雪警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [85, 100], expectedStatuses: ['運休'] },
    { id: 'D7', category: 'D-極端', description: '積雪深100cm+雪3cm', input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 3, snowDepth: 100, precipitation: 4 }) }, expectedProbRange: [65, 100], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'D8', category: 'D-極端', description: '暴風25m/s夏台風', input: { targetDate: '2026-08-20', weather: W({ date: '2026-08-20', tempMax: 20, tempMin: 15, windSpeed: 25, windGust: 38, snowfall: 0, snowDepth: 0, precipitation: 60, targetTime: '12:00', warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-08-20T06:00:00' }] }) }, expectedProbRange: [70, 100], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'D9', category: 'D-極端', description: '大雨80mm+風18', input: { targetDate: '2026-07-10', weather: W({ date: '2026-07-10', tempMax: 22, tempMin: 18, windSpeed: 18, windGust: 28, snowfall: 0, snowDepth: 0, precipitation: 80, targetTime: '12:00', warnings: [{ type: '大雨警報', area: '北海道', issuedAt: '2026-07-10T06:00:00' }] }) }, expectedProbRange: [60, 100], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'D10', category: 'D-極端', description: '氷点下10+風20+雪4', input: { weather: W({ windSpeed: 20, windGust: 30, snowfall: 4, precipitation: 5, snowDepth: 50, tempMax: -5, tempMin: -15 }) }, expectedProbRange: [65, 100], expectedStatuses: ['運転見合わせ', '運休'] },
];

// ============ E: 複合リスク (varied) ============
export const CATEGORY_E: TestCase[] = [
    { id: 'E1', category: 'E-複合', description: '風14+雪1.5(閾値70%×2)', input: { weather: W({ windSpeed: 14, windGust: 20, snowfall: 1.5, precipitation: 2, snowDepth: 15 }) }, expectedProbRange: [25, 65], expectedStatuses: ['遅延', '運転見合わせ'] },
    { id: 'E2', category: 'E-複合', description: '風18+雪3(閾値超×2)', input: { weather: W({ windSpeed: 18, windGust: 25, snowfall: 3, precipitation: 4, snowDepth: 30 }) }, expectedProbRange: [55, 90], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'E3', category: 'E-複合', description: '風12+雪2+雨10', input: { weather: W({ windSpeed: 12, windGust: 18, snowfall: 2, precipitation: 10, snowDepth: 20 }) }, expectedProbRange: [30, 75], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'E4', category: 'E-複合', description: '風20+雪0+積雪40', input: { weather: W({ windSpeed: 20, windGust: 28, snowfall: 0, snowDepth: 40, precipitation: 0 }) }, expectedProbRange: [50, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'E5', category: 'E-複合', description: '風8+雪5+積雪50', input: { weather: W({ windSpeed: 8, windGust: 12, snowfall: 5, snowDepth: 50, precipitation: 7 }) }, expectedProbRange: [55, 85], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'E6', category: 'E-複合', description: '風16+雪1+積雪35', input: { weather: W({ windSpeed: 16, windGust: 23, snowfall: 1, snowDepth: 35, precipitation: 2 }) }, expectedProbRange: [35, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'E7', category: 'E-複合', description: '風10+雪0.5+雨20', input: { weather: W({ windSpeed: 10, windGust: 15, snowfall: 0.5, precipitation: 20, snowDepth: 10, tempMax: 1, tempMin: -2 }) }, expectedProbRange: [15, 65], expectedStatuses: ['平常運転', '遅延', '運転見合わせ'] },
    { id: 'E8', category: 'E-複合', description: '風25+雪2+警報', input: { weather: W({ windSpeed: 25, windGust: 35, snowfall: 2, precipitation: 3, snowDepth: 25, warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-02-20T06:00:00' }] }) }, expectedProbRange: [75, 100], expectedStatuses: ['運休'] },
];

// ============ F: JR公式ステータス ============
export const CATEGORY_F: TestCase[] = [
    { id: 'F1', category: 'F-公式', description: 'JR運休', input: { weather: W({ windSpeed: 20, windGust: 30, snowfall: 3, precipitation: 4 }), jrStatus: { status: 'suspended', statusText: '運転を見合わせています', resumptionTime: '2026-02-20T15:00:00' } }, expectedProbRange: [100, 100], expectedStatuses: ['運休', '運休中'] },
    { id: 'F2', category: 'F-公式', description: 'JR部分運休', input: { weather: W({ windSpeed: 15, windGust: 22, snowfall: 2, precipitation: 3 }), jrStatus: { status: 'partial', statusText: '一部の列車で運休', rawText: '一部の列車で運休・遅延が発生しています' } }, expectedProbRange: [60, 95], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'F3', category: 'F-公式', description: 'JR遅延', input: { weather: W({ windSpeed: 12, windGust: 18, snowfall: 1, precipitation: 1 }), jrStatus: { status: 'delay', statusText: '遅れが生じています' } }, expectedProbRange: [40, 75], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'F4', category: 'F-公式', description: 'JR正常+風18', input: { weather: W({ windSpeed: 18, windGust: 25, snowfall: 0, precipitation: 0 }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 75], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'F5', category: 'F-公式', description: '終日運休', input: { weather: W({ windSpeed: 25, windGust: 38, snowfall: 5, precipitation: 8, snowDepth: 60 }), jrStatus: { status: 'suspended', statusText: '終日運休', rawText: '大雪の影響により終日運転を見合わせています' } }, expectedProbRange: [100, 100], expectedStatuses: ['運休', '運休中'] },
    { id: 'F6', category: 'F-公式', description: 'JR遅延+悪天候', input: { weather: W({ windSpeed: 16, windGust: 23, snowfall: 1, precipitation: 2 }), jrStatus: { status: 'delay', statusText: '遅れが生じています' } }, expectedProbRange: [40, 75], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'F7', category: 'F-公式', description: 'JR正常+穏やか天候', input: { weather: W({ windSpeed: 3, windGust: 5, snowfall: 0, precipitation: 0 }), jrStatus: { status: 'normal' } }, expectedProbRange: [0, 15], expectedStatuses: ['平常運転'] },
    { id: 'F8', category: 'F-公式', description: 'JR区間運休', input: { weather: W({ windSpeed: 18, windGust: 26, snowfall: 2, precipitation: 3 }), jrStatus: { status: 'partial', rawText: '一部区間で運転を見合わせています' } }, expectedProbRange: [60, 95], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
];

// ============ G: 復旧シナリオ ============
const surroundingRecovery = [
    makeWeather({ targetTime: '13:00', windSpeed: 20, windGust: 30, snowfall: 3 }),
    makeWeather({ targetTime: '14:00', windSpeed: 15, windGust: 22, snowfall: 1 }),
    makeWeather({ targetTime: '15:00', windSpeed: 10, windGust: 15, snowfall: 0.5 }),
    makeWeather({ targetTime: '16:00', windSpeed: 8, windGust: 12, snowfall: 0.3 }),
    makeWeather({ targetTime: '17:00', windSpeed: 6, windGust: 9, snowfall: 0 }),
    makeWeather({ targetTime: '18:00', windSpeed: 5, windGust: 8, snowfall: 0 }),
    makeWeather({ targetTime: '19:00', windSpeed: 4, windGust: 6, snowfall: 0 }),
    makeWeather({ targetTime: '20:00', windSpeed: 4, windGust: 6, snowfall: 0 }),
];

export const CATEGORY_G: TestCase[] = [
    { id: 'G1', category: 'G-復旧', description: '復旧1h後', input: { targetTime: '16:00', weather: W({ windSpeed: 8, windGust: 12, snowfall: 0.3, precipitation: 1, targetTime: '16:00', surroundingHours: surroundingRecovery }), jrStatus: { status: 'suspended', statusText: '運転を見合わせています', resumptionTime: '2026-02-20T15:00:00' } }, expectedProbRange: [10, 55], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'G2', category: 'G-復旧', description: '復旧3h後', input: { targetTime: '18:00', weather: W({ windSpeed: 5, windGust: 8, snowfall: 0, precipitation: 0, targetTime: '18:00', surroundingHours: surroundingRecovery }), jrStatus: { status: 'suspended', statusText: '運転を見合わせています', resumptionTime: '2026-02-20T15:00:00' } }, expectedProbRange: [10, 40], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'G3', category: 'G-復旧', description: '復旧直後(chaos)', input: { targetTime: '15:30', weather: W({ windSpeed: 10, windGust: 15, snowfall: 0.5, precipitation: 1, targetTime: '15:30' }), jrStatus: { status: 'suspended', statusText: '運転を見合わせています', resumptionTime: '2026-02-20T15:00:00' } }, expectedProbRange: [60, 100], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'G4', category: 'G-復旧', description: '復旧5h後', input: { targetTime: '20:00', weather: W({ windSpeed: 4, windGust: 6, snowfall: 0, precipitation: 0, targetTime: '20:00', surroundingHours: surroundingRecovery }), jrStatus: { status: 'suspended', statusText: '運転を見合わせています', resumptionTime: '2026-02-20T15:00:00' } }, expectedProbRange: [0, 25], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'G5', category: 'G-復旧', description: '復旧前(10:00)', input: { targetTime: '10:00', weather: W({ windSpeed: 20, windGust: 30, snowfall: 3, precipitation: 4, targetTime: '10:00' }), jrStatus: { status: 'suspended', statusText: '運転を見合わせています', resumptionTime: '2026-02-20T15:00:00' } }, expectedProbRange: [100, 100], expectedStatuses: ['運休', '運休中'] },
    { id: 'G6', category: 'G-復旧', description: '復旧2h後+積雪深', input: { targetTime: '17:00', weather: W({ windSpeed: 6, windGust: 10, snowfall: 0, precipitation: 0, snowDepth: 35, targetTime: '17:00', surroundingHours: surroundingRecovery }), jrStatus: { status: 'suspended', statusText: '運転を見合わせています', resumptionTime: '2026-02-20T15:00:00' } }, expectedProbRange: [15, 45], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'G7', category: 'G-復旧', description: 'chaos+積雪深30(延長)', input: { targetTime: '16:30', weather: W({ windSpeed: 8, windGust: 13, snowfall: 0.5, precipitation: 1, snowDepth: 30, targetTime: '16:30' }), jrStatus: { status: 'suspended', statusText: '運転を見合わせています', resumptionTime: '2026-02-20T15:00:00' } }, expectedProbRange: [30, 80], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'G8', category: 'G-復旧', description: '翌日(復旧影響なし)', input: { targetDate: '2026-02-21', targetTime: '10:00', weather: W({ date: '2026-02-21', windSpeed: 5, windGust: 8, snowfall: 0, precipitation: 0, targetTime: '10:00' }), jrStatus: { status: 'suspended', statusText: '運転を見合わせています', resumptionTime: '2026-02-20T15:00:00' } }, expectedProbRange: [0, 30], expectedStatuses: ['平常運転', '遅延'] },
];

// ============ H: 季節変動 ============
export const CATEGORY_H: TestCase[] = [
    { id: 'H1', category: 'H-季節', description: '真冬1月・風15', input: { targetDate: '2026-01-15', weather: W({ date: '2026-01-15', tempMax: -3, tempMin: -10, windSpeed: 15, windGust: 22, snowfall: 1, snowDepth: 40, precipitation: 2 }) }, expectedProbRange: [30, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'H2', category: 'H-季節', description: '真冬2月・風10', input: { targetDate: '2026-02-10', weather: W({ date: '2026-02-10', tempMax: -5, tempMin: -12, windSpeed: 10, windGust: 15, snowfall: 0.5, snowDepth: 35, precipitation: 1 }) }, expectedProbRange: [15, 65], expectedStatuses: ['平常運転', '遅延', '運転見合わせ'] },
    { id: 'H3', category: 'H-季節', description: '春の嵐3月・風18', input: { targetDate: '2026-03-20', weather: W({ date: '2026-03-20', tempMax: 8, tempMin: 0, windSpeed: 18, windGust: 28, snowfall: 0, snowDepth: 5, precipitation: 5 }) }, expectedProbRange: [20, 85], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'H4', category: 'H-季節', description: '初夏6月・穏やか', input: { targetDate: '2026-06-01', weather: W({ date: '2026-06-01', tempMax: 22, tempMin: 12, windSpeed: 5, windGust: 8, snowfall: 0, snowDepth: 0, precipitation: 2 }) }, expectedProbRange: [0, 10], expectedStatuses: ['平常運転'] },
    { id: 'H5', category: 'H-季節', description: '台風9月・風22', input: { targetDate: '2026-09-10', weather: W({ date: '2026-09-10', tempMax: 20, tempMin: 14, windSpeed: 22, windGust: 32, snowfall: 0, snowDepth: 0, precipitation: 50, warnings: [{ type: '暴風警報', area: '北海道', issuedAt: '2026-09-10T06:00:00' }] }) }, expectedProbRange: [65, 100], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'H6', category: 'H-季節', description: '秋11月・風12+初雪', input: { targetDate: '2026-11-20', weather: W({ date: '2026-11-20', tempMax: 3, tempMin: -2, windSpeed: 12, windGust: 18, snowfall: 1, snowDepth: 5, precipitation: 2 }) }, expectedProbRange: [15, 70], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'H7', category: 'H-季節', description: '年末12月・雪3cm', input: { targetDate: '2026-12-28', weather: W({ date: '2026-12-28', tempMax: -2, tempMin: -8, windSpeed: 10, windGust: 15, snowfall: 3, snowDepth: 30, precipitation: 4 }) }, expectedProbRange: [35, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'H8', category: 'H-季節', description: 'GW5月・穏やか', input: { targetDate: '2026-05-03', weather: W({ date: '2026-05-03', tempMax: 18, tempMin: 8, windSpeed: 6, windGust: 10, snowfall: 0, snowDepth: 0, precipitation: 0 }) }, expectedProbRange: [0, 10], expectedStatuses: ['平常運転'] },
];

// ============ I: 時間帯変動 ============
export const CATEGORY_I: TestCase[] = [
    { id: 'I1', category: 'I-時間帯', description: '朝ラッシュ8時・風13', input: { targetTime: '08:00', weather: W({ windSpeed: 13, windGust: 19, snowfall: 1, precipitation: 1.5, targetTime: '08:00' }) }, expectedProbRange: [15, 85], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'I2', category: 'I-時間帯', description: '夕ラッシュ18時・風15', input: { targetTime: '18:00', weather: W({ windSpeed: 15, windGust: 22, snowfall: 0.5, precipitation: 1, targetTime: '18:00' }) }, expectedProbRange: [15, 85], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'I3', category: 'I-時間帯', description: '深夜1時・風10', input: { targetTime: '01:00', weather: W({ windSpeed: 10, windGust: 15, snowfall: 0.5, precipitation: 0, targetTime: '01:00' }) }, expectedProbRange: [0, 30], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'I4', category: 'I-時間帯', description: '早朝5時・風18', input: { targetTime: '05:00', weather: W({ windSpeed: 18, windGust: 25, snowfall: 2, precipitation: 3, targetTime: '05:00' }) }, expectedProbRange: [30, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
    { id: 'I5', category: 'I-時間帯', description: '昼12時・穏やか', input: { targetTime: '12:00', weather: W({ windSpeed: 5, windGust: 8, snowfall: 0, precipitation: 0 }) }, expectedProbRange: [0, 20], expectedStatuses: ['平常運転'] },
    { id: 'I6', category: 'I-時間帯', description: '朝7時・雪2cm', input: { targetTime: '07:00', weather: W({ windSpeed: 8, windGust: 12, snowfall: 2, precipitation: 3, snowDepth: 20, targetTime: '07:00' }) }, expectedProbRange: [20, 85], expectedStatuses: ['平常運転', '遅延', '運転見合わせ', '運休'] },
    { id: 'I7', category: 'I-時間帯', description: '夜21時・風12', input: { targetTime: '21:00', weather: W({ windSpeed: 12, windGust: 17, snowfall: 0, precipitation: 0, targetTime: '21:00' }) }, expectedProbRange: [5, 65], expectedStatuses: ['平常運転', '遅延', '運転見合わせ'] },
    { id: 'I8', category: 'I-時間帯', description: '朝9時(ラッシュ後)・風16', input: { targetTime: '09:00', weather: W({ windSpeed: 16, windGust: 23, snowfall: 1, precipitation: 2, targetTime: '09:00' }) }, expectedProbRange: [25, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
];

// ============ J: 降水量 ============
export const CATEGORY_J: TestCase[] = [
    { id: 'J1', category: 'J-降水', description: '小雨5mm', input: { targetDate: '2026-06-20', weather: W({ date: '2026-06-20', tempMax: 20, tempMin: 14, windSpeed: 5, windGust: 8, snowfall: 0, snowDepth: 0, precipitation: 5 }) }, expectedProbRange: [0, 15], expectedStatuses: ['平常運転'] },
    { id: 'J2', category: 'J-降水', description: '中雨15mm', input: { targetDate: '2026-07-05', weather: W({ date: '2026-07-05', tempMax: 22, tempMin: 16, windSpeed: 8, windGust: 12, snowfall: 0, snowDepth: 0, precipitation: 15 }) }, expectedProbRange: [5, 40], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'J3', category: 'J-降水', description: '大雨35mm', input: { targetDate: '2026-08-10', weather: W({ date: '2026-08-10', tempMax: 24, tempMin: 18, windSpeed: 10, windGust: 15, snowfall: 0, snowDepth: 0, precipitation: 35 }) }, expectedProbRange: [20, 60], expectedStatuses: ['遅延', '運転見合わせ'] },
    { id: 'J4', category: 'J-降水', description: '豪雨60mm', input: { targetDate: '2026-07-20', weather: W({ date: '2026-07-20', tempMax: 22, tempMin: 18, windSpeed: 12, windGust: 20, snowfall: 0, snowDepth: 0, precipitation: 60, warnings: [{ type: '大雨警報', area: '北海道', issuedAt: '2026-07-20T06:00:00' }] }) }, expectedProbRange: [50, 90], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'J5', category: 'J-降水', description: '記録的大雨100mm', input: { targetDate: '2026-08-05', weather: W({ date: '2026-08-05', tempMax: 24, tempMin: 20, windSpeed: 15, windGust: 25, snowfall: 0, snowDepth: 0, precipitation: 100, warnings: [{ type: '大雨警報', area: '北海道', issuedAt: '2026-08-05T06:00:00' }] }) }, expectedProbRange: [55, 100], expectedStatuses: ['運転見合わせ', '運休'] },
    { id: 'J6', category: 'J-降水', description: '雨25mm+風10', input: { targetDate: '2026-06-25', weather: W({ date: '2026-06-25', tempMax: 18, tempMin: 12, windSpeed: 10, windGust: 15, snowfall: 0, snowDepth: 0, precipitation: 25 }) }, expectedProbRange: [10, 40], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'J7', category: 'J-降水', description: 'みぞれ(雨+雪)', input: { weather: W({ tempMax: 1, tempMin: -2, windSpeed: 8, windGust: 12, snowfall: 0.5, precipitation: 15, snowDepth: 5 }) }, expectedProbRange: [10, 45], expectedStatuses: ['平常運転', '遅延'] },
    { id: 'J8', category: 'J-降水', description: '雨45mm+風15', input: { targetDate: '2026-09-05', weather: W({ date: '2026-09-05', tempMax: 20, tempMin: 15, windSpeed: 15, windGust: 22, snowfall: 0, snowDepth: 0, precipitation: 45 }) }, expectedProbRange: [30, 85], expectedStatuses: ['遅延', '運転見合わせ', '運休'] },
];

export const ALL_CATEGORIES = [
    CATEGORY_A, CATEGORY_B, CATEGORY_C, CATEGORY_D, CATEGORY_E,
    CATEGORY_F, CATEGORY_G, CATEGORY_H, CATEGORY_I, CATEGORY_J,
];
