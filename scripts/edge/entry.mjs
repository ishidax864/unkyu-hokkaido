import {getAdminSupabaseClient} from './client.mjs';
import {runJRCrawler} from '../../lib/crawler.ts';
Deno.serve(async req=>{
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const key=req.headers.get('x-collector-key');
 if(!key||!/^[a-f0-9]{64}$/.test(key))return Response.json({error:'Unauthorized'},{status:401});
 const client=getAdminSupabaseClient();
 const {data:claim,error}=await client.rpc('claim_rail_collection',{provided_secret:key});
 if(error)return Response.json({error:'Collection authorization unavailable'},{status:503});
 if(claim==='unauthorized')return Response.json({error:'Unauthorized'},{status:401});
 if(claim==='busy')return Response.json({success:true,skipped:'Already collected in this interval'});
 if(!claim)return Response.json({error:'Collection claim unavailable'},{status:503});
 // Close out runs whose worker died before writing a finish record, so the monitor shows them as errors.
 await client.from('rail_collection_runs').update({finished_at:new Date().toISOString(),status:'error',summary:{success:false,error:'abandoned: no finish record within 30 minutes'}})
  .eq('status','running').lt('started_at',new Date(Date.now()-30*60e3).toISOString()).neq('id',claim);
 let result;
 let timer;
 // pg_net waits 55s; finish well before that so a hung fetch still leaves a finish record.
 const limit=new Promise(r=>{timer=setTimeout(()=>r({success:false,error:'timeout: collector exceeded 45s'}),45e3);});
 try{ result=await Promise.race([runJRCrawler(),limit]); }
 catch(e){ result={success:false,error:'Collector failed: '+String(e?.message??e).slice(0,200)}; }
 finally{ clearTimeout(timer); }
 const {error:writeError}=await client.from('rail_collection_runs').update({finished_at:new Date().toISOString(),status:result.success?'success':'error',summary:result}).eq('id',claim);
 return Response.json({...result,runId:claim},{status:result.success&&!writeError?200:503});
});
