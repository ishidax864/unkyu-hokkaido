import { getAdminSupabaseClient } from '@/lib/supabase';
import { JR_JSON_URLS, ROUTE_DEFINITIONS, extractNumericalStatus } from '@/lib/jr-status';
import { logger } from '@/lib/logger';

const BASE_URL = 'https://www3.jrhokkaido.co.jp/webunkou/json/area/area_';

// Exclude keywords (Generic reasons that might not warrant a "Weatehr" classification? Or just keep them?)
// Keeping consistent with previous script
const EXCLUDE_KEYWORDS = ['鹿', '人身', '信号', '車両', '線路支障', '倒木', '点検', '工事'];

export async function runJRCrawler() {
    const supabase = getAdminSupabaseClient();
    if (!supabase) {
        logger.error('❌ Supabase ADMIN client not available');
        return { success: false, error: 'Supabase configuration missing' };
    }

    logger.info('🚀 Starting JR Hokkaido Crawler (Serverless)...');

    const results = [];

    for (const area of JR_JSON_URLS) {
        const url = `${BASE_URL}${area.id}.json`;
        console.log(`📡 Fetching ${area.name}...`);

        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // Handle BOM
            const text = await response.text();
            const json = JSON.parse(text.replace(/^\uFEFF/, ''));

            // 1. Log Raw JSON
            const { data: logData, error: logError } = await supabase
                .from('crawler_logs')
                .insert({
                    area_id: area.id,
                    raw_json: json,
                    status: 'success'
                })
                .select()
                .single();

            if (logError) {
                logger.error(`❌ Failed to log raw JSON for ${area.name}:`, logError);
                continue;
            }

            const gaikyoList = json.today?.gaikyo || [];
            let savedCount = 0;

            for (const item of gaikyoList) {
                const content = (item.honbun || '') + (item.title || '');
                if (!content) continue;

                if (EXCLUDE_KEYWORDS.some(kw => content.includes(kw))) {
                    console.log(`⚠️ Scaling excluded case: ${content.substring(0, 30)}...`);
                    continue;
                }

                let matchedRouteId = null;
                for (const def of ROUTE_DEFINITIONS) {
                    if (def.validAreas && !def.validAreas.includes(area.id)) continue;
                    if (def.keywords.some(kw => content.includes(kw))) {
                        matchedRouteId = def.routeId;
                        break;
                    }
                }

                if (matchedRouteId) {
                    let status = 'normal';
                    if (content.includes('運休') || content.includes('見合')) status = 'suspended';
                    else if (content.includes('遅れ') || content.includes('遅延')) status = 'delayed';

                    if (content.includes('再開') || content.includes('平常')) status = 'normal';

                    let cause = 'weather';
                    if (content.includes('雪')) cause = 'snow';
                    else if (content.includes('風')) cause = 'wind';
                    else if (content.includes('雨')) cause = 'rain';

                    // 🆕 抽出ロジック適用 (ML強化)
                    const { delayMinutes, recoveryTime } = extractNumericalStatus(content);

                    const date = new Date().toISOString().split('T')[0];
                    const time = new Date().toLocaleTimeString('en-US', { hour12: false });

                    const { error: insertError } = await supabase
                        .from('route_status_history')
                        .insert({
                            date: date,
                            time: time,
                            route_id: matchedRouteId,
                            status: status,
                            cause: cause,
                            details: content,
                            crawler_log_id: logData.id,
                            delay_minutes: delayMinutes,
                            recovery_time: recoveryTime
                        });

                    if (insertError) {
                        logger.error(`Failed to insert status for ${matchedRouteId}:`, insertError);
                    } else {
                        savedCount++;
                    }
                }
            }
            results.push({ area: area.name, saved: savedCount });

        } catch (e) {
            logger.error(`❌ Error fetching ${area.name}:`, e);
            await supabase.from('crawler_logs').insert({
                area_id: area.id,
                raw_json: {},
                status: 'error',
                error_message: String(e)
            });
        }
    }

    logger.info('🏁 Crawler finished.', { results });
    return { success: true, results };
}
