// Public data only. node scripts/backfill-winter-weather.mjs [--refresh]
// ERA5 is retrospective reanalysis; previous_day1 is fixed 24h lead forecast.
// Neither source is treated as an observed JR operating label.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const runFile=promisify(execFile);
async function fetchPayload(url) {
    try {
        const response=await fetch(url,{signal:AbortSignal.timeout(15_000)});
        if(!response.ok) throw Error(`HTTP ${response.status}`);
        return await response.json();
    } catch {
        // urllib supports system HTTPS proxies on machines where Node direct fetch fails.
        const {stdout}=await runFile(process.env.WINTER_BACKFILL_PYTHON || 'python3',['-c','import urllib.request,sys; print(urllib.request.urlopen(sys.argv[1],timeout=25).read().decode())',url],{timeout:30000,maxBuffer:10*1024*1024});
        return JSON.parse(stdout);
    }
}
const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'data/historical/weather');
const windows = JSON.parse(await fs.readFile(path.join(root, 'data/historical/weather-windows.json'), 'utf8'));
const fields = ['temperature_2m', 'precipitation', 'snowfall', 'wind_speed_10m', 'wind_gusts_10m'];
await fs.mkdir(directory, {recursive:true});
const manifest = [];
for (const window of windows) {
    for (const kind of ['reanalysis', ...(window.start >= '2024-01-01' ? ['forecast-24h'] : [])]) {
        const suffix = kind === 'forecast-24h' ? '_previous_day1' : '';
        const params = new URLSearchParams({
            latitude: window.points.map(p=>p.lat).join(','), longitude:window.points.map(p=>p.lon).join(','),
            start_date: window.start, end_date:window.end, timezone:'Asia/Tokyo', wind_speed_unit:'ms',
            hourly:fields.map(f=>f+suffix).join(','), models:kind === 'reanalysis' ? 'era5' : 'gfs_global',
        });
        const url = `${kind === 'reanalysis' ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://previous-runs-api.open-meteo.com/v1/forecast'}?${params}`;
        const filename = `${window.stormId}-${kind}.json`;
        let record;
        try { if (!process.argv.includes('--refresh')) record = JSON.parse(await fs.readFile(path.join(directory,filename),'utf8')); } catch { /* fetch absent cache */ }
        if (record && record.url !== url) throw Error(`${filename}: cached source differs; archive it before refreshing`);
        if (!record) {
            let payload;
            try {
                payload = await fetchPayload(url);
            } catch (error) {
                const failed={file:filename,stormId:window.stormId,kind,status:'unavailable',reason:error.message,url};
                manifest.push(failed); console.log(JSON.stringify(failed));
                await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
                process.exitCode=1; continue;
            }
            record = {stormId:window.stormId, kind, model:kind === 'reanalysis' ? 'era5' : 'gfs_global', leadHours:kind === 'reanalysis' ? null : 24, fetchedAt:new Date().toISOString(), url, points:window.points, payload};
        }
        const series = Array.isArray(record.payload) ? record.payload : [record.payload];
        if (series.length !== window.points.length) throw Error(`${filename}: point count mismatch`);
        const expectedHours = (Date.parse(window.end)-Date.parse(window.start))/3600000+24;
        let availableRows=0,missingRows=0;
        const missingByField=Object.fromEntries(fields.map(field=>[field,0]));
        for (const point of series) {
            if (point.utc_offset_seconds !== 32400 || point.hourly?.time.length !== expectedHours) throw Error(`${filename}: time coverage mismatch`);
            for (const [field,unit] of [['wind_speed_10m','m/s'],['wind_gusts_10m','m/s'],['snowfall','cm'],['precipitation','mm']]) {
                if (point.hourly_units[field+suffix] !== unit) throw Error(`${filename}: unit mismatch for ${field}`);
            }
            for (let i=0;i<expectedHours;i++) {
                for (const field of fields) if (!Number.isFinite(point.hourly[field+suffix]?.[i])) missingByField[field]++;
                if (fields.every(field=>Number.isFinite(point.hourly[field+suffix]?.[i]))) availableRows++; else missingRows++;
            }
        }
        if (!availableRows) process.exitCode=1;
        const body = JSON.stringify(record)+'\n';
        await fs.writeFile(path.join(directory,filename), body);
        const item={file:filename,stormId:window.stormId,kind,model:record.model,leadHours:record.leadHours,points:series.length,expectedHours,availableRows,missingRows,missingByField,status:missingRows?'incomplete':'complete',sha256:crypto.createHash('sha256').update(body).digest('hex'),fetchedAt:record.fetchedAt,url};
        manifest.push(item); console.log(JSON.stringify({file:filename,availableRows,missingRows}));
        // Incremental manifest makes successful windows inspectable if a later source fails.
        await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    }
}
