import { describe, expect, it } from 'vitest';
import {
    SCAN_RESULT_STATES,
    getScanResultState,
    getStandardizedStatus,
    isHealthy,
} from './statusUtils';

describe('statusUtils', () => {
    it('treats a clear no-issue diagnosis as healthy even if severity is low', () => {
        const scan = {
            disease: 'Tiada Masalah Dikesan',
            severity: 'low',
            healthStatus: 'unhealthy',
            status: 'uncertain',
        };

        expect(isHealthy(scan)).toBe(true);
        expect(getStandardizedStatus(scan)).toBe('healthy');
    });

    it('keeps explicit disease findings unhealthy', () => {
        const scan = {
            disease: 'Leaf blight',
            severity: 'low',
            healthStatus: 'healthy',
        };

        expect(isHealthy(scan)).toBe(false);
        expect(getStandardizedStatus(scan)).toBe('unhealthy');
    });

    it('classifies confident disease scans as treatment-ready', () => {
        expect(getScanResultState({
            status: 'confirmed',
            healthStatus: 'unhealthy',
            confidence: 92,
            disease: 'Leaf Spot',
            pathogenType: 'Fungal',
            diseaseCategory: 'fungal',
        })).toBe(SCAN_RESULT_STATES.CONFIDENT_TREATMENT);
    });

    it('classifies retake scans as needing a closer photo', () => {
        expect(getScanResultState({
            status: 'retake_required',
            requiresRetake: true,
            retakeReason: 'IMAGE_TOO_BLURRY',
            disease: 'Unknown',
        })).toBe(SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO);
    });

    it('keeps possible nutrient and pest scans out of confident treatment', () => {
        expect(getScanResultState({
            status: 'likely',
            confidence: 76,
            diseaseCategory: 'nutrient',
            nutritionalIssues: { status: 'possible' },
        })).toBe(SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE);

        expect(getScanResultState({
            status: 'likely',
            confidence: 74,
            disease: 'Suspected mealybug',
            pathogenType: 'Pest',
            symptoms: ['White cottony residue'],
        })).toBe(SCAN_RESULT_STATES.POSSIBLE_PEST);
    });

    it('classifies weak conflicting disease scans as expert review needed', () => {
        expect(getScanResultState({
            status: 'likely',
            confidence: 66,
            disease: 'Leaf issue',
            diseaseCategory: 'unknown',
            abstainReason: 'Evidence is conflicting',
        })).toBe(SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED);
    });
});
