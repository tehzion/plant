import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { importReferenceImages } from './datasetImport.js';
import { createEvaluationImageStore } from './imageStore.js';

// The expected host must be provided independently, to prevent accidental production writes.
const root = resolve(fileURLToPath(new URL('../dataset/public-evaluation', import.meta.url)));
const urlFile=process.env.EVALUATION_DATABASE_URL_FILE, expectedHost=process.env.EVALUATION_DATABASE_HOST;
if ((!urlFile && !process.env.DATABASE_URL) || !expectedHost) throw Error('Set DATABASE_URL or EVALUATION_DATABASE_URL_FILE and EVALUATION_DATABASE_HOST for the isolated branch.');
const connectionString=process.env.DATABASE_URL?.trim() || (await readFile(urlFile,'utf8')).trim();
const url=new URL(connectionString);
if (url.hostname !== expectedHost || url.hostname.includes('-pooler')) throw Error('Direct isolated database host does not match.');
const readJson=async name=>JSON.parse(await readFile(join(root,name),'utf8'));
const [previous,expanded,doc,preflight]=await Promise.all(['plantvillage/manifest.json','plantvillage/expanded-manifest.json','plantdoc/manifest.json','../../../docs/evaluation/plantdoc-preflight.json'].map(readJson));
const excluded=new Set(preflight.results.filter(x=>x.status==='excluded').map(x=>x.imageId));
const seen=new Set(), images=[];
for (const item of [...previous.selected,...expanded.selected]) if (!seen.has(item.checksum) && item.imageVerified && images.length<472) { seen.add(item.checksum); images.push(item); }
for (const item of doc.selected) if (!seen.has(item.checksum) && !excluded.has(item.imageId) && item.imageVerified && images.length<500) {seen.add(item.checksum);images.push(item);}
if (images.length!==500) throw Error(`Expected 500 distinct eligible images; found ${images.length}`);
const client=new pg.Client({connectionString,connectionTimeoutMillis:20000});
try {
 await client.connect();
 await client.query(await readFile(resolve('neon/migrations/0003_agricultural_dataset.sql'),'utf8'));
 await client.query(await readFile(resolve('neon/migrations/0004_evaluation_storage.sql'),'utf8'));
 const imageStore=process.env.EVALUATION_STORAGE_BUCKET ? createEvaluationImageStore() : null;
 const counts=await importReferenceImages({query:client.query.bind(client),imageRoot:root,items:images,imageStore});
 const baseline=await client.query(`select * from public.agricultural_dataset_poc where evaluation_id in ('PILOT-01','PILOT-03','PILOT-06','PILOT-07','PILOT-09','PILOT-16','PILOT-17','PILOT-18','PILOT-20','POC-19R')`);
 let copied=0;
 for (const row of baseline.rows) {
  const image=images.find(x=>x.source===row.dataset_source && x.originalId===row.image_reference);
  if (!image) throw Error(`Baseline image missing: ${row.evaluation_id}`);
  const response=row.ai_response || null;
  const r=await client.query(`insert into public.agricultural_dataset_assessments(id,image_checksum,run_id,predicted_crop,predicted_condition,health_status,agreement,completed,duration_ms,evaluated_at,response)
    values($1,$2,'original-poc-baseline',$3,$4,$5,$6,$7,$8,$9,$10) on conflict do nothing returning id`, [row.evaluation_id,image.checksum,row.predicted_crop,row.predicted_condition,response?.healthStatus || null,row.agreement_status,row.status==='completed',row.processing_time_ms,row.evaluated_at,response]);
  copied+=r.rowCount;
 }
 const summary=await client.query(`select (select count(*)::int from public.agricultural_reference_images) images,(select count(*)::int from public.agricultural_dataset_assessments where completed) completed,(select count(*)::int from public.agricultural_dataset_poc) original_attempts`);
 console.log(JSON.stringify({counts,baselineCopied:copied,baselineFound:baseline.rows.length,...summary.rows[0]}));
} finally {await client.end();}
