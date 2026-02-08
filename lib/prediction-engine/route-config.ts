/**
 * 路線設定ファイル
 * 各路線の脆弱性データを集約管理
 *
 * @module route-config
 * @description
 * JR北海道の各路線に対する運休リスク計算用のパラメータを定義
 *
 * @example
 * import { ROUTE_VULNERABILITY, DEFAULT_VULNERABILITY } from './route-config';
 *
 * const vuln = ROUTE_VULNERABILITY[routeId] || DEFAULT_VULNERABILITY;
 */

import { VulnerabilityData } from '../types';

/**
 * 路線ごとの脆弱性設定
 *
 * @property windThreshold - 運休判断の風速閾値（m/s）
 * @property snowThreshold - 運休判断の積雪閾値（cm）
 * @property vulnerabilityScore - 脆弱性スコア（1.0が標準、高いほど運休しやすい）
 * @property description - 路線の特徴（デバッグ・表示用）
 * @property hasDeerRisk - エゾシカ衝突リスクがあるか
 * @property safeWindDirections - 影響が少ない風向の範囲（度）
 */
export const ROUTE_VULNERABILITY: Record<string, VulnerabilityData> = {
    // ===== 主要幹線 =====
    'jr-hokkaido.hakodate-main': {
        windThreshold: 20,
        snowThreshold: 5,
        vulnerabilityScore: 1.0,
        description: '主要幹線、比較的安定',
        hasDeerRisk: false,
    },

    // ===== 空港・都市連絡線 =====
    'jr-hokkaido.chitose': {
        windThreshold: 18,
        snowThreshold: 4,
        vulnerabilityScore: 1.6,
        description: '空港連絡線、優先的に運行維持',
        hasDeerRisk: false,
        safeWindDirections: [[350, 360], [0, 10]], // 北風は影響少なめ
    },
    'jr-hokkaido.gakuentoshi': {
        windThreshold: 15,
        snowThreshold: 4,
        vulnerabilityScore: 1.1,
        description: '一部単線区間あり',
        hasDeerRisk: true,
    },

    // ===== 海沿い路線（強風リスク高） =====
    'jr-hokkaido.muroran': {
        windThreshold: 16,
        snowThreshold: 4,
        vulnerabilityScore: 1.3,
        description: '海沿い区間で強風の影響受けやすい',
        hasDeerRisk: true,
    },
    'jr-hokkaido.hidaka': {
        windThreshold: 16,
        snowThreshold: 3,
        vulnerabilityScore: 1.4,
        description: '海沿い区間あり',
        hasDeerRisk: true,
    },
    'jr-hokkaido.rumoi': {
        windThreshold: 14,
        snowThreshold: 3,
        vulnerabilityScore: 1.6,
        description: '海岸線に近い・強風・積雪',
        hasDeerRisk: true,
    },

    // ===== 山間部路線（積雪リスク高） =====
    'jr-hokkaido.sekihoku': {
        windThreshold: 20,
        snowThreshold: 3,
        vulnerabilityScore: 1.6,
        description: '山間部多く積雪・強風に弱い',
        hasDeerRisk: true,
    },
    'jr-hokkaido.sekisho': {
        windThreshold: 16,
        snowThreshold: 4,
        vulnerabilityScore: 1.5,
        description: '山間部・峠越え区間（強風・積雪）',
        hasDeerRisk: true,
    },
    'jr-hokkaido.furano': {
        windThreshold: 16,
        snowThreshold: 3,
        vulnerabilityScore: 1.3,
        description: '内陸部、積雪の影響',
        hasDeerRisk: true,
    },

    // ===== 長距離ローカル線 =====
    'jr-hokkaido.soya': {
        windThreshold: 20,
        snowThreshold: 3,
        vulnerabilityScore: 1.8,
        description: '最北端路線、厳寒期は運休多い',
        hasDeerRisk: true,
    },
    'jr-hokkaido.nemuro': {
        windThreshold: 20,
        snowThreshold: 3,
        vulnerabilityScore: 1.5,
        description: '長距離路線、部分運休が発生しやすい',
        hasDeerRisk: true,
    },
    'jr-hokkaido.senmo': {
        windThreshold: 14,
        snowThreshold: 3,
        vulnerabilityScore: 1.6,
        description: '観光路線、冬季は運休しやすい',
        hasDeerRisk: true,
    },
};

/**
 * 未登録路線用のデフォルト脆弱性設定
 */
export const DEFAULT_VULNERABILITY: VulnerabilityData = {
    windThreshold: 15,
    snowThreshold: 5,
    vulnerabilityScore: 1.0,
    description: '（デフォルト設定）',
    hasDeerRisk: false,
};

/**
 * 路線IDから脆弱性データを取得
 */
export function getRouteVulnerability(routeId: string): VulnerabilityData {
    return ROUTE_VULNERABILITY[routeId] || DEFAULT_VULNERABILITY;
}
