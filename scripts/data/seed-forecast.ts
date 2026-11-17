/**
 * 収集と同じ処理で、いまの予報を1回だけ保存する(収集側から天気APIに繋がらない時間が続いたときの手動の埋め合わせ)。
 * Usage: npx tsx scripts/data/seed-forecast.ts
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true } as never);
import { createClient } from '@supabase/supabase-js';
import { cacheForecast } from '../../lib/crawler';

async function main() {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    console.log(await cacheForecast(client as never));
}
main();
