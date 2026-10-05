import { describe, expect, it } from 'vitest';
import { buildScanResultModel } from './scanResultModel.js';
import { assessScanDecision, confidencePercent } from '../../shared/scanResultPolicy.js';
import { buildFollowUpDraftFromScan } from './scanFollowUpDraft.js';
import { buildProductDiagnosisPayload } from './liveProductRecommendations.js';

const strong = { disease: 'Leaf Spot', pathogenType: 'Fungal', diseaseCategory: 'fungal', status: 'high_confidence',
    diagnosisConfidence: 91, healthStatus: 'unhealthy', captureAssessment: { imageQualityConfidence: 88 },
    treatments: ['Use the verified field plan'] };

describe('shared scan result decisions', () => {
    it('preserves retake assessments in the product request payload', () => {
        const payload = buildProductDiagnosisPayload({ plantType: 'Durian', disease: 'Leaf Spot',
            scanResult: { ...strong, captureAssessment: { detailSufficient: false } } });
        expect(payload.resultState).toBe('needs_closer_photo');
        expect(payload.requiresRetake).toBe(true);
        expect(payload.captureAssessment.detailSufficient).toBe(false);
    });
    it('does not convert absent confidence into zero or null into an assessment', () => {
        expect(confidencePercent(null)).toBeNull(); expect(confidencePercent('')).toBeNull();
        expect(confidencePercent(0)).toBe(0); expect(confidencePercent(.91)).toBe(91);
    });
    it('rejects an explicit confident state when evidence is weak', () => {
        const model = buildScanResultModel({ ...strong, resultState: 'confident_treatment', needsMoreEvidence: true });
        expect(model.needsReview).toBe(true); expect(model.treatments).toEqual([]);
        expect(buildScanResultModel({ ...strong, needsMoreEvidence: true, immediateActions: ['Apply pesticide now'] }).immediateActions.join(' ')).not.toContain('Apply pesticide');
        expect(model.resultState).toBe('expert_review_needed');
    });
    it('preserves capture assessment through page normalization and subsequent decisions', () => {
        const model = buildScanResultModel({ ...strong, captureAssessment: { requiresRetake: true, leafDetailSufficient: false } });
        expect(model.resultState).toBe('needs_closer_photo');
        expect(assessScanDecision(model).resultState).toBe('needs_closer_photo');
        expect(buildFollowUpDraftFromScan(model).activity_type).toBe('scout');
    });
    it('keeps incomplete fresh results under review', () => {
        expect(buildScanResultModel({ ...strong, schemaVersion: 2, captureAssessment: {}, diagnosisConfidence: undefined })
            .treatmentEligible).toBe(false);
    });
    it('resolves nutrition once for every output, preserving primary disease', () => {
        const model = buildScanResultModel({ ...strong, nutritionalIssues: { status: 'none' },
            differentialDiagnoses: [{ name: 'Magnesium deficiency', reason: 'A possible overlap' }] });
        expect(model.diseaseCategory).toBe('fungal');
        expect(model.nutritionalIssues.status).toBe('possible');
        expect(buildScanResultModel(model).nutritionalIssues).toEqual(model.nutritionalIssues);
    });
    it('does not preselect spraying even for a stronger finding', () => {
        expect(buildFollowUpDraftFromScan(strong).activity_type).toBe('note');
    });
    it.each(['ms', 'zh'])('localizes draft headers in %s', language => {
        const draft = buildFollowUpDraftFromScan({ ...strong, id: 'test' }, language);
        expect(draft.note).not.toContain('Linked scan:'); expect(draft.note).toContain('test');
    });
});
