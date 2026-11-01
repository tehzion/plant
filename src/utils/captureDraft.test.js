import { beforeEach, describe, expect, it, vi } from 'vitest';
const records=vi.hoisted(()=>new Map());
vi.mock('./indexedDbStorage.js',()=>({putRecord:vi.fn(async({owner,id,value})=>records.set(`${owner}:${id}`,value)),getRecord:vi.fn(async(owner,id)=>records.get(`${owner}:${id}`)),deleteRecord:vi.fn(async(owner,id)=>records.delete(`${owner}:${id}`))}));
import { putRecord } from './indexedDbStorage.js';
import { saveCaptureDraft, loadCaptureDraft, discardCaptureDraft, captureDraftSignature } from './captureDraft.js';
beforeEach(()=>{records.clear();vi.clearAllMocks();});
describe('local capture drafts',()=>{
 it('restores both photo blobs and crop context for the same owner after a fresh load',async()=>{
  const state={selectedImage:new File(['whole'],'whole.jpg',{type:'image/jpeg',lastModified:12}),selectedLeafImage:new File(['leaf'],'leaf.png',{type:'image/png',lastModified:14}),selectedCategory:'Rice',selectedCrop:'',selectedScale:'acre',scaleQuantity:3,currentStep:2,captureContext:{plantPart:'whole',duration:'2 days'},retakeReason:'Both views needed'};
  await saveCaptureDraft('user:a',state);
  const restored=await loadCaptureDraft('user:a');
  expect(restored.selectedImage).toBeInstanceOf(File);expect(restored.selectedImage.size).toBe(5);expect(restored.selectedLeafImage.name).toBe('leaf.png');
  expect(captureDraftSignature(restored)).toBe(captureDraftSignature(state));
  expect(await loadCaptureDraft('user:b')).toBeNull();
  await discardCaptureDraft('user:a');expect(await loadCaptureDraft('user:a')).toBeNull();
 });
 it('never stores analysis state or arbitrary scan metadata and does not claim a failed write succeeded',async()=>{
  await saveCaptureDraft('guest:a',{selectedImage:new File(['x'],'photo.jpg',{type:'image/jpeg'}),loading:true,currentStep:3,feedbackToken:'secret',location:{lat:1}});
  const value=putRecord.mock.calls[0][0].value;
  expect(value).not.toHaveProperty('feedbackToken');expect(value).not.toHaveProperty('location');expect(value).not.toHaveProperty('loading');expect(value.currentStep).toBe(2);
  putRecord.mockRejectedValueOnce(new Error('quota'));
  await expect(saveCaptureDraft('guest:a',{selectedImage:new File(['x'],'x.jpg',{type:'image/jpeg'})})).rejects.toThrow('quota');
 });
});
