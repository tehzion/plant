import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { createEvaluationImageStore, imageObjectKey } from './imageStore.js';

const { EVALUATION_DATABASE_URL_FILE:dbFile, EVALUATION_DATABASE_HOST:expectedHost, EVALUATION_IMAGE_DIR:dir, EVALUATION_STORAGE_BRANCH:branch } = process.env;
if ((!dbFile && !process.env.DATABASE_URL) || !expectedHost || !dir || !branch) throw Error('Isolated database, image directory and branch are required');
const connectionString=process.env.DATABASE_URL?.trim() || (await readFile(dbFile,'utf8')).trim();
if (new URL(connectionString).hostname !== expectedHost || expectedHost.includes('-pooler')) throw Error('Isolated database host mismatch');
const root=await realpath(dir), store=createEvaluationImageStore();
const client=new pg.Client({connectionString,connectionTimeoutMillis:20000});
try {
 await client.connect();
 await client.query(await readFile('neon/migrations/0004_evaluation_storage.sql','utf8'));
 const {rows}=await client.query('select checksum,source,filename,storage_key from public.agricultural_reference_images order by checksum');
 let uploaded=0,alreadyPresent=0,verified=0;
 let next=0, pendingUpdate=Promise.resolve();
 async function worker() {
 while (next<rows.length) {
  const index=next++, item=rows[index];
  const key=imageObjectKey(item.source,item.filename);
  const file=await realpath(path.join(root,key));
  if (!file.startsWith(root+path.sep)) throw Error('Image outside evaluation store');
  const bytes=await readFile(file);
  if (createHash('sha256').update(bytes).digest('hex')!==item.checksum) throw Error(`Local checksum mismatch: ${item.checksum}`);
  if (await store.exists(key)) { await store.get(key,item.checksum); alreadyPresent++; }
  else { await store.put(key,bytes,item.filename.endsWith('.png')?'image/png':'image/jpeg');uploaded++; await store.get(key,item.checksum); }
  pendingUpdate=pendingUpdate.then(()=>client.query('update public.agricultural_reference_images set storage_key=$1 where checksum=$2 and storage_key is distinct from $1',[key,item.checksum]));
  await pendingUpdate;
  verified++;
  if (verified%50===0) console.log(JSON.stringify({processed:verified,total:rows.length,uploaded,alreadyPresent,verified}));
 }
 }
 await Promise.all(Array.from({length:8},()=>worker()));
 console.log(JSON.stringify({total:rows.length,uploaded,alreadyPresent,verified}));
} finally {await client.end();}
