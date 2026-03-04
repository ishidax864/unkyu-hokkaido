// JR北海道 運行情報取得
// 公式サイトのJSON APIから直接取得するように改善
import { logger } from './logger';
import { JRStatus } from './types';

import crawlerConfig from '../data/crawler-config.json';

// JR北海道公式JSON URL (エリア別)
export const JR_JSON_URLS = crawlerConfig.areas;

const BASE_URL = 'https://www3.jrhokkaido.co.jp/webunkou/json/area/area_';

// 路線名と判定キーワード
interface RouteDefinition {
    name: string;
    keywords: string[];
    routeId: string;
    validAreas?: string[]; // エリアフィルタ (01:札幌, 02:道央, 03:道南, 04:道北, 05:道東)
}

// JSONから定義を生成
export const ROUTE_DEFINITIONS: RouteDefinition[] = crawlerConfig.routeMatching.map(rm => ({
    name: rm.id.split('.').pop() === 'chitose' ? '千歳線' :
        rm.id.split('.').pop() === 'hakodate-main' ? '函館本線' :
            rm.id.split('.').pop() === 'hakodate-south' ? '函館本線（道南）' :
                rm.id.split('.').pop() === 'gakuentoshi' ? '学園都市線' :
                    rm.id.split('.').pop() === 'muroran-main' ? '室蘭本線' :
                        rm.id.split('.').pop() === 'soya-main' ? '宗谷本線' :
                            rm.id.split('.').pop() === 'sekihoku-main' ? '石北本線' :
                                rm.id.split('.').pop() === 'furano' ? '富良野線' :
                                    rm.id.split('.').pop() === 'rumoi' ? '留萌本線' :
                                        rm.id.split('.').pop() === 'hidaka' ? '日高本線' :
                                            rm.id.split('.').pop() === 'sekisho' ? '石勝線' :
                                                rm.id.split('.').pop() === 'nemuro-main' ? '根室本線' :
                                                    rm.id.split('.').pop() === 'senmo-main' ? '釧網本線' : '当該路線',
    keywords: rm.keywords,
    routeId: rm.id,
    validAreas: rm.areas
}));

export interface JROperationStatus {
    routeId: string;
    routeName: string;
    status: JRStatus;
    statusText: string;
    cause?: string;
    affectedSection?: string;
    expectedRecovery?: string;
    updatedAt: string;
    rawText?: string; // 生の概況テキスト
    sourceArea?: string; // 情報取得元エリアID
    delayMinutes?: number; // 抽出された遅延分
    recoveryTime?: string; // 抽出された再開見込み時刻 (HH:mm)
    /** 計画運休（前日発表等）かどうか */
    isPlannedSuspension?: boolean;
    /** 計画運休の詳細情報 */
    plannedSuspensionDetails?: string;
}

/**
 * テキストから数値情報を抽出 (ML強化用)
 * 例: "30分程度の遅れ" -> { delayMinutes: 30 }
 * 例: "20時30分頃に運転再開を見込んでいます" -> { recoveryTime: "20:30" }
 */
export function extractNumericalStatus(text: string): { delayMinutes?: number; recoveryTime?: string } {
    const result: { delayMinutes?: number; recoveryTime?: string } = {};

    // 0. 全角数字を半角に変換し、不要な空白を削除
    const normalized = text
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/\s+/g, '');

    // 1. 遅延分の抽出
    const delayMatch = normalized.match(/(\d+)分.*?(?:遅れ|遅延)/);
    if (delayMatch) {
        result.delayMinutes = parseInt(delayMatch[1]);
    }

    // 2. 再開見込み時刻の抽出 (HH時mm分)
    const recoveryMatch = normalized.match(/(\d{1,2})時(\d{1,2})分.*再開/);
    if (recoveryMatch) {
        const h = recoveryMatch[1].padStart(2, '0');
        const m = recoveryMatch[2].padStart(2, '0');
        result.recoveryTime = `${h}:${m}`;
    }

    return result;
}

/**
 * JR北海道の公式JSONから全路線の運行情報を取得
 */
