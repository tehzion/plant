import { describe, expect, it } from 'vitest';
import { normalizeDiseaseResult } from './diseaseResultUtils.js';

const t = (key) => ({
    'results.unknownDisease': 'Unknown disease',
    'results.noIssues': 'No issues',
    'results.healthy': 'Healthy',
    'results.unhealthy': 'Unhealthy',
    'results.demoModeDesc': 'Demo mode',
    'results.defaultHealthyReasoning': 'Healthy default',
    'results.defaultUnhealthyReasoning': 'Unhealthy default',
    'results.confirmedDiagnosis': 'Confirmed diagnosis',
    'results.likelyDiagnosis': 'Likely diagnosis',
    'results.uncertainDiagnosis': 'Uncertain diagnosis',
    'results.retakeRequired': 'Retake required',
    'results.scanStateNeedsCloserPhoto': 'Need closer photo',
    'results.scanStateExpertReviewNeeded': 'Expert review needed',
    'results.statusHealthy': 'Healthy',
    'results.statusDiseased': 'Diseased',
    'results.estimatedAge': 'Estimated age',
    'results.primaryCause': 'Primary cause',
    'results.pathogenType': 'Pathogen type',
    'results.nutrientDeficiencyType': 'Nutrient deficiency',
    'results.fungusSpecies': 'Fungus species',
}[key] || key);

describe('normalizeDiseaseResult', () => {
    it('splits long diagnosis titles into a cleaner title and explanation', () => {
        const normalized = normalizeDiseaseResult({
            disease: 'Leaf Spot, likely caused by fungal infection from wet foliage',
            healthStatus: 'Diseased',
            severity: 'Moderate',
            symptoms: 'Yellow halo•Brown lesions',
        }, t);

        expect(normalized.displayName).toBe('Leaf Spot');
        expect(normalized.extraDescription).toContain('Likely caused by fungal infection from wet foliage');
        expect(normalized.symptomsList).toEqual(['Yellow halo', 'Brown lesions']);
    });

    it('builds detail items for healthy scans without crashing', () => {
        const normalized = normalizeDiseaseResult({
            disease: 'Healthy Plant',
            healthStatus: 'Healthy',
            estimatedAge: '4 weeks',
        }, t);

        expect(normalized.healthy).toBe(true);
        expect(normalized.detailItems).toEqual([
            expect.objectContaining({
                key: 'age',
                value: '4 weeks',
            }),
        ]);
        expect(normalized.translatedHealthStatus).toBe('Healthy');
    });

    it('uses the review state label for no-issue scans with weak evidence', () => {
        const normalized = normalizeDiseaseResult({
            disease: 'Tiada Masalah Dikesan',
            healthStatus: 'healthy',
            status: 'uncertain',
            needsMoreEvidence: true,
            abstainReason: 'Image quality is limited.',
        }, t);

        expect(normalized.healthy).toBe(false);
        expect(normalized.resultState).toBe('expert_review_needed');
        expect(normalized.translatedHealthStatus).toBe('Expert review needed');
        expect(normalized.translatedSeverity).toBe('');
    });

    it('uses a closer-photo status for no-issue scans that require retake', () => {
        const normalized = normalizeDiseaseResult({
            disease: 'Tiada Masalah Dikesan',
            healthStatus: 'healthy',
            status: 'retake_required',
            requiresRetake: true,
            retakeReason: 'Photo is too far from the leaf.',
        }, t);

        expect(normalized.healthy).toBe(false);
        expect(normalized.resultState).toBe('needs_closer_photo');
        expect(normalized.translatedHealthStatus).toBe('Need closer photo');
    });

    it('does not show a confirmed species badge when species context was downgraded by conflict', () => {
        const normalized = normalizeDiseaseResult({
            disease: 'Likely Leaf Blight',
            healthStatus: 'unhealthy',
            severity: 'moderate',
            identification: {
                scientificName: 'Mangifera indica',
                commonNames: ['Mango'],
                confidence: 90,
            },
            speciesAssessment: {
                confirmed: true,
            },
            speciesContext: {
                confirmed: false,
                categoryConflict: true,
            },
        }, t);

        expect(normalized.showIdentification).toBe(false);
    });
});
