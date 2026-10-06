import { describe, expect, it } from 'vitest';
import { evaluateExpertBenchmark } from './expertBenchmarkService.js';
const row = (id, prediction = {}, label = {}) => ({ scanId: id,
 label: { crop: 'durian', diagnosis: 'leaf blight', healthState: 'unhealthy', reviewStatus: 'expert_verified', reviewedBy: 'expert-1', reviewedAt: '2026-10-05T10:00:00Z', ...label },
 prediction: { disease: 'Leaf blight', healthStatus: 'unhealthy', confidence: 90, status: 'high_confidence', ...prediction } });
const evaluate = cases => evaluateExpertBenchmark(cases, { minimumCases: 1 });
describe('expert accuracy benchmark', () => {
 it('reports exact top-one, top-three and confident-error rates', () => {
  const result = evaluate([row('1'), row('2', { disease: 'mildew', differentialDiagnoses: ['rust'] }, { diagnosis: 'rust' })]);
  expect(result.sampleSize).toBe(2); expect(result.top1Rate).toBe(.5);
  expect(result.top3Rate).toBe(1); expect(result.confidentlyWrongRate).toBe(.5);
 });
 it('does not confuse unhealthy with healthy', () => {
  expect(evaluate([row('1', {}, {healthState:'healthy'})]).healthStateAccuracy).toBe(0);
 });
 it('preserves Chinese and rejects partial disease names', () => {
  expect(evaluate([row('1',{disease:'叶斑病'},{diagnosis:'叶斑病'})]).top1Rate).toBe(1);
  expect(evaluate([row('1',{disease:'叶斑病'},{diagnosis:'炭疽病'})]).top1Rate).toBe(0);
  expect(evaluate([row('1',{disease:'rust'},{diagnosis:'stem rust'})]).top1Rate).toBe(0);
 });
 it('accepts expert-approved exact aliases', () => {
  expect(evaluate([row('1',{disease:'Leaf spot'},{diagnosis:'叶斑病',approvedAliases:['leaf spot']})]).top1Rate).toBe(1);
 });
 it('reads structured candidates and counts three distinct choices', () => {
  const result = evaluate([row('1',{disease:'rust',differentialDiagnoses:[{name:'rust'},{name:'leaf blight'},{name:'mildew'},{name:'wilt'}]})]);
  expect(result.top3Rate).toBe(1);
  expect(evaluate([row('1',{disease:'rust',differentialDiagnoses:['mildew','wilt','leaf blight']})]).top3Rate).toBe(0);
 });
 it('normalizes fractional confidence and prioritizes diagnosis confidence', () => {
  expect(evaluate([row('1',{disease:'rust',confidence:.9})]).confidentlyWrongRate).toBe(1);
  expect(evaluate([row('1',{disease:'rust',confidence:95,diagnosisConfidence:50})]).confidentlyWrongRate).toBe(0);
 });
 it('does not call abstentions correct health predictions', () => {
  const result = evaluate([row('1',{requiresRetake:true,healthStatus:'healthy'},{healthState:'healthy'})]);
  expect(result.healthStateAccuracy).toBeNull(); expect(result.healthCoverage).toBe(0); expect(result.retakeRate).toBe(1);
 });
 it('excludes unverified labels and duplicate scans', () => {
  const result = evaluate([row('1'),row('1'),row('2',{}, {reviewStatus:'public_feedback'}),row('3',{}, {healthState:'unknown'}),row('4',{}, {reviewedAt:'invalid'})]);
  expect(result.sampleSize).toBe(1); expect(result.excludedCases).toBe(4);
 });
 it('reports no evidence rather than zero accuracy for empty or small samples', () => {
  expect(evaluateExpertBenchmark([]).top1Rate).toBeNull();
  expect(evaluateExpertBenchmark([row('1')]).status).toBe('awaiting_expert_labels');
 });
});
