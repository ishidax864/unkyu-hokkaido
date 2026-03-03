/**
 * JR Status Service
 * Supabase からの JR北海道運行ステータス取得を一元管理
 */

import { logger } from '@/lib/logger';
import { JRStatusItem, JRStatus } from '@/lib/types';
import { getAdminSupabaseClient } from '@/lib/supabase';
import { ROUTE_DEFINITIONS } from '@/lib/jr-status';
import { extractResumptionTime } from '@/lib/text-parser';

/**
 * 指定路線の最新 JR 運行ステータスを Supabase から取得
 * - 直近12時間以内のインシデントを検索
 * - 周辺路線の運休・遅延もエリアワイドでチェック
 * - クローラーの鮮度チェック（1時間以内のデータのみ信頼）
 */
export async function fetchJRStatusFromDB(routeId: string): Promise<JRStatusItem | null> {
    try {
        const supabase = getAdminSupabaseClient();
        if (!supabase) {
            logger.error('Missing Supabase credentials');
            return null;
        }

        const routeDef = ROUTE_DEFINITIONS.find(r => r.routeId === routeId);
        const routeName = routeDef?.name || '当該路線';
        const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

        // 1. 直近のインシデント検索
        const { data: incidents, error: dbError } = await supabase
            .from('route_status_history')
            .select('*')
            .eq('route_id', routeId)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(1);

        if (dbError) {
            logger.error('DB Error fetching route_status_history:', dbError);
            return null;
        }

        if (incidents && incidents.length > 0) {
            const latest = incidents[0];
            const description = latest.status === 'suspended'
                ? '運休・見合わせが発生しています'
                : latest.status === 'delayed'
                    ? '遅延が発生しています'
                    : '平常運転';

            const jrStatus: JRStatusItem = {
                routeId,
                routeName,
                status: (latest.status === 'delayed' ? 'delay' : latest.status) as JRStatus,
                description,
                statusText: latest.details || description,
                updatedAt: latest.timestamp || latest.created_at,
                source: 'official',
                rawText: latest.details
            };

            // 'cancelled' → 'suspended' に統一
            if (jrStatus.status === 'cancelled') {
                jrStatus.status = 'suspended';
            }

            // 運行再開見込み時刻の抽出
            if (jrStatus.status === 'suspended' || jrStatus.status === 'delay') {
                const extracted = extractResumptionTime(jrStatus.rawText || jrStatus.statusText || "");
                if (extracted) {
                    jrStatus.resumptionTime = extracted.toISOString();
                }
            }
            return jrStatus;
        }

        // 2. インシデントなし → クローラーの鮮度チェック
        const { data: logs, error: logError } = await supabase
            .from('crawler_logs')
            .select('fetched_at')
            .order('fetched_at', { ascending: false })
            .limit(1);

        if (logError) {
            logger.error('DB Error fetching crawler_logs:', logError);
            return null;
        }

        if (logs && logs.length > 0) {
            const lastFetch = new Date(logs[0].fetched_at).getTime();
            const now = Date.now();

            if (now - lastFetch < 60 * 60 * 1000) {
                // エリアワイドチェック: 周辺路線の状況確認
                if (routeDef && routeDef.validAreas) {
                    const { data: areaIncidents } = await supabase
                        .from('route_status_history')
                        .select('status')
                        .in('route_id', ROUTE_DEFINITIONS.filter(r =>
                            r.validAreas && r.validAreas.some(a => routeDef.validAreas!.includes(a))
                        ).map(r => r.routeId))
                        .gte('created_at', since)
                        .limit(5);

                    const hasAreaIssues = areaIncidents && areaIncidents.some(ai => ai.status !== 'normal');
                    if (hasAreaIssues) {
                        return {
                            routeId,
                            routeName,
                            status: 'partial',
                            description: '周辺路線で運休・遅延が発生しています',
                            statusText: '周辺の運行状況に基づきリスクを算出しています',
                            updatedAt: logs[0].fetched_at,
                            source: 'official'
                        } as JRStatusItem;
                    }
                }

                return {
                    routeId,
                    routeName,
                    status: 'normal',
                    description: '平常運転',
                    statusText: '現在、遅れに関する情報はありません',
                    updatedAt: logs[0].fetched_at,
                    source: 'official'
                };
            } else {
                logger.warn(`JR Status data stale: ${Math.round((now - lastFetch) / 60000)}min old`);
                return null; // 古いデータは信頼できない → 気象予測のみで判定
            }
        }

        return null;
    } catch (e: unknown) {
        logger.error('JR Status Fetch Error:', e);
        return null;
    }
}
