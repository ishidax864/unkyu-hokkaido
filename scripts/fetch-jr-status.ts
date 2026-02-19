import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Supabase Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

import { ROUTE_DEFINITIONS, JR_JSON_URLS as AREAS } from '../lib/jr-status';

const EXCLUDE_KEYWORDS = [
    "鹿",
    "人身",
    "信号",
    "車両",
    "線路支障",
    "倒木",
    "点検",
    "工事"
];

async function fetchAreaStatus(area: typeof AREAS[0]) {
    console.log(`📡 Fetching ${area.name}...`);
    try {
        const response = await fetch(area.url);
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
            console.error(`❌ Failed to log raw JSON for ${area.name}:`, logError);
            return;
        }

        const gaikyoList = json.today?.gaikyo || [];

        for (const item of gaikyoList) {
            const text = (item.honbun || '') + (item.title || '');
            if (!text) continue;

            if (EXCLUDE_KEYWORDS.some(kw => text.includes(kw))) {
                console.log(`⚠️ Scaling excluded case: ${text.substring(0, 30)}...`);
                continue;
            }

            const matchedRouteIds: string[] = [];
            for (const def of ROUTE_DEFINITIONS) {
                if (def.validAreas && !def.validAreas.includes(area.id)) continue;
                if (def.keywords.some(kw => text.includes(kw))) {
                    matchedRouteIds.push(def.routeId);
                }
            }

            if (matchedRouteIds.length > 0) {
                // 🆕 データのクリーンアップ（<BR>タグの除去）
                const sanitizedDetails = text.replace(/<BR>/gi, '\n').trim();

                let status = 'normal';
                if (text.includes('運休') || text.includes('見合')) status = 'suspended';
                else if (text.includes('遅れ') || text.includes('遅延')) status = 'delayed';

                // 🆕 「再開」を含んでいても、「見込み」や「予定」の場合は 'suspended' を維持する
                const isOnlyEstimation = (text.includes('再開') || text.includes('平常')) &&
                    (text.includes('見込み') || text.includes('予定') || text.includes('計画'));

                if (!isOnlyEstimation && (text.includes('再開') || text.includes('平常'))) {
                    status = 'normal';
                }

                let cause = 'weather';
                if (text.includes('雪')) cause = 'snow';
                else if (text.includes('風')) cause = 'wind';
                else if (text.includes('雨')) cause = 'rain';

                const date = new Date().toISOString().split('T')[0];
                const time = new Date().toLocaleTimeString('en-US', { hour12: false });

                for (const routeId of matchedRouteIds) {
                    const { error: insertError } = await supabase
                        .from('route_status_history')
                        .insert({
                            date: date,
                            time: time,
                            route_id: routeId,
                            status: status,
                            cause: cause,
                            details: sanitizedDetails,
                            crawler_log_id: logData.id
                        });

                    if (insertError) console.error(`Failed to insert status for ${routeId}:`, insertError);
                    else console.log(`✅ Saved: [${routeId}] ${status} (${cause})`);
                }
            }
        }

    } catch (e) {
        console.error(`❌ Error fetching ${area.name}:`, e);
        // Try to log error if table exists, otherwise just console log
        try {
            await supabase.from('crawler_logs').insert({
                area_id: area.id,
                raw_json: {},
                status: 'error',
                error_message: String(e)
            });
        } catch (dbError) {
            console.error('Failed to log error to DB:', dbError);
        }
    }
}

async function main() {
    console.log('🚀 Starting JR Hokkaido Crawler...');
    await Promise.all(AREAS.map(area => fetchAreaStatus(area)));
    console.log('🏁 Crawler finished.');
}

main();
