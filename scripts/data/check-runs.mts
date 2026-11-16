/** 直近の収集実行を表示する(読み取り専用)。 Usage: npx tsx scripts/data/check-runs.mts */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true } as never);
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data, error } = await s.from('rail_collection_runs').select('started_at,finished_at,status,summary').order('started_at', { ascending: false }).limit(4);
if (error) throw error;
console.log('now', new Date().toISOString());
for (const r of data) console.log(r.started_at.slice(0, 19), r.status, JSON.stringify({ wa: r.summary?.weatherAttempts, missing: r.summary?.weatherMissing, err: r.summary?.error, ml: r.summary?.ml }));