export async function fetchJRHokkaidoStatus(): Promise<JROperationStatus[]> {
    const allItems: JROperationStatus[] = [];
    const now = new Date().toISOString();

    try {
        const results = await Promise.all(
            JR_JSON_URLS.map(async (area) => {
                try {
                    const res = await fetch(`${BASE_URL}${area.id}.json`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        cache: 'no-store'
                    });
                    if (!res.ok) return null;

                    const text = await res.text();
                    const cleanJson = text.replace(/^\uFEFF/, '');
                    const data = JSON.parse(cleanJson) as { today?: { gaikyo?: Array<{ honbun: string }> } };
                    return { name: area.name, id: area.id, data };
                } catch (e) {
                    logger.error(`Area ${area.name} fetch error:`, e);
                    return null;
                }
            })
        );

        for (const result of results) {
            if (!result || !result.data) continue;
            const { name: areaName, id: areaId, data } = result;

            // 概況テキストから運休・遅延を判定
            const gaikyoText = data.today?.gaikyo?.map((g: { honbun: string }) => g.honbun).join(' ') || '';
            const cleanGaikyo = gaikyoText.replace(/<[^>]*>/g, ' ');

            for (const route of ROUTE_DEFINITIONS) {
                // エリアフィルタリング
                if (route.validAreas && !route.validAreas.includes(areaId)) {
                    continue;
                }

                let status: JRStatus = 'normal';
                let description = '平常運転';

                // キーワードが含まれているか
                const hasRouteMention = route.keywords.some(k => cleanGaikyo.includes(k));
                if (!hasRouteMention) continue;

                // コンテキスト判定: キーワードが「通常通り」「通常運転」の文脈で出現しているかチェック
                // 例: "快速エアポートを含む札幌近郊の列車は現時点では通常通りの運転をします"
                // → この場合、エアポート(千歳線)は通常運転なのでsuspendedにしない
                let isExplicitlyNormal = false;
                for (const keyword of route.keywords) {
                    const keyIdx = cleanGaikyo.indexOf(keyword);
                    if (keyIdx === -1) continue;

                    // キーワード周辺の文（。で区切られた一文、または前後100文字）を取得
                    const sentenceStart = cleanGaikyo.lastIndexOf('。', keyIdx) + 1;
                    const sentenceEnd = cleanGaikyo.indexOf('。', keyIdx);
                    const sentence = cleanGaikyo.substring(
                        sentenceStart >= 0 ? sentenceStart : Math.max(0, keyIdx - 100),
                        sentenceEnd >= 0 ? sentenceEnd : Math.min(cleanGaikyo.length, keyIdx + 100)
                    );

                    if (/通常通り|通常運転|平常通り|平常運転/.test(sentence)) {
                        isExplicitlyNormal = true;
                        break;
                    }
                }

                // 公式に「通常通り」と言及されている路線は、明示的にnormalとして登録
                // （area-wide partialチェックによる上書きを防止）
                if (isExplicitlyNormal) {
                    const existing = allItems.find(i => i.routeId === route.routeId);
                    if (!existing) {
                        allItems.push({
                            routeId: route.routeId,
                            routeName: route.name,
                            status: 'normal',
                            statusText: '公式発表により通常運転',
                            updatedAt: now,
                            rawText: cleanGaikyo,
                            sourceArea: `${areaName} (${areaId})`,
                        });
                    }
                    continue;
                }

                // 運休判定
                if (cleanGaikyo.includes('運休') || cleanGaikyo.includes('運転見合わせ') || cleanGaikyo.includes('運転見合せ')) {
                    status = 'suspended';
                    description = '運休・運転見合わせが発生しています';
                } else if (cleanGaikyo.includes('遅れ') || cleanGaikyo.includes('遅延')) {
                    status = 'delay';
                    description = '遅延が発生しています';
                }

                if (status !== 'normal') {
                    // 計画運休判定（「明日」「計画的」「事前」「当初から」「終日」等のキーワード）
                    const isPlanned = /明日|計画的|事前|当初から|終日|運休とします|運休といたし|運転を見合わせる予定|運転を取りやめ/.test(cleanGaikyo);

                    // 重複排除（複数のエリアにまたがる路線の対応）
                    const existing = allItems.find(i => i.routeId === route.routeId);
                    if (!existing || (status === 'suspended' && existing.status !== 'suspended')) {
                        if (existing) {
                            existing.status = status;
                            existing.statusText = description;
                            existing.rawText = cleanGaikyo;
                            existing.sourceArea = `${areaName} (${areaId})`;
                            existing.isPlannedSuspension = isPlanned;
                            if (isPlanned) existing.plannedSuspensionDetails = cleanGaikyo;
                        } else {
                            allItems.push({
                                routeId: route.routeId,
                                routeName: route.name,
                                status,
                                statusText: description,
                                updatedAt: now,
                                rawText: cleanGaikyo,
                                sourceArea: `${areaName} (${areaId})`,
                                isPlannedSuspension: isPlanned,
                                plannedSuspensionDetails: isPlanned ? cleanGaikyo : undefined,
                            });
                        }
                    }
                }
            }
        }

        // 何もなければ平常運転（JR北海道全体として）
        if (allItems.length === 0) {
            allItems.push({
                routeId: 'jr-hokkaido',
                routeName: 'JR北海道',
                status: 'normal',
                statusText: '概ね平常運転です',
                updatedAt: now
            });
        }

        return allItems;
    } catch (error) {
        logger.error('fetchJRHokkaidoStatus major error:', error);
        return getMockJRStatus(); // 最終的なフォールバック
    }
}

// モック運行情報
export function getMockJRStatus(): JROperationStatus[] {
    const now = new Date().toISOString();
    return [
        {
            routeId: 'jr-hokkaido.hakodate-main',
            routeName: '函館本線',
            status: 'normal',
            statusText: '平常運転',
            updatedAt: now,
        }
    ];
}

// 運行情報を予測に反映するための重み付け
export function getJRStatusWeight(status: JRStatus): number {
    switch (status) {
        case 'cancelled': return 100;
        case 'suspended': return 80;
        case 'delay': return 25; // 15 -> 25: 天候リスクと合わせて確実に遅延レベルへ
        default: return 0;
    }
}
