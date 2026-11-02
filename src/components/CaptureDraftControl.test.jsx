import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CaptureDraftControl from './CaptureDraftControl.jsx';
const storage=vi.hoisted(()=>({saveCaptureDraft:vi.fn(),loadCaptureDraft:vi.fn(),discardCaptureDraft:vi.fn(),captureDraftSignature:value=>JSON.stringify([value?.selectedImage?.name,value?.selectedLeafImage?.name,value?.selectedCategory])}));
vi.mock('../utils/captureDraft.js',()=>storage);
vi.mock('../i18n/i18n.jsx',async()=>{const {default:copy}=await import('../i18n/translations.js');return{useLanguage:()=>({language:'en',t:key=>key.split('.').reduce((value,part)=>value?.[part],copy.en)||key})};});
const state={selectedImage:new File(['whole'],'whole.jpg',{type:'image/jpeg'}),selectedLeafImage:new File(['leaf'],'leaf.jpg',{type:'image/jpeg'}),selectedCategory:'Rice'};
beforeEach(()=>{vi.clearAllMocks();storage.loadCaptureDraft.mockResolvedValue(null);vi.stubGlobal('requestAnimationFrame',callback=>{callback();return 1;});});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('capture draft feedback',()=>{
 it('announces saving then the actual saved time and preserves the photos on a failed re-save',async()=>{
  let finish;storage.saveCaptureDraft.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockRejectedValueOnce(new Error('quota'));
  render(<CaptureDraftControl owner="user:a" state={state} onResume={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Save photo draft'}));
  expect(screen.getByRole('status')).toHaveTextContent('Saving photo draft');
  await act(async()=>finish({...state,savedAt:'2026-11-01T16:00:05Z'}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Photo draft saved at'));
  fireEvent.click(screen.getByRole('button',{name:'Save photo draft'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your photos are still on this screen');
  expect(screen.getByRole('button',{name:'Save photo draft'})).toBeEnabled();
  expect(storage.saveCaptureDraft).toHaveBeenLastCalledWith('user:a',state);
 });
 it('waits for an explicit resume choice and confirms before discarding the stored draft',async()=>{
  const draft={...state,savedAt:'2026-11-01T16:00:05Z'};storage.loadCaptureDraft.mockResolvedValue(draft);
  const resume=vi.fn();vi.spyOn(window,'confirm').mockReturnValue(false);
  render(<CaptureDraftControl owner="user:a" state={{}} onResume={resume}/>);
  const button=await screen.findByRole('button',{name:'Resume saved photos'});
  expect(resume).not.toHaveBeenCalled();fireEvent.click(button);expect(resume).toHaveBeenCalledWith(draft);
  fireEvent.click(screen.getByRole('button',{name:'Discard saved draft'}));
  expect(window.confirm).toHaveBeenCalled();expect(storage.discardCaptureDraft).not.toHaveBeenCalled();
 });
});
