vi.mock('../utils/reviewerCopy.js', () => ({ useReviewerText: () => phrase => phrase }));
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AgriculturalDataset from './AgriculturalDataset.jsx';
vi.mock('../utils/neonApi.js',()=>({getNeonAccessToken:async()=>'',neonApiRequest:async()=>({summary:{total:500,sources:['PlantVillage','PlantDoc'],crops:['Apple'],conditions:['healthy']},metrics:{completed:10,matches:2,comparable:3},images:[{checksum:'a'.repeat(64),crop:'Apple',original_label:'healthy',source:'PlantVillage',completed:true,predicted_crop:'Apple',predicted_condition:'Healthy',agreement:'match',run_id:'original-poc-baseline'}]})}));
describe('Agricultural Dataset',()=>{
 it('shows real counts and lets an administrator inspect a reference and prediction',async()=>{
  render(<AgriculturalDataset/>);
  expect(await screen.findByText('500')).toBeInTheDocument();
  expect(screen.getByText('67% (2/3)')).toBeInTheDocument();
  expect(screen.getByText('Apple / Healthy')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'View Apple · healthy · PlantVillage'}));
  expect(screen.getByText('Reference: Apple / healthy')).toBeInTheDocument();
  expect(screen.getByText(/AI: Apple \/ Healthy · Match/)).toBeInTheDocument();
 });
});
