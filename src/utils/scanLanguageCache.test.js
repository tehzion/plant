import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyScanTranslation, cacheScanTranslation, getScanTranslation } from './scanLanguageCache.js';
const source = { id: 'scan-1', analysisLanguage: 'ms', disease: 'Karah', treatments: ['Sukatan asal'], confidence: 52, needsReview: true,
 diagnosticEvidence: { likelyCauseCategory: 'fungal', evidenceFor: ['Tompok'] }, structuredAssessment: { assessment: { needs_expert_review: true, confidence_level: 'low', follow_up_questions: ['Bila?'], primary_condition: { name: 'Karah', confidence_level: 'low' }, alternative_conditions: [{ name: 'Hawar', confidence_level: 'low', supporting_evidence: ['Tepi daun'] }] } } };
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
describe('saved analysis language cache', () => {
 it('preserves decision flags and scopes saved translations by owner and source', () => {
  const translated = { ...source, disease: 'Rice blast', treatments: ['Original dose'], analysisLanguage: 'en', confidence: 99, needsReview: false,
   diagnosticEvidence: { likelyCauseCategory: 'bacterial', evidenceFor: ['Spots'] }, structuredAssessment: { assessment: { needs_expert_review: false, confidence_level: 'high', follow_up_questions: ['When?'], primary_condition: { name: 'Blast', confidence_level: 'high' }, alternative_conditions: [{ name: 'Blight', confidence_level: 'high', supporting_evidence: ['Leaf margins'] }] } }, image: 'private-image', feedbackToken: 'private-token', locationName: 'private-location' };
  expect(cacheScanTranslation(source, translated, 'en', 'owner-a')).toBe(true);
  const cached = getScanTranslation(source, 'en', 'owner-a');
  expect(cached).toMatchObject({ disease: 'Rice blast', confidence: 52, needsReview: true, diagnosticEvidence: { likelyCauseCategory: 'fungal', evidenceFor: ['Spots'] }, structuredAssessment: { assessment: { needs_expert_review: true, confidence_level: 'low', primary_condition: { name: 'Blast', confidence_level: 'low' }, alternative_conditions: [{ name: 'Blight', confidence_level: 'low' }] } } });
  expect(getScanTranslation(source, 'en', 'owner-b')).toBeNull();
  expect(getScanTranslation({ ...source, treatments: ['Updated dose'] }, 'en', 'owner-a')).toBeNull();
  expect(localStorage.getItem('plant_analysis_languages_v1')).not.toMatch(/private-image|private-token|private-location/);
 });
 it('rejects the wrong language and survives unavailable storage', () => {
  expect(cacheScanTranslation(source, source, 'en', 'a')).toBe(false);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  expect(cacheScanTranslation(source, { disease: 'Blast', analysisLanguage: 'en' }, 'en', 'a')).toBe(false);
 });
 it('ignores malformed fields without erasing the source advice', () => {
  expect(applyScanTranslation(source, { disease: { bad: true }, treatments: { bad: true } })).toMatchObject({ disease: 'Karah', treatments: ['Sukatan asal'] });
  localStorage.setItem('plant_analysis_languages_v1', '{invalid');
  expect(getScanTranslation(source, 'en', 'a')).toBeNull();
 });
});
