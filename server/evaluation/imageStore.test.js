// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createEvaluationImageStore, imageObjectKey } from './imageStore.js';
const env={EVALUATION_STORAGE_BUCKET:'agricultural-evaluation',EVALUATION_STORAGE_BRANCH:'br-test',AWS_ENDPOINT_URL_S3:'https://br-test.storage.example.test',AWS_REGION:'us-east-2',AWS_ACCESS_KEY_ID:'test',AWS_SECRET_ACCESS_KEY:'test'};
describe('evaluation image storage',()=>{
 it('uses source-specific, validated object keys',()=>{
  expect(imageObjectKey('PlantVillage','a'.repeat(64)+'.jpg')).toBe('plantvillage/'+ 'a'.repeat(64)+'.jpg');
  expect(()=>imageObjectKey('PlantDoc','../secret.jpg')).toThrow();
 });
 it('rejects the wrong branch and a corrupt downloaded object',async()=>{
  expect(()=>createEvaluationImageStore({...env,EVALUATION_STORAGE_BRANCH:'br-other'})).toThrow('branch');
  const bytes=Buffer.from('example'), checksum=createHash('sha256').update(bytes).digest('hex');
  const client={send:vi.fn().mockResolvedValue({ContentLength:bytes.length,Body:{transformToByteArray:async()=>bytes}})};
  const store=createEvaluationImageStore(env,client);
  expect(await store.get('plantdoc/example.jpg',checksum)).toEqual(bytes);
  await expect(store.get('plantdoc/example.jpg','a'.repeat(64))).rejects.toThrow('checksum');
 });
});
