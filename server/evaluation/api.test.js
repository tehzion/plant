import { describe, expect, it, vi } from 'vitest';
import { registerEvaluationRoutes, validateImportedCase, validateReview, validateUsability } from './api.js';
const valid = { key:'a'.repeat(64), imageId:'image-1', source:'PlantVillage', workflowVersion:'v1', provenance:{originalId:'original',license:'reviewed',sourceReference:'source',datasetVersion:'commit',checksum:'b'.repeat(64),samplingSeed:42,rightsCleared:true,imageVerified:true}, reference:{crop:'tomato',label:'healthy',supported:true}, prediction:{completed:true,label:'healthy'} };
describe('evaluation access and integrity',()=>{
 it('rejects embedded image data and capability tokens',()=>{
  expect(()=>validateImportedCase({...valid,image:'data:image/png;base64,a'})).toThrow();
  expect(()=>validateImportedCase({...valid,feedbackToken:'secret'})).toThrow();
 });
 it('requires a correction for disagreement and recorded consent',()=>{
  expect(()=>validateReview({verdict:'disagree'})).toThrow();
  expect(()=>validateUsability({consent:false})).toThrow();
  expect(()=>validateUsability({consent:true,completed:true,assistance:false,participantId:'p01',task:'assessment',testDate:'2026-02-30'})).toThrow();
 });
 it('authorizes before reading or writing any case', async()=>{
  const routes={}; const app={get:(p,h)=>routes[`get ${p}`]=h,post:(p,h)=>routes[`post ${p}`]=h};
  const query=vi.fn(), authorize=vi.fn(async()=>{throw Object.assign(new Error('Forbidden'),{status:403});});
  registerEvaluationRoutes(app,{query,authorize}); const next=vi.fn();
  await routes['post /api/admin/evaluation/cases']({body:valid},{},next);
  expect(query).not.toHaveBeenCalled(); expect(next.mock.calls[0][0].status).toBe(403);
 });
 it('rejects duplicate imports rather than overwriting',async()=>{
  const routes={};const app={get:(p,h)=>routes[`get ${p}`]=h,post:(p,h)=>routes[`post ${p}`]=h};
  const query=vi.fn(async()=>({rows:[]})); registerEvaluationRoutes(app,{query,authorize:async()=>({id:'reviewer'})});const next=vi.fn();
  await routes['post /api/admin/evaluation/cases']({body:valid},{},next);
  expect(next.mock.calls[0][0].status).toBe(409); expect(query.mock.calls[0][0]).toContain('do nothing');
 });
});
describe('product review boundary',()=>{
 it('does not attach reviews to products absent from the recorded response',async()=>{
  const routes={}; const app={get:(p,h)=>routes[`get ${p}`]=h,post:(p,h)=>routes[`post ${p}`]=h};
  const query=vi.fn(async()=>({rows:[{recommendation:{diseaseControl:[{id:1}]}}]}));
  registerEvaluationRoutes(app,{query,authorize:async()=>({id:'reviewer'})}); const next=vi.fn();
  await routes['post /api/admin/evaluation/product-scenarios/:id/reviews']({params:{id:'12345678-1234-1234-1234-123456789abc'},body:{productId:'2',verdict:'suitable'}},{},next);
  expect(next.mock.calls[0][0].status).toBe(400); expect(query).toHaveBeenCalledTimes(1);
 });
});
describe('evaluation image access',()=>{
 it('checks authorization before fetching an image record',async()=>{
  const routes={}; const app={get:(p,h)=>routes[`get ${p}`]=h,post:(p,h)=>routes[`post ${p}`]=h};
  const query=vi.fn(), next=vi.fn();
  registerEvaluationRoutes(app,{query,authorize:async()=>{throw Object.assign(new Error('Forbidden'),{status:403});}});
  await routes['get /api/admin/evaluation/cases/:id/image']({params:{id:'a'.repeat(64)}},{},next);
  expect(query).not.toHaveBeenCalled(); expect(next.mock.calls[0][0].status).toBe(403);
 });
});

describe('agricultural dataset access',()=>{
 it('requires administrator authorization before listing references', async()=>{
  const routes={}; const app={get:(p,h)=>routes[`get ${p}`]=h,post:(p,h)=>routes[`post ${p}`]=h};
  const query=vi.fn(), next=vi.fn();
  registerEvaluationRoutes(app,{query,authorize:async()=>{throw Object.assign(new Error('Forbidden'),{status:403});}});
  await routes['get /api/admin/evaluation/dataset']({query:{}},{},next);
  expect(query).not.toHaveBeenCalled(); expect(next.mock.calls[0][0].status).toBe(403);
 });
});
