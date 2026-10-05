import { describe, expect, it } from 'vitest';
import { validateDiagnosisStage } from './diagnosisValidation.js';
const stage = { capture_assessment: { imageQualityConfidence: 86, requiresRetake: false, leafDetailSufficient: true },
    diagnosis_assessment: { primaryDiagnosis: 'Leaf Spot', healthStatus: 'unhealthy', severity: 'mild',
        diagnosisConfidence: 82, needsMoreEvidence: false, symptoms: ['Round spots'],
        diagnosticEvidence: { evidenceFor: ['Round spots'], evidenceAgainst: [] } } };

describe('diagnosis payload validation', () => {
    it('accepts a complete assessment', () => expect(validateDiagnosisStage(stage)).toEqual([]));
    it('rejects absent sections and non-boolean decisions', () => {
        expect(validateDiagnosisStage({})).toContain('missing_capture_assessment');
        expect(validateDiagnosisStage({ ...stage, capture_assessment: { ...stage.capture_assessment, requiresRetake: 'false' } }))
            .toContain('invalid_requiresRetake');
    });
    it('rejects a healthy assessment with a disease cause', () => {
        expect(validateDiagnosisStage({ ...stage, diagnosis_assessment: { ...stage.diagnosis_assessment,
            healthStatus: 'healthy', diseaseCategory: 'fungal' } })).toContain('conflicting_health_evidence');
    });
});
