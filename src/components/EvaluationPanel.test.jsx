vi.mock('../utils/reviewerCopy.js', () => ({ useReviewerText: () => phrase => phrase }));
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EvaluationPanel from './EvaluationPanel.jsx';
const api=vi.hoisted(()=>vi.fn());
vi.mock('../utils/neonApi.js',()=>({neonApiRequest:api,getNeonAccessToken:async()=>''}));
const rate={numerator:0,denominator:0,value:null};
const stats={attempted:0,completed:0,diagnosticAgreement:rate,healthyFalseAlarm:rate,coverage:rate,meanDurationMs:rate,cost:{total:null,reportedCases:0}};
beforeEach(()=>{api.mockReset();api.mockImplementation(async url=>{
 if(url.endsWith('/summary')) return {overall:stats,datasets:{PlantVillage:stats,PlantDoc:stats},crops:[],workflowVersions:[],reviewed:0,usabilitySessions:0,limitations:'Public datasets are preliminary.'};
 if(url.includes('/cases?')) return {cases:[]};
 if(url.endsWith('/product-scenarios')) return {scenarios:[]};
 throw Error('Unexpected request');
});});
describe('evaluation dashboard',()=>{
 it('shows an unavailable state for a malformed summary without crashing the reviewer page',async()=>{
  api.mockResolvedValue({rows:[],cases:[],scenarios:[]});
  render(<EvaluationPanel/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Evaluation data is unavailable.');
  expect(screen.getByRole('heading',{name:'AI evaluation & validation'})).toBeInTheDocument();
 });
 it('shows real empty states rather than fabricated results',async()=>{
  render(<EvaluationPanel/>);
  expect(await screen.findByText('Farmer usability testing: Not yet conducted.')).toBeInTheDocument();
  expect(screen.getByText('No evaluation cases on this page.')).toBeInTheDocument();
  expect(screen.getByText('No product scenarios recorded.')).toBeInTheDocument();
 });
 it('does not interpret an unavailable summary as no usability testing',async()=>{
  api.mockImplementation(async url=>{if(url.endsWith('/summary')) throw Error('Unavailable'); return {cases:[],scenarios:[]};});
  render(<EvaluationPanel/>);
  expect(await screen.findByText('Usability data is unavailable.')).toBeInTheDocument();
  expect(screen.queryByText('Farmer usability testing: Not yet conducted.')).not.toBeInTheDocument();
 });
 it('records only a consented session entered by an administrator',async()=>{
  api.mockImplementation(async (url,options)=>{
   if(url.endsWith('/usability') && options?.method==='POST') return {session:{id:'test'}};
   if(url.endsWith('/summary')) return {overall:stats,datasets:{PlantVillage:stats,PlantDoc:stats},crops:[],workflowVersions:[],reviewed:0,usabilitySessions:0,limitations:'Public datasets are preliminary.'};
   if(url.includes('/cases?')) return {cases:[]}; return {scenarios:[]};
  });
  render(<EvaluationPanel/>);await screen.findByText('Farmer usability testing: Not yet conducted.');
  fireEvent.change(screen.getByLabelText('Anonymous participant ID'),{target:{value:'P001'}});
  fireEvent.change(screen.getByLabelText('Test date'),{target:{value:'2026-10-31'}});
  fireEvent.click(screen.getByLabelText('Participant consent recorded'));
  fireEvent.click(screen.getByRole('button',{name:'Save usability session'}));
  await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/admin/evaluation/usability',expect.objectContaining({method:'POST'})));
 });
});
