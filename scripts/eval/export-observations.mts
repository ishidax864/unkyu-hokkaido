/**
 * 評価用: ml_training_data の運行観測を読み取り専用で書き出す。
 * Usage: npx tsx scripts/eval/export-observations.ts <out.json>
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true } as never);
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const out = process.argv[2];
if (!out) throw new Error('output path required');
const rows: unknown[] = [];
let lastId = 0;
for (;;) {
    const { data, error } = await s.from('ml_training_data')
        .select('id,recorded_at,area_id,route_id,train_status,cause,status_details')
        .gt('id', lastId).order('id').limit(1000);
    if (error) throw error;
    if (!data.length) break;
    rows.push(...data);
    lastId = data[data.length - 1].id;
}
writeFileSync(out, JSON.stringify(rows));
console.log(`exported ${rows.length} rows (last id ${lastId})`);
