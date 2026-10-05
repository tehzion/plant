import { describe, expect, it } from 'vitest';
import { evaluateScanQuality, isExpertLabel } from './scanQualityEvaluation.js';
const expert = { scanId: '1', reviewStatus: 'expert_verified', reviewedBy: 'Reviewer A', reviewedAt: '2026-10-05T10:00:00Z',
    correctHealthy: false, correctDisease: 'Leaf Spot', correctCrop: 'Durian', correctCauseCategory: 'fungal' };

describe('expert evaluation', () => {
    it('rejects ordinary feedback and unnamed reviewers as verified labels', () => {
        expect(isExpertLabel({ wasCorrect: true })).toBe(false);
        expect(isExpertLabel({ ...expert, reviewedBy: 'unknown' })).toBe(false);
        expect(evaluateScanQuality([{ wasCorrect: true }], 1).status).toBe('awaiting_expert_labels');
    });
    it('counts a confidently wrong diagnosis and preserves explicit ground truth', () => {
        const report = evaluateScanQuality([{ ...expert, result: { disease: 'Rust', pathogenType: 'Fungal',
            status: 'high_confidence', confidence: 93, healthStatus: 'unhealthy' } }], 1);
        expect(report.top1Accuracy).toBe(0); expect(report.confidentlyWrongCases).toBe(1);
        expect(report.healthyAccuracy).toBe(1);
    });
    it('limits alternatives to three and deduplicates scan IDs', () => {
        const item = { ...expert, result: { disease: 'Rust', differentialDiagnoses: ['a', 'b', 'c', 'Leaf Spot'].map(name => ({ name })) } };
        const report = evaluateScanQuality([item, item], 1);
        expect(report.verifiedCases).toBe(1); expect(report.top3HitRate).toBe(0);
    });
    it('counts the primary diagnosis within the top-three budget', () => {
        const report = evaluateScanQuality([{ ...expert, result: { disease: 'Rust',
            differentialDiagnoses: ['a', 'b', 'Leaf Spot'].map(name => ({ name })) } }], 1);
        expect(report.top3HitRate).toBe(0);
        expect(report.healthyAccuracy).toBeNull();
        expect(report.reviewRate).toBe(1);
    });
});
