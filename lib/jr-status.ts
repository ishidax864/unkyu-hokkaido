// JR北海道 運行情報取得
// 公式サイトのJSON APIから直接取得するように改善
import { logger } from './logger';
import { JRStatus } from './types';

import crawlerConfig from '../data/crawler-config.json';
import { classifyOfficialObservation, hasExplicitAreaAllClear, specificRouteKeywords, officialPublishedAt } from './official-observation';

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
    routeId: rm.id === 'jr-hokkaido.gakuentoshi' ? 'jr-hokkaido.sassho' : rm.id,
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
    publishedAt?: string;
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
                        cache: 'no-store',
                        signal: AbortSignal.timeout(6000)
                    });
                    if (!res.ok) return null;

                    const text = await res.text();
                    const cleanJson = text.replace(/^\uFEFF/, '');
                    const data = JSON.parse(cleanJson) as { time?: string; today?: { gaikyo?: Array<{ honbun: string }> } };
                    return { name: area.name, id: area.id, data };
                } catch (e) {
                    logger.error(`Area ${area.name} fetch error:`, e);
                    return null;
                }
            })
        );

        if (!results.some(Boolean)) throw new Error('JR official sources unavailable');

        for (const result of results) {
            if (!result || !result.data) continue;
            const { name: areaName, id: areaId, data } = result;
            const publishedAt = officialPublishedAt(data.time);
            if (!publishedAt || Date.parse(now) - Date.parse(publishedAt) > 24 * 3600_000 || Date.parse(publishedAt) > Date.parse(now) + 5 * 60_000) continue;

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
                const hasRouteMention = specificRouteKeywords(route.keywords).some(k => cleanGaikyo.includes(k));
                if (!hasRouteMention) {
                    if (hasExplicitAreaAllClear(cleanGaikyo) && !allItems.some(item => item.routeId === route.routeId)) {
                        allItems.push({ routeId: route.routeId, routeName: route.name, status: 'normal',
                            statusText: '現在、遅れに関する情報はありません', updatedAt: now, publishedAt, rawText: cleanGaikyo });
                    }
                    continue;
                }

                // Keep the recovery sentence attached to its own bulletin. For bulletins
                // mentioning several lines, use only sentences naming this line.
                const routeText = (data.today?.gaikyo || []).flatMap((bulletin: { honbun: string }) => {
                    const text = (bulletin.honbun || '').replace(/<[^>]*>/g, ' ');
                    const mentions = ROUTE_DEFINITIONS.filter(candidate => specificRouteKeywords(candidate.keywords).some(k => text.includes(k)));
                    if (!mentions.some(candidate => candidate.routeId === route.routeId)) return [];
                    return mentions.length === 1 ? [text] : text.split(/(?<=[。！？\n])/).filter(sentence => specificRouteKeywords(route.keywords).some(k => sentence.includes(k)));
                }).join(' ');

                const observation = classifyOfficialObservation(routeText);
                if (observation === 'unknown') continue;
                if (observation === 'normal') {
                    if (!allItems.some(item => item.routeId === route.routeId)) allItems.push({
                        routeId: route.routeId, routeName: route.name, status: 'normal',
                        statusText: '公式の通常運転・再開の案内', updatedAt: now, publishedAt, rawText: routeText,
                    });
                    continue;
                }
                status = observation === 'delayed' ? 'delay' : 'suspended';
                description = observation === 'delayed' ? '遅延が発生しています' : '運休・運転見合わせが発生しています';

                {
                    // 計画運休判定（「明日」「計画的」「事前」「当初から」「終日」等のキーワード）
                    const isPlanned = /明日|計画的|事前|当初から|終日|運休とします|運休といたし|運転を見合わせる予定|運転を取りやめ/.test(cleanGaikyo);

                    // 重複排除（複数のエリアにまたがる路線の対応）
                    const existing = allItems.find(i => i.routeId === route.routeId);
                    if (!existing || (status === 'suspended' && existing.status !== 'suspended')) {
                        if (existing) {
                            existing.status = status;
                            existing.statusText = description;
                            existing.rawText = routeText;
                            existing.publishedAt = publishedAt;
                            existing.sourceArea = `${areaName} (${areaId})`;
                            existing.isPlannedSuspension = isPlanned;
                            if (isPlanned) existing.plannedSuspensionDetails = cleanGaikyo;
                        } else {
                            allItems.push({
                                routeId: route.routeId,
                                routeName: route.name,
                                status,
                                statusText: description,
                                updatedAt: now, publishedAt,
                                rawText: routeText,
                                sourceArea: `${areaName} (${areaId})`,
                                isPlannedSuspension: isPlanned,
                                plannedSuspensionDetails: isPlanned ? cleanGaikyo : undefined,
                            });
                        }
                    }
                }
            }
        }

        // Absence of a route mention is not an explicit normal-operation statement.
        // Failed/empty feeds must never become a synthetic all-clear.
        return allItems.filter(item => item.status !== 'normal' || ROUTE_DEFINITIONS.find(route => route.routeId === item.routeId)?.validAreas?.every(id => {
            const source = results.find(result => result?.id === id);
            const published = officialPublishedAt(source?.data.time);
            if (!published || Date.parse(now) - Date.parse(published) > 24 * 3600_000) return false;
            const text = source?.data.today?.gaikyo?.map(bulletin => bulletin.honbun).join(' ') || '';
            // A regional all-clear cannot settle an affected line in another area.
            return hasExplicitAreaAllClear(text);
        }));
    } catch (error) {
        logger.error('fetchJRHokkaidoStatus major error:', error);
        throw error;
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
