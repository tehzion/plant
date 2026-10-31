import { describe, expect, it, vi } from 'vitest';
vi.mock('openai', () => ({ default: class {} }));
const { mergeDiagnosisResult } = await import('./aiService.js');
const stage = { capture_assessment: { imageQualityConfidence: 90, requiresRetake: false, detailSufficient: true },
    diagnosis_assessment: { primaryDiagnosis: 'Leaf Spot', healthStatus: 'unhealthy', severity: 'moderate',
        diseaseCategory: 'fungal', pathogenType: 'Fungal', diagnosisConfidence: 92, needsMoreEvidence: false,
        symptoms: ['Round lesions'], diagnosticEvidence: { evidenceFor: ['Round lesions'], evidenceAgainst: [] } } };
const merge = (extra = {}) => mergeDiagnosisResult({ stageOne: stage, stageTwo: null, language: 'en',
    category: 'Vegetables', plantNetResult: null, speciesContext: { confirmed: false },
    speciesAssessment: { confidence: 55 }, ...extra });

describe('diagnosis merge safeguards', () => {
    it('preserves an unhealthy status instead of matching healthy inside unhealthy', () => {
        expect(merge().healthStatus).toBe('unhealthy');
    });
    it('sends a contradictory healthy disease diagnosis to review without treatment', () => {
        const result = merge({ stageOne: { ...stage, diagnosis_assessment: { ...stage.diagnosis_assessment, healthStatus: 'healthy' } } });
        expect(result.healthStatus).toBe('unknown');
        expect(result.validationIssues).toContain('conflicting_health_status');
        expect(result.treatmentEligible).toBe(false);
        expect(result.treatments).toEqual([]);
    });
    it('keeps an explicit unknown status under review', () => {
        const result = merge({ stageOne: { ...stage, diagnosis_assessment: { ...stage.diagnosis_assessment, healthStatus: 'unknown' } } });
        expect(result.healthStatus).toBe('unknown');
        expect(result.treatmentEligible).toBe(false);
    });
    it('retains unknown when evidence is insufficient', () => {
        const result = merge({ stageOne: { capture_assessment: { imageQualityConfidence: 20, requiresRetake: true }, diagnosis_assessment: { primaryDiagnosis: 'No Issues', healthStatus: 'healthy', diagnosisConfidence: 20 } } });
        expect(result.healthStatus).toBe('unknown');
    });
    it('propagates a poor close-up into the overall retake decision', () => {
        const result = merge({ imageQuality: { tree: { qualityConfidence: 95 }, leaf: { qualityConfidence: 35, requiresRetake: true } } });
        expect(result.requiresRetake).toBe(true); expect(result.resultState).toBe('needs_closer_photo');
        expect(result.treatmentEligible).toBe(false); expect(result.treatments).toEqual([]);
    });
    it('keeps a missing assessment under review rather than asserting no issues', () => {
        const result = merge({ stageOne: {} });
        expect(result.disease).toBe('Assessment incomplete');
        expect(result.validationIssues).toContain('missing_capture_assessment');
        expect(result.treatmentEligible).toBe(false);
        expect(result.captureAssessment.imageQualityConfidence).toBeNull();
    });
    it('does not treat high confidence as expert confirmation', () => {
        expect(merge().status).not.toBe('confirmed');
    });
});
