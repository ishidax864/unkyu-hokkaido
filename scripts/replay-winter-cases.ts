/** Read-only winter evidence replay. Run node --import tsx scripts/replay-winter-cases.ts.
 * Scores retrospective ERA5 and archived GFS forecasts separately. No fake
 * accuracy: these storms were selected, and there are no verified normal controls.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { weatherScore } from '../lib/forecast/risk';
import { winterCatalogSummary } from '../lib/forecast/historical';
import { calendarDaySnowfall } from '../lib/forecast/accumulations';
import type { WeatherForecast } from '../lib/types';
import catalog from '../data/historical/winter-events.json';
const directories = ['data/historical/weather', 'data/historical/regional-weather'];
const manifest = directories.flatMap(directory => JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'))
    .map((entry: Record<string, unknown>) => ({ ...entry, directory: path.resolve(directory) })));
type Observation = { date: string; snowfallCmCalendarDay: { value: number | null; quality: string } };
const observations = fs.readdirSync('data/historical/jma').filter(file => file.endsWith('.json')).map(file => {
    const record = JSON.parse(fs.readFileSync(path.join('data/historical/jma', file), 'utf8'));
    if (record.kind !== 'station-observation' || record.timeZone !== 'Asia/Tokyo') throw Error(`${file}: unexpected observation type`);
    return record as { station: string; url: string; rows: Observation[] };
});
const windows = manifest.map((entry: { file: string; sha256: string; status: string; directory: string }) => {
    if(entry.status !== 'complete') return {file:entry.file,excluded:'incomplete weather'};
    const bytes=fs.readFileSync(path.join(entry.directory,entry.file));
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256) throw Error(`${entry.file}: checksum mismatch`);
    const record = JSON.parse(bytes.toString());
    const suffix = record.kind === 'forecast-24h' ? '_previous_day1' : '';
    const eventDate = catalog.events.find(event => event.stormId === record.stormId)!.startDate;
    const series = Array.isArray(record.payload) ? record.payload : [record.payload];
    const points = series.map((point: { hourly: Record<string, Array<number | string>> }, index: number) => {
        const h=point.hourly;
        const hours: WeatherForecast[]=h.time.map((time,i)=>({date:String(time).slice(0,10),targetTime:String(time).slice(11,16),weather:'',warnings:[],
            tempMin:Number(h['temperature_2m'+suffix][i]),tempMax:Number(h['temperature_2m'+suffix][i]),
            windSpeed:Number(h['wind_speed_10m'+suffix][i]),windGust:h['wind_gusts_10m'+suffix] ? Number(h['wind_gusts_10m'+suffix][i]) : undefined,
            snowfall:Number(h['snowfall'+suffix][i]),precipitation:Number(h['precipitation'+suffix][i])}));
        const onsetDay=hours.filter(hour=>hour.date===eventDate);
        if(onsetDay.length!==24)throw Error(`${entry.file}: onset day incomplete`);
        // JMA MSM does not have gusts. Do not score an incomplete model as calm.
        const scores=record.model === 'jma_msm' ? null : onsetDay.map(hour=>weatherScore(hour,hours).score);
        const dailySnow = calendarDaySnowfall(hours, eventDate);
        if (dailySnow === null) throw Error(`${entry.file}: calendar-day snowfall incomplete`);
        return {location:record.points[index].name,maxWeatherIndex:scores ? Math.max(...scores) : null,hoursWithHighIndex:scores ? scores.filter(score=>score>=50).length : null,
            maximumSnowCmPerHour:Math.max(...onsetDay.map(h=>h.snowfall!)),snowCmOnCalendarDay:dailySnow,
            maximumWindMs:Math.max(...onsetDay.map(h=>h.windSpeed)),maximumGustMs:scores ? Math.max(...onsetDay.map(h=>h.windGust!)) : null};
    });
    return {stormId:record.stormId,eventDate,kind:record.kind,model:record.model,leadHours:record.leadHours,
        snowfallMethod:record.snowfallMethod ?? null,unsupportedFields:record.unsupportedFields ?? [],points};
});
const observationComparisons = windows.flatMap(window => {
    if (!window.points) return [];
    return window.points.flatMap(point => {
        const station = observations.find(record => record.station === point.location && record.rows.some(row => row.date === window.eventDate));
        const day = station?.rows.find(row => row.date === window.eventDate);
        if (!station || !day || day.snowfallCmCalendarDay.value === null || day.snowfallCmCalendarDay.quality !== 'unflagged') return [];
        return [{ date: window.eventDate, station: point.location, model: window.model, kind: window.kind,
            modelSnowCmCalendarDay: point.snowCmOnCalendarDay, observedSnowCmCalendarDay: day.snowfallCmCalendarDay.value,
            sourceUrl: station.url }];
    });
});
const report={generatedAt:new Date().toISOString(),catalog:winterCatalogSummary(),weatherRows:manifest.reduce((sum:number,e:{availableRows?:number})=>sum+(e.availableRows||0),0),
    accumulationConvention: 'Preceding-hour totals: calendar day includes hour ending 01:00 through next-day 00:00 JST.',
    observationDays: observations.reduce((sum, record) => sum + record.rows.length, 0), observationComparisons,
    cancellationAccuracy:null,recoveryErrorHours:null,
    limitations:['選択した大雪4事例の気象指標再現であり、汎化性能の評価ではない。','ERA5は事後の再解析。事前予測の評価には使わない。','GFSは各時刻に対する24時間前の予報。1回の発表時点の予報一式ではない。','現在のBest Match予報とGFSはモデルが異なる。','気象庁の点観測とモデルの格子推計は異なる。降雪はどちらも日本時間の暦日合計で照合し、任意の連続24時間の最大値と混同しない。','日単位の最大指標を運休開始前の警告成功と数えない。','平常・短時間運休の対照群がないため、運休の見逃し率・誤警報率は未算定。','復旧時刻が正確な7区間は2回の雪害に属する。同じ雪害の区間を独立した標本として復旧推定に投入しない。'],windows};
fs.writeFileSync('artifacts/winter-evidence-replay.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
