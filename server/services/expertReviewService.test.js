// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryNeon: vi.fn(), verifyUser: vi.fn() }));
vi.mock('../utils/neonDatabase.js', () => ({ queryNeon: mocks.queryNeon, getNeonPool: vi.fn() }));
vi.mock('../utils/supabaseAuth.js', () => ({ verifyAuthenticatedUser: mocks.verifyUser, getServiceClient: () => null }));

import { getReviewCase, submitExpertReview, validateReviewInput, verifyReviewerRequest } from './expertReviewService.js';

const REVIEWER = { id: '44444444-4444-4444-8444-444444444444', email: 'agronomist@example.org' };
const aiResult = { disease: 'Early Blight', confidence: 64, structuredAssessment: { assessment: { confidence_level: 'medium', primary_condition: { name: 'Early Blight' }, alternative_conditions: [{ name: 'Septoria Leaf Spot', confidence_level: 'low' }] } } };

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ADMIN_EMAILS', 'admin@example.org');
    vi.stubEnv('EXPERT_REVIEWER_EMAILS', 'Agronomist@example.org');
});
afterEach(() => vi.unstubAllEnvs());

describe('expert review authorisation', () => {
    it('allows approved reviewers and admins', async () => {
        mocks.verifyUser.mockResolvedValueOnce(REVIEWER);
        await expect(verifyReviewerRequest({})).resolves.toEqual(REVIEWER);
        mocks.verifyUser.mockResolvedValueOnce({ id: 'admin-id', email: 'ADMIN@example.org' });
        await expect(verifyReviewerRequest({})).resolves.toMatchObject({ email: 'admin@example.org' });
    });

    it('rejects signed-in farmers who are not reviewers', async () => {
        mocks.verifyUser.mockResolvedValueOnce({ id: 'farmer', email: 'farmer@example.org' });
        await expect(verifyReviewerRequest({})).rejects.toMatchObject({ status: 403 });
    });

    it('rejects unauthenticated callers', async () => {
        mocks.verifyUser.mockRejectedValueOnce(Object.assign(new Error('Sign-in is required.'), { status: 401 }));
        await expect(verifyReviewerRequest({})).rejects.toMatchObject({ status: 401 });
    });

    it('is closed when no reviewers are configured', async () => {
        vi.stubEnv('ADMIN_EMAILS', ''); vi.stubEnv('EXPERT_REVIEWER_EMAILS', '');
        await expect(verifyReviewerRequest({})).rejects.toMatchObject({ status: 503 });
        expect(mocks.verifyUser).not.toHaveBeenCalled();
    });
});

