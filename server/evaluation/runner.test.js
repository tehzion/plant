import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createLocalAssessmentAdapter, runEvaluation } from './runner.js';
const image = Buffer.from('ffd8ff00112233', 'hex');
const item = { imageId:'fixture', checksum:createHash('sha256').update(image).digest('hex'), source:'PlantVillage', crop:'tomato', normalizedLabel:'healthy', originalLabel:'healthy', supported:true, rightsCleared:true, imageVerified:true, loadImage:async()=>image };
describe('batch isolation and provenance', () => {
 it('rejects remote endpoints', () => expect(() => createLocalAssessmentAdapter({baseUrl:'https://example.com'})).toThrow());
 it('stores failures separately and avoids duplicate paid evaluations', async () => {
  const records = new Map(), assess = vi.fn(async()=>({ plantType:'tomato', disease:'healthy', healthStatus:'healthy', analysisMetadata:{model:'test',policyVersion:4} }));
  const store = {has:async k=>records.has(k),claim:async()=>true,save:async(k,v)=>records.set(k,v)};
  const args = {cases:[item],assess,store,workflowVersion:'test',costApproved:true};
  expect((await runEvaluation(args)).processed).toBe(1);
  expect((await runEvaluation(args)).skipped).toBe(1);
  expect(assess).toHaveBeenCalledTimes(1); expect([...records.values()][0].match).toBe('exact_match');
 });
 it('does not submit images whose bytes do not match the manifest', async()=>{
  const assess = vi.fn(), records=[];
  await runEvaluation({cases:[{...item,checksum:'a'.repeat(64)}],assess,workflowVersion:'v',costApproved:true,store:{has:async()=>false,claim:async()=>true,save:async(k,v)=>records.push(v)}});
  expect(assess).not.toHaveBeenCalled(); expect(records[0].match).toBe('processing_failure');
 });
});
describe('assessment uncertainty', () => {
 it('uses the application decision policy when the response requests a retake', async()=>{
  const records=[];
  await runEvaluation({cases:[item],workflowVersion:'v',costApproved:true,store:{has:async()=>false,claim:async()=>true,save:async(k,v)=>records.push(v)},assess:async()=>({plantType:'tomato',disease:'early blight',healthStatus:'unhealthy',requiresRetake:true})});
  expect(records[0].prediction.uncertain).toBe(true);
  expect(records[0].match).toBe('uncertain_or_abstained');
 });
 it('does not count a processing response as a completed assessment',async()=>{
  const assess=createLocalAssessmentAdapter({baseUrl:'http://127.0.0.1:3002',fetchImpl:async()=>({ok:true,status:202,json:async()=>({status:'processing'})})});
  await expect(assess({image,mime:'image/jpeg'})).rejects.toThrow('did not complete');
 });
});
