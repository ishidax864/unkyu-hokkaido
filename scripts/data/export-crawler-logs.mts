/**
 * crawler_logs の生フィード(raw_json)を読み取り専用で書き出す。区間・路線の対応確認とテスト用データ作成に使う。
 * Usage: npx tsx scripts/data/export-crawler-logs.mts <out.ndjson>
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true } as never);
import { createClient } from '@supabase/supabase-js';
import { createWriteStream } from 'node:fs';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const out = createWriteStream(process.argv[2]);
let last = '1970-01-01T00:00:00Z', n = 0;
for (;;) {
    const { data, error } = await s.from('crawler_logs')
        .select('id,fetched_at,area_id,collector_version,status,raw_json')
        .not('raw_json', 'is', null).gt('fetched_at', last).order('fetched_at').limit(1000);
    if (error) throw error;
    if (!data.length) break;
    for (const r of data) out.write(JSON.stringify(r) + '\n');
    n += data.length;
    last = data[data.length - 1].fetched_at;
}
out.end();
console.log(`exported ${n} rows, last ${last}`);