describe('expert review records', () => {
    it('stores a correction as a new attributed record and never updates the AI assessment', async () => {
        mocks.queryNeon
            .mockResolvedValueOnce({ rows: [{ raw_result: aiResult }] })
            .mockImplementationOnce(async (_sql, values) => ({ rows: [{ id: 'r1', verdict: values[3], reviewer_email: values[2] }] }));
        const review = await submitExpertReview(REVIEWER, 'scan-1', {
            verdict: 'corrected', correctedDiagnosis: 'Septoria Leaf Spot', notes: 'Small lesions with dark specks.',
            productReviews: [{ productId: 101, productName: 'Copper fungicide', verdict: 'needs_more_information', note: 'Check crop on label' }],
        });
        expect(review).toMatchObject({ verdict: 'corrected', reviewer_email: REVIEWER.email });
        const [sql, values] = mocks.queryNeon.mock.calls[1];
        expect(sql).toMatch(/insert into public\.diagnosis_expert_reviews/);
        expect(values.slice(0, 6)).toEqual(['scan-1', REVIEWER.id, REVIEWER.email, 'corrected', null, 'Septoria Leaf Spot']);
        expect(JSON.parse(values[9])).toEqual([{ productId: '101', productName: 'Copper fungicide', verdict: 'needs_more_information', note: 'Check crop on label' }]);
        expect(values[10]).toMatchObject({ disease: 'Early Blight', confidenceLevel: 'medium' });
        expect(mocks.queryNeon.mock.calls.some(([statement]) => /update|delete/i.test(statement))).toBe(false);
    });

    it('validates verdicts, corrections and product reviews', () => {
        expect(() => validateReviewInput({ verdict: 'approve' })).toThrow(/confirmed, corrected or uncertain/);
        expect(() => validateReviewInput({ verdict: 'corrected' })).toThrow(/correct diagnosis or crop/);
        expect(() => validateReviewInput({ verdict: 'confirmed', productReviews: [{ productName: 'X', verdict: 'great' }] })).toThrow(/suitable/);
        expect(validateReviewInput({ verdict: 'uncertain' }).flaggedUncertain).toBe(true);
    });

    it('rejects reviews for unknown assessments and malformed IDs', async () => {
        mocks.queryNeon.mockResolvedValueOnce({ rows: [] });
        await expect(submitExpertReview(REVIEWER, 'missing', { verdict: 'confirmed' })).rejects.toMatchObject({ status: 404 });
        await expect(submitExpertReview(REVIEWER, '../etc', { verdict: 'confirmed' })).rejects.toMatchObject({ status: 400 });
    });

    it('keeps farmer feedback separate and labelled in the case view', async () => {
        mocks.queryNeon
            .mockResolvedValueOnce({ rows: [{ id: 'scan-1', created_at: 'now', category: 'Tomato', images: {}, raw_result: aiResult }] })
            .mockResolvedValueOnce({ rows: [{ id: 'r1', verdict: 'confirmed', reviewer_email: REVIEWER.email }] })
            .mockResolvedValueOnce({ rows: [{ created_at: 'now', feedback: { wasCorrect: false, correctDisease: 'Rust', attribution: { source: 'farmer', submitterHash: 'x' } } }] })
            .mockResolvedValueOnce({ rows: [] });
        const view = await getReviewCase('scan-1');
        expect(view.expertReviews).toHaveLength(1);
        expect(view.farmerFeedback).toEqual([expect.objectContaining({ source: 'farmer', verified: true, correctDisease: 'Rust' })]);
        expect(JSON.stringify(view.farmerFeedback)).not.toContain('submitterHash');
        expect(view.aiAssessment.alternatives).toEqual([{ name: 'Septoria Leaf Spot', confidence_level: 'low' }]);
    });

    it('lists every product the farmer was shown before ones they only clicked', async () => {
        const shown = { treatment: [{ id: 11, name: 'Copper fungicide', eligibility: 'eligible' }], fertilizer: [{ id: 22, name: 'NPK 15-15-15' }], supplement: [], discovery: [] };
        mocks.queryNeon
            .mockResolvedValueOnce({ rows: [{ id: 'scan-1', created_at: 'now', category: 'Tomato', images: {}, raw_result: aiResult, shown_recommendations: shown }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [
                { product_id: 11, product_name: 'Copper fungicide', recommendation_role: 'treatment' },
                { product_id: 33, product_name: 'Seaweed extract', recommendation_role: 'supplement' },
            ] });
        const view = await getReviewCase('scan-1');
        expect(view.shownRecommendations).toEqual(shown);
        expect(view.products).toEqual([
            { productId: 11, productName: 'Copper fungicide', role: 'treatment', shown: true },
            { productId: 22, productName: 'NPK 15-15-15', role: 'fertilizer', shown: true },
            { productId: 33, productName: 'Seaweed extract', role: 'supplement' },
        ]);
    });
});

describe('farmer-facing review summary', () => {
    it('exposes only the verdict and correction, not reviewer identity or notes', async () => {
        const { getFarmerReviewSummary } = await import('./expertReviewService.js');
        mocks.queryNeon.mockResolvedValueOnce({ rows: [{ verdict: 'corrected', corrected_diagnosis: 'Rust', corrected_crop: null, created_at: 'now' }] });
        const summary = await getFarmerReviewSummary('scan-1');
        expect(summary).toEqual({ verdict: 'corrected', correctedDiagnosis: 'Rust', correctedCrop: null, reviewedAt: 'now' });
        expect(mocks.queryNeon.mock.calls[0][0]).not.toMatch(/reviewer|notes/);
        mocks.queryNeon.mockResolvedValueOnce({ rows: [] });
        expect(await getFarmerReviewSummary('scan-1')).toBeNull();
    });
});
