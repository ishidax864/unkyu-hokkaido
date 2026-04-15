import 'dotenv/config';
import { getAdminSupabaseClient } from '../lib/supabase';
import fs from 'fs';
import path from 'path';

async function run() {
    const supabase = getAdminSupabaseClient();
    if (!supabase) throw new Error("No supabase client");

    const outPath = path.join(process.cwd(), 'lib/backtest/dataset_real.csv');
    const csvStream = fs.createWriteStream(outPath);
    csvStream.write('route_id,month,wind_speed,wind_dir,wind_gust,snowfall,snow_depth,temperature,pressure,wind_change,pressure_change,status,recovery_time\n');

    let page = 0;
    while(true) {
        const { data, error } = await supabase
            .from('ml_training_data')
            .select('route_id, month, wind_speed, wind_direction, wind_gust, snowfall, snow_depth, temperature, pressure_msl, train_status, recovery_time')
            .range(page * 1000, (page + 1) * 1000 - 1);
        
        if (error) {
            console.error("DB error", error);
            break;
        }
        if (!data || data.length === 0) break;

        for (const row of data) {
            // 気象データがnullの場合はスキップ（APIエラー時のデータ）
            if (row.wind_speed == null) continue;
            
            const wind_dir = row.wind_direction ?? 0;
            const wind_gust = row.wind_gust ?? row.wind_speed;
            const snowfall = row.snowfall ?? 0;
            const snow_depth = row.snow_depth ?? 0;
            const temp = row.temperature ?? 0;
            const pressure = row.pressure_msl ?? 1013;
            // 変化量は簡単化のため0
            const wind_change = 0;
            const pressure_change = 0;
            const status = row.train_status;
            const rec = row.recovery_time ?? 0;

            csvStream.write(`${row.route_id},${row.month},${row.wind_speed},${wind_dir},${wind_gust},${snowfall},${snow_depth},${temp},${pressure},${wind_change},${pressure_change},${status},${rec}\n`);
        }
        page++;
    }
    
    csvStream.end(() => {
        console.log("Export complete! Saved to dataset_real.csv");
        process.exit(0);
    });
}
run();
