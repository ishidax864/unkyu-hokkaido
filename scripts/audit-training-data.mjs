// Read-only audit. Run: node scripts/audit-training-data.mjs
// Writes aggregates locally; never modifies database records or prints credentials.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({path:path.join(root, '.env.local'),quiet:true});
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server credentials are required');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const cutoff=new Date().toISOString();
const known=new Set(JSON.parse(fs.readFileSync(path.join(root,'data/hokkaido-routes.json'),'utf8')).map(r=>r.id));
const fields='id,recorded_at,area_id,route_id,train_status,delay_minutes,recovery_time,cause,status_details,temperature,wind_speed,wind_gust,snowfall,precipitation,snow_depth,weather_code,wind_direction,pressure_msl,month,hour,day_of_week,crawler_log_id';
(async()=>{
 const head=await db.from('ml_training_data').select('id',{count:'exact',head:true}).lte('recorded_at',cutoff);
 if(head.error)throw Error(head.error.message);
 const rows=[];
 for(let offset=0;offset<head.count;offset+=4000){
  const pages=await Promise.all([0,1000,2000,3000].filter(n=>offset+n<head.count).map(async n=>{
   const r=await db.from('ml_training_data').select(fields).lte('recorded_at',cutoff).order('id').range(offset+n,offset+n+999);
   if(r.error)throw Error(r.error.message); return r.data;
  })); rows.push(...pages.flat());
 }
 if (rows.length !== head.count) throw new Error('Incomplete snapshot; refusing to publish audit');
 const counts={};const missing={};const numeric={};const routes={};const monthCounts={};const exact=new Map();const conflicts=new Map();
 let missingProvenance=0,normalNoText=0,unknownRoutes=0,futureText=0,resumptionPlanNormal=0,invalidTime=0,invalidWeather=0;
 const weatherFields=['temperature','wind_speed','wind_gust','snowfall','precipitation','snow_depth','weather_code','wind_direction','pressure_msl'];
 for(const r of rows){
  counts[r.train_status]=(counts[r.train_status]||0)+1; routes[r.route_id]=(routes[r.route_id]||0)+1;
  const month=r.recorded_at.slice(0,7); monthCounts[month]=(monthCounts[month]||0)+1;
  if(!r.crawler_log_id)missingProvenance++;
  if(r.train_status==='normal'&&!r.status_details)normalNoText++;
  if(!known.has(r.route_id))unknownRoutes++;
  if(/明日|あす|翌日/.test(r.status_details||''))futureText++;
  if(r.train_status==='normal'&&/再開.*(?:見込|予定)|(?:見込|予定).*再開/.test(r.status_details||''))resumptionPlanNormal++;
  const d=new Date(r.recorded_at),jst=new Date(d.getTime()+9*3600000);
  if(!Number.isFinite(d.getTime())||r.month!==jst.getUTCMonth()+1||r.hour!==jst.getUTCHours()||r.day_of_week!==jst.getUTCDay())invalidTime++;
  for(const f of weatherFields){
   if(r[f]==null){missing[f]=(missing[f]||0)+1;continue;}
   if(!Number.isFinite(r[f])){invalidWeather++;continue;}
   numeric[f]??={min:Infinity,max:-Infinity};numeric[f].min=Math.min(numeric[f].min,r[f]);numeric[f].max=Math.max(numeric[f].max,r[f]);
  }
  const k=`${r.route_id}|${r.area_id}|${r.recorded_at}|${r.train_status}`;exact.set(k,(exact.get(k)||0)+1);
  const c=`${r.route_id}|${r.recorded_at}`;if(!conflicts.has(c))conflicts.set(c,new Set());conflicts.get(c).add(r.train_status);
 }
 const hist=await db.from('route_status_history').select('id,route_id,date,time,status,cause,details,crawler_log_id').order('date').order('time').limit(1000);
 if(hist.error)throw Error(hist.error.message);
 const samples=await db.from('crawler_logs').select('id,area_id,fetched_at,raw_json,content_hash,status').not('raw_json','is',null).eq('status','success').order('fetched_at',{ascending:false}).limit(20);
 if(samples.error)throw Error(samples.error.message);

 const report={auditedAt:cutoff,scope:'Read-only full ml_training_data snapshot; latest 20 non-null raw feeds; all returned legacy history rows. Automated flags are not adjudicated error counts.',total:head.count,read:rows.length,statuses:counts,months:monthCounts,routes,missing,numeric,flags:{missingProvenance,normalNoText,unknownRoutes,futureText,resumptionPlanNormal,invalidTime,invalidWeather,duplicateRows:[...exact.values()].reduce((s,n)=>s+Math.max(0,n-1),0),conflictingRouteTimes:[...conflicts.values()].filter(s=>s.size>1).length},history:{rows:hist.data.length,latest:hist.data.at(-1)?.date,statuses:hist.data.reduce((c,r)=>(c[r.status]=(c[r.status]||0)+1,c),{}),actualResumptionText:hist.data.filter(r=>/再開しました|再開しています|再開いたしました/.test(r.details||'')).length},rawSamples:samples.data.map(r=>({id:r.id,area:r.area_id,at:r.fetched_at,keys:Object.keys(r.raw_json||{}),hasToday:!!r.raw_json?.today,bulletins:r.raw_json?.today?.gaikyo?.length??null})),examples:{normalWithResumptionPlan:rows.filter(r=>r.train_status==='normal'&&/再開.*(?:見込|予定)|(?:見込|予定).*再開/.test(r.status_details||'')).slice(0,3).map(r=>({id:r.id,at:r.recorded_at,route:r.route_id,text:r.status_details})),futureNotices:rows.filter(r=>/明日|あす|翌日/.test(r.status_details||'')).slice(0,3).map(r=>({id:r.id,at:r.recorded_at,route:r.route_id,status:r.train_status,text:r.status_details}))}};
 const seasons={winter:{months:[12,1,2,3],total:0,statuses:{}},shoulder:{months:[11,4],total:0,statuses:{}},reference:{months:[5,6,7,8,9,10],total:0,statuses:{}}};
 const days=new Map();
 for(const row of rows){
  const date=new Date(Date.parse(row.recorded_at)+9*3600000).toISOString().slice(0,10);
  const month=Number(date.slice(5,7));
  const season=Object.values(seasons).find(s=>s.months.includes(month));
  season.total++;season.statuses[row.train_status]=(season.statuses[row.train_status]||0)+1;
  if(!days.has(date)) days.set(date,new Set());days.get(date).add(row.recorded_at);
 }
 report.seasons=seasons;
 report.collection={first:rows.map(r=>r.recorded_at).sort()[0],last:rows.map(r=>r.recorded_at).sort().at(-1),last14Days:[...days].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14).map(([day,runs])=>({day,runs:runs.size})),normalBaselineAccuracy:(counts.normal||0)/rows.length};
 const destination=path.join(root,'artifacts',`data-audit-${cutoff.replace(/[:.]/g,'-')}.json`);
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.writeFileSync(destination,JSON.stringify(report,null,2));
 console.log(JSON.stringify({destination,total:report.total,statuses:report.statuses,flags:report.flags},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
