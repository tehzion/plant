// @vitest-environment node
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { describe, it, expect, vi } from 'vitest';
import { importReferenceImages } from './datasetImport.js';

describe('agricultural reference import',()=>{
 it('validates image hashes and skips existing records without overwriting',async()=>{
  const root=await mkdtemp(join(tmpdir(),'agricultural-import-'));
  try {
   await mkdir(join(root,'plantvillage')); const bytes=Buffer.from('ffd8ff010203','hex'); const checksum=createHash('sha256').update(bytes).digest('hex');
   await writeFile(join(root,'plantvillage',checksum+'.jpg'),bytes);
   const item={source:'PlantVillage',checksum,localPath:checksum+'.jpg',originalId:'original',crop:'Apple',originalLabel:'healthy'};
   const query=vi.fn().mockResolvedValueOnce({rows:[{checksum}]}).mockResolvedValueOnce({rows:[]});
   expect(await importReferenceImages({query,imageRoot:root,items:[item,item]})).toEqual({inserted:1,skipped:1,invalid:0});
   expect(query.mock.calls[0][0]).toContain('on conflict do nothing');
   expect(await importReferenceImages({query,imageRoot:root,items:[{...item,checksum:'a'.repeat(64)}]})).toEqual({inserted:0,skipped:0,invalid:1});
   const imageStore={exists:vi.fn().mockResolvedValue(false),put:vi.fn().mockRejectedValue(new Error('storage unavailable')),get:vi.fn()};
   await expect(importReferenceImages({query,imageRoot:root,items:[item],imageStore})).rejects.toThrow('storage unavailable');
  } finally { await rm(root,{recursive:true,force:true}); }
 });
});
