import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActivityForm from './ActivityForm.jsx';
import { EMPTY_FORM, ACTIVITY_TYPES_CFG } from '../../data/config.js';
const label = (_key, fallback) => fallback;
function Entry({ savingNote=false, saveError='', onSubmit=vi.fn() }) {
 const [noteForm,setNoteForm]=useState({...EMPTY_FORM,activity_type:'scout'});
 return <ActivityForm label={label} noteForm={noteForm} setNoteForm={setNoteForm} activityTypes={ACTIVITY_TYPES_CFG} plots={[{id:'a',name:'Plot A'}]} enhancing={false} onAutoEnhance={vi.fn()} onSubmit={onSubmit} savingNote={savingNote} saveError={saveError} />;
}
describe('activity entry',()=>{
 it('keeps optional costs when collapsed and reveals invalid hidden fields',()=>{
  render(<Entry/>);
  const costs=screen.getByText('Costs (optional)').closest('details');
  fireEvent.click(screen.getByText('Costs (optional)'));
  const cost=screen.getByLabelText('Cost (RM)');
  fireEvent.change(cost,{target:{value:'25'}});
  fireEvent.click(screen.getByText('Costs (optional)'));
  expect(cost).toHaveValue(25);
  fireEvent.invalid(cost);
  expect(costs).toHaveAttribute('open');
 });
 it('names every main field and requires the Scout observation, not optional notes',()=>{
  render(<Entry/>);
  expect(screen.getByLabelText(/Disease \/ Pest Name/)).toBeRequired();
  expect(screen.getByLabelText('Notes / Remarks')).not.toBeRequired();
  expect(screen.getByLabelText('Plot / Farm')).toHaveValue('');
  expect(screen.getByRole('button',{name:'Scout'})).toHaveAttribute('aria-pressed','true');
 });
 it('locks editable fields while saving and keeps a rejected entry available',()=>{
  const {rerender}=render(<Entry savingNote/>);
  expect(screen.getByLabelText(/Disease \/ Pest Name/)).toBeDisabled();
  expect(screen.getByRole('button',{name:'Saving your activity…'})).toBeDisabled();
  rerender(<Entry saveError="Could not save. Please retry."/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  expect(screen.getByRole('button',{name:'Save activity'})).toBeEnabled();
 });
});
