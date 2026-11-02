import fs from 'node:fs/promises';import pg from 'pg';
const url=(await fs.readFile('/private/tmp/agro-pilot-isolated/neon-url','utf8')).trim();
if(!new URL(url).hostname.startsWith('ep-still-morning-b5v4lvx8.'))throw Error('Wrong branch');
const db=new pg.Client({connectionString:url});await db.connect();
const total=await db.query('select count(*)::int as n from public.agricultural_dataset_poc');
const bySource=await db.query('select dataset_source,count(*)::int as n from public.agricultural_dataset_poc where dataset_source=$1 group by dataset_source',['PlantVillage']);
const byDoc=await db.query('select dataset_source,count(*)::int as n from public.agricultural_dataset_poc where dataset_source=$1 group by dataset_source',['PlantDoc']);
const rows=await db.query('select * from public.agricultural_dataset_poc order by evaluation_id');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
let mismatches=[];
for(const row of rows.rows){const p=JSON.parse(await fs.readFile('/private/tmp/agro-pilot-isolated/'+row.evaluation_id+'.json','utf8'));if(row.reference_condition!==p.reference_condition||row.predicted_condition!==p.predicted_condition||row.agreement_status!==p.agreement_status||JSON.stringify(canonical(row.ai_response))!==JSON.stringify(canonical(p.ai_response)))mismatches.push(row.evaluation_id)}
console.log(JSON.stringify({total:total.rows[0].n,plantvillage:bySource.rows[0]?.n||0,plantdoc:byDoc.rows[0]?.n||0,compared:rows.rows.length,mismatches}));await db.end();
