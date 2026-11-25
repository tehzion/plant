// @vitest-environment node
import { expect, it } from 'vitest';
import { summarizeReviewAgreement } from './reviewAgreementService.js';
it('withholds unmeasured or undersized rates', () => {
    expect(summarizeReviewAgreement([])).toMatchObject({ status: 'awaiting_reviews', top1: null, top3: null, reviewCoverage: null });
});
it('counts top three including the primary, excludes uncertainty and reports corrected high-confidence errors', () => {
    const result = summarizeReviewAgreement([
        { verdict: 'corrected', corrected_diagnosis: 'Late Blight', raw_result: { disease: 'Early Blight', plantType: 'Tomato', confidence: 95, differentialDiagnoses: [{ name: 'Late Blight' }] } },
        { verdict: 'confirmed', raw_result: { disease: 'Leaf spot', plantType: 'Chilli' } },
        { verdict: 'uncertain', raw_result: { disease: 'Unknown' } },
    ], 2);
    expect(result).toMatchObject({ reviewedCases: 3, evaluableCases: 2, uncertainOrIncomplete: 1, top1: { rate: 0.5 }, top3: { rate: 1 }, confidentlyWrong: { rate: 0.5 } });
    expect(result.crops.Tomato.top1Agreement).toBeNull();
    expect(result.note).toContain('not independent');
});
