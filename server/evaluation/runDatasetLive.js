import { readFile, realpath } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import pg from 'pg';
import { createEvaluationImageStore, imageObjectKey } from './imageStore.js';
import { compareCondition, farmerCategory } from './datasetLabels.js';
import { assessScanDecision } from '../../shared/scanResultPolicy.js';

// This runner is for an explicitly selected isolated Neon branch and loopback server.
const { EVALUATION_DATABASE_URL_FILE:dbFile, EVALUATION_DATABASE_HOST:host, EVALUATION_IMAGE_DIR:rootArg, OPENROUTER_API_KEY:key, EVALUATION_RUN_ID:runId }=process.env;
if ((!dbFile && !process.env.DATABASE_URL) || !host || !key || !runId || process.env.EVALUATION_COST_APPROVED !== 'true') throw Error('Isolated database, provider key, run ID and cost approval are required');
// EVALUATION_SAMPLE=N assesses N not-yet-assessed reference images (balanced by source, varied by label)
// instead of re-running the ten original POC cases. EVALUATION_DRY_RUN=true prints the selection only.
const sample=Number(process.env.EVALUATION_SAMPLE || 0), dryRun=process.env.EVALUATION_DRY_RUN === 'true';
if(!Number.isInteger(sample) || sample<0 || sample>100) throw Error('EVALUATION_SAMPLE must be 0-100');
const usageCap=Number(process.env.EVALUATION_USAGE_CAP_USD || 0.90);
if(!Number.isFinite(usageCap) || usageCap<=0 || usageCap>5) throw Error('EVALUATION_USAGE_CAP_USD must be between 0 and 5');
// EVALUATION_SEND_CROP=true sends the reference crop name as a farmer-stated crop (never the disease label).
const sendCrop=process.env.EVALUATION_SEND_CROP === 'true';
const apiUrl=process.env.EVALUATION_API_URL || 'http://127.0.0.1:13002';
if(!['127.0.0.1','localhost'].includes(new URL(apiUrl).hostname)) throw Error('Assessment API must be loopback');
const connectionString=process.env.DATABASE_URL?.trim() || (await readFile(dbFile,'utf8')).trim();
if (new URL(connectionString).hostname !== host || host.includes('-pooler')) throw Error('Isolated database host mismatch');
const root=rootArg ? await realpath(rootArg) : null;
const client=new pg.Client({connectionString,connectionTimeoutMillis:20000});
const usage=async()=>{
 const response=await fetch('https://openrouter.ai/api/v1/key',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
 if(!response.ok) throw Error('Cannot verify OpenRouter usage');
 const data=(await response.json()).data;
 if(!Number.isFinite(data?.usage)) throw Error('OpenRouter usage unavailable');
 return data.usage;
};
const labels={'PILOT-01':'healthy','PILOT-03':'healthy','PILOT-06':'bacterial spot','PILOT-07':'late blight','PILOT-09':'northern leaf blight','PILOT-16':'apple rust','PILOT-17':'leaf spot','PILOT-18':'black rot','PILOT-20':'corn rust','POC-19R':'mosaic virus'};
const original=['PILOT-01','PILOT-03','PILOT-06','PILOT-07','PILOT-09','PILOT-16','PILOT-17','PILOT-18','PILOT-20','POC-19R'];
try {
 await client.connect();
 let refs;
 if(sample){
  // EVALUATION_RERUN_OF=<run id> re-assesses exactly that run's images for a before/after comparison.
  const rerunOf=process.env.EVALUATION_RERUN_OF || null;
  const candidates=await client.query(`select i.*, null as baseline_id, row_number() over (partition by i.source, i.original_label order by md5(i.checksum)) rn
   from public.agricultural_reference_images i where i.storage_key is not null
   and (case when $1::text is null then not exists (select 1 from public.agricultural_dataset_assessments a where a.image_checksum=i.checksum and a.completed)
        else exists (select 1 from public.agricultural_dataset_assessments a where a.image_checksum=i.checksum and a.run_id=$1 and a.completed) end)
   order by rn, md5(i.checksum)`,[rerunOf]);
  // EVALUATION_EXCLUDE: comma-separated checksum prefixes withheld after visual review (watermarks, printed labels).
  const excluded=(process.env.EVALUATION_EXCLUDE || '').split(',').map(x=>x.trim()).filter(Boolean);
  // EVALUATION_LABEL_FILTER (case-insensitive regex on the reference label) and EVALUATION_SOURCE narrow targeted checks.
  const labelFilter=process.env.EVALUATION_LABEL_FILTER ? new RegExp(process.env.EVALUATION_LABEL_FILTER,'i') : null, onlySource=process.env.EVALUATION_SOURCE || null;
  candidates.rows=candidates.rows.filter(r=>!excluded.some(prefix=>r.checksum.startsWith(prefix)) && (!labelFilter || labelFilter.test(r.original_label)) && (!onlySource || r.source===onlySource));
  const picked=[], per=Math.ceil(sample/2);
  for(const source of ['PlantVillage','PlantDoc']) picked.push(...candidates.rows.filter(r=>r.source===source).slice(0,per));
  for(const r of candidates.rows) if(picked.length<sample && !picked.includes(r)) picked.push(r);
  refs={rows:picked.slice(0,sample)};
  if(dryRun){for(const r of refs.rows)console.log(JSON.stringify({source:r.source,crop:r.crop,label:r.original_label,storage:r.storage_key}));process.exit(0);}
 } else {
  refs=await client.query(`select i.*, a.id as baseline_id from public.agricultural_reference_images i join public.agricultural_dataset_assessments a on a.image_checksum=i.checksum where a.run_id='original-poc-baseline' and a.id=any($1::text[]) order by a.id`,[original]);
  if(refs.rows.length!==10) throw Error(`Expected 10 original cases, found ${refs.rows.length}`);
 }
 const initial=await usage();console.log(JSON.stringify({runId,images:refs.rows.length,usageBefore:initial}));
 for(const item of refs.rows){
  const id=`${runId}:${item.baseline_id || item.checksum.slice(0,16)}`;
  const existing=await client.query('select id from public.agricultural_dataset_assessments where id=$1',[id]);
  if(existing.rows.length){console.log(JSON.stringify({id,status:'already_recorded'}));continue;}
  const spent=await usage();
  // Stop once cumulative key usage passes the approved cap (default $0.90; EVALUATION_USAGE_CAP_USD
  // raises it only with explicit approval). A conservative stop check, not a provider-enforced cap.
  if(spent>usageCap){console.log(JSON.stringify({stopped:'usage_cap',usage:spent,cap:usageCap}));break;}
  let image;
  if (item.storage_key) {
   if(item.storage_key!==imageObjectKey(item.source,item.filename))throw Error('Invalid evaluation image reference');
   image=await createEvaluationImageStore().get(item.storage_key,item.checksum);
  } else {
   if (!root) throw Error('Evaluation image storage is not configured');
   const folder=item.source==='PlantVillage'?'plantvillage':'plantdoc';
   const file=await realpath(path.join(root,folder,item.filename));
   if(!file.startsWith(root+path.sep)) throw Error('Image outside evaluation store');
   image=await readFile(file);
  }
  if(createHash('sha256').update(image).digest('hex')!==item.checksum)throw Error('Image checksum mismatch');
  const mime=image.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))?'image/jpeg':image.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))?'image/png':null;
  if(!mime)throw Error('Unsupported image');
  const start=Date.now();let payload=null,completed=false,agreement='unassessed';
  try {
   const response=await fetch(`${apiUrl}/api/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scanId:randomUUID(),treeImage:`data:${mime};base64,${image.toString('base64')}`,category:sample?farmerCategory(item.crop):'Vegetables',...(sample&&sendCrop?{crop:item.crop}:{}),language:'en',location:'Malaysia',dataConsent:{aiImprovement:false}}),signal:AbortSignal.timeout(185000)});
   payload=await response.json(); if(!response.ok || !payload.disease || !payload.plantType)throw Error(payload.error || `HTTP_${response.status}`);
   delete payload.feedbackToken;completed=true;
   // Conservative comparison: uncertain responses are never counted as incorrect.
   if(sample){const d=assessScanDecision(payload);agreement=compareCondition(item.original_label,payload,Boolean(d.needsReview||d.requiresRetake||payload.needsMoreEvidence));}
   else {
   const uncertain=payload.needsMoreEvidence || payload.requiresRetake || ['expert_review_needed','needs_closer_photo','possible_pest','possible_nutrient_issue'].includes(payload.resultState) || ['uncertain','possible','retake_required'].includes(payload.status);
   const truth=labels[item.baseline_id], predicted=String(payload.disease).toLowerCase().replace(/[_-]+/g,' ');
   agreement=uncertain?'uncertain_or_review':truth.includes('healthy')?(payload.healthStatus==='healthy'?'match':payload.healthStatus==='unhealthy'?'different_or_unclear':'unassessed'):(predicted.includes(truth) || truth.includes(predicted))?'match':'different_or_unclear';
   }
  } catch(e) {payload={error:String(e.message||'Assessment failed').slice(0,300)};}
  const duration=Date.now()-start;
  await client.query(`insert into public.agricultural_dataset_assessments(id,image_checksum,run_id,predicted_crop,predicted_condition,health_status,agreement,completed,duration_ms,evaluated_at,response) values($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10) on conflict do nothing`,[id,item.checksum,runId,payload.plantType||null,payload.disease||null,payload.healthStatus||null,agreement,completed,duration,payload]);
  console.log(JSON.stringify({case:item.baseline_id || `${item.source}/${item.original_label}`,predicted:payload.disease,health:payload.healthStatus,completed,agreement,durationMs:duration,error:completed?undefined:payload.error,usage:await usage()}));
  if(!completed && /429|402|quota|credit|unavailable|usage limit/i.test(payload.error))break;
 }
 const result=await client.query('select count(*)::int attempts,count(*) filter(where completed)::int completed from public.agricultural_dataset_assessments where run_id=$1',[runId]);
 console.log(JSON.stringify({result:result.rows[0],usageAfter:await usage()}));
} finally {await client.end();}
