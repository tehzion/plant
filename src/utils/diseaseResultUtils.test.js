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

    it('keeps translated health status aligned with normalized healthy state', () => {
        const normalized = normalizeDiseaseResult({
            disease: 'Tiada Masalah Dikesan',
            healthStatus: 'unhealthy',
            severity: 'low',
            abstainReason: 'Image quality is limited.',
        }, t);

        expect(normalized.healthy).toBe(true);
        expect(normalized.translatedHealthStatus).toBe('Healthy');
        expect(normalized.translatedSeverity).toBe('');
    });
});
