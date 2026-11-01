import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScanFollowUpTracker from './ScanFollowUpTracker.jsx';
const save = vi.hoisted(()=>vi.fn());
vi.mock('../context/AuthContext.jsx',()=>({useAuth:()=>({user:null})}));
vi.mock('../utils/localStorage.js',()=>({getPlots:async()=>[]}));
vi.mock('../utils/scanFollowUpStorage.js',()=>({saveScanFollowUp:(...args)=>save(...args)}));
vi.mock('./FollowUpComparison.jsx',()=>({default:()=>null}));
vi.mock('../i18n/i18n.jsx',async()=>{const {default:copy}=await import('../i18n/translations.js');return{useLanguage:()=>({language:'en',t:key=>key.split('.').reduce((value,part)=>value?.[part],copy.en)||key})};});
beforeEach(()=>save.mockReset());
describe('recheck form recovery',()=>{
 it('preserves entries after a failed save and lets the farmer retry',async()=>{
  save.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({followUp:{nextCheckDate:'2099-01-12',history:[]}});
  const onSaved=vi.fn();const {container}=render(<ScanFollowUpTracker scan={{id:'scan-1'}} onSaved={onSaved}/>);
  fireEvent.click(container.querySelector('summary'));
  fireEvent.change(container.querySelector('input[type=date]'),{target:{value:'2099-01-12'}});
  fireEvent.change(container.querySelector('textarea'),{target:{value:'Check the upper leaves'}});
  fireEvent.submit(container.querySelector('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your entries are still here');
  expect(container.querySelector('textarea')).toHaveValue('Check the upper leaves');
  fireEvent.submit(container.querySelector('form'));
  await waitFor(()=>expect(onSaved).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('status')).toHaveTextContent('Re-check saved for');
 });
 it('prevents a past recheck date and keeps healthy outcome wording appropriate',async()=>{
  const {container}=render(<ScanFollowUpTracker scan={{id:'scan-2'}} healthy onSaved={vi.fn()}/>);
  fireEvent.click(container.querySelector('summary'));
  expect(screen.getByRole('option',{name:'Still healthy'})).toBeInTheDocument();
  expect(screen.queryByRole('option',{name:'Improving'})).not.toBeInTheDocument();
  fireEvent.change(container.querySelector('input[type=date]'),{target:{value:'2000-01-01'}});
  fireEvent.submit(container.querySelector('form'));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a date today or later');
  expect(save).not.toHaveBeenCalled();
  expect(container.querySelector('input[type=date]')).toHaveFocus();
 });
});
