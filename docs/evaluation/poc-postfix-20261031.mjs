import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { assessScanDecision } from './shared/scanResultPolicy.js';
const root='/Users/user/Documents/plant', dataRoot=path.join(root,'server/dataset/public-evaluation');
const ids=['POC-20F'];
const conditions={'PILOT-01':'healthy','PILOT-03':'healthy','PILOT-06':'bacterial spot','PILOT-07':'late blight','PILOT-09':'northern leaf blight','PILOT-16':'apple rust','PILOT-17':'leaf spot','PILOT-18':'black rot','PILOT-19':'mosaic virus','PILOT-20':'corn rust'};
const categories={'PILOT-01':'Corn','PILOT-03':'Fruits','PILOT-06':'Vegetables','PILOT-07':'Vegetables','PILOT-09':'Corn','PILOT-16':'Fruits','PILOT-17':'Vegetables','PILOT-18':'Fruits','PILOT-19':'Vegetables','PILOT-20':'Corn'};
const manifest=JSON.parse(await fs.readFile(path.join(root,'evaluation_dataset_manifest.json'),'utf8'));
const repeat=manifest.selected.find(x=>x.pilotId==='PILOT-20'); manifest.selected.push({...repeat,pilotId:'POC-20F'});
conditions['POC-20F']='corn rust'; categories['POC-20F']='Corn';
const items=ids.map(id=>manifest.selected.find(x=>x.pilotId===id));
if(items.some(x=>!x)||new Set(items.map(x=>x.checksum)).size!==1)throw Error('Invalid POC selection');
const dburl=(await fs.readFile('/private/tmp/agro-pilot-isolated/neon-url','utf8')).trim();
if(!new URL(dburl).hostname.startsWith('ep-still-morning-b5v4lvx8.'))throw Error('Test database endpoint does not match the isolated branch');
const client=new pg.Client({connectionString:dburl,connectionTimeoutMillis:20000});
await client.connect();
await client.query(`create table if not exists public.agricultural_dataset_poc (evaluation_id text primary key, dataset_source text not null, image_reference text not null, reference_crop text not null, reference_condition text not null, predicted_crop text, predicted_condition text, agreement_status text not null, ai_response jsonb, processing_time_ms integer, evaluated_at timestamptz, status text not null, error text)`);
const cropMatch=(ref,pred)=>{
 let p=String(pred||'').toLowerCase(); if(!p)return null;
 const terms=/corn|maize/i.test(ref)?['corn','maize']:/bell pepper/i.test(ref)?['pepper','capsicum']:[ref.toLowerCase().replace(/\s*\(.*?\)/g,'').trim()];
 return terms.some(term=>p.includes(term));
};
const match=(truth,result)=>{
 if(!result?.disease)return 'unassessed';
 const decision=assessScanDecision(result);if(decision.needsReview||decision.requiresRetake||result.needsMoreEvidence)return 'uncertain_or_review';
 const p=String(result.disease).toLowerCase().replace(/[_-]+/g,' ');
 if(truth==='healthy')return result.healthStatus==='healthy'?'match':result.healthStatus==='unhealthy'?'different_or_unclear':'unassessed';
 const aliases={'apple rust':['apple rust','cedar apple rust'],'corn rust':['corn rust','common rust','maize rust'],'leaf spot':['leaf spot'],'northern leaf blight':['northern leaf blight','northern corn leaf blight']};
 return (aliases[truth]||[truth]).some(x=>p.includes(x))?'match':'different_or_unclear';
};
let stop='';
for(const x of items){
 const row={evaluation_id:x.pilotId,dataset_source:x.source,image_reference:x.originalId,reference_crop:x.crop,reference_condition:x.originalLabel,predicted_crop:null,predicted_condition:null,agreement_status:'unassessed',ai_response:null,processing_time_ms:null,evaluated_at:null,status:'not_attempted',error:null,normalized_reference:conditions[x.pilotId],source_reference:x.sourceReference,checksum:x.checksum,dataset_version:x.datasetVersion,category:categories[x.pilotId],crop_match:null};
 if(!stop){
  let started=0;
  try{
   const filename=await fs.realpath(path.join(dataRoot,x.localPath));if(!filename.startsWith(dataRoot+'/'))throw Error('Image path outside dataset');
   const data=await fs.readFile(filename);if(crypto.createHash('sha256').update(data).digest('hex')!==x.checksum)throw Error('Image checksum mismatch');
   const jpeg=data[0]===255&&data[1]===216&&data[2]===255;const png=data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));if(!jpeg&&!png)throw Error('Unsupported image format');
   started=Date.now();row.evaluated_at=new Date().toISOString();
   const response=await fetch('http://127.0.0.1:13002/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({treeImage:`data:${jpeg?'image/jpeg':'image/png'};base64,${data.toString('base64')}`,category:row.category,language:'en',location:'Malaysia',dataConsent:{aiImprovement:false}}),signal:AbortSignal.timeout(185000)});
   row.processing_time_ms=Date.now()-started;let payload=await response.json().catch(()=>({}));
   if(!response.ok||response.status===202){const code=payload.error||`HTTP_${response.status}`;throw Object.assign(Error(String(code)),{httpStatus:response.status});}
   if(!payload.disease||!payload.plantType)throw Error('Incomplete assessment response');
   delete payload.feedbackToken;row.ai_response=payload;row.predicted_crop=payload.plantType;row.predicted_condition=payload.disease;row.agreement_status=match(conditions[x.pilotId],payload);row.crop_match=cropMatch(x.crop,payload.plantType);row.status='completed';
  }catch(e){row.status='failed';row.error=String(e.message||'failed').slice(0,300);row.processing_time_ms=started?Date.now()-started:null;if(e.httpStatus===402||e.httpStatus===429)stop='Stopped after provider/quota error; no further paid requests were attempted';}
 }else row.error=stop;
 await client.query(`insert into public.agricultural_dataset_poc(evaluation_id,dataset_source,image_reference,reference_crop,reference_condition,predicted_crop,predicted_condition,agreement_status,ai_response,processing_time_ms,evaluated_at,status,error) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[row.evaluation_id,row.dataset_source,row.image_reference,row.reference_crop,row.reference_condition,row.predicted_crop,row.predicted_condition,row.agreement_status,row.ai_response,row.processing_time_ms,row.evaluated_at,row.status,row.error]);
 await fs.writeFile('/private/tmp/agro-pilot-isolated/'+x.pilotId+'.json',JSON.stringify(row,null,2),{flag:'wx',mode:0o600});
 console.log(JSON.stringify({case:x.pilotId,status:row.status,elapsedMs:row.processing_time_ms,error:row.error}));
}
const count=await client.query('select dataset_source,count(*)::int as n from public.agricultural_dataset_poc group by dataset_source order by dataset_source');
const rows=await client.query('select * from public.agricultural_dataset_poc order by evaluation_id');
await fs.writeFile('/private/tmp/agro-pilot-isolated/database-export.json',JSON.stringify(rows.rows,null,2),{mode:0o600});
console.log(JSON.stringify({databaseCounts:count.rows,exported:rows.rows.length}));
await client.end();
