import { describe, expect, it, vi } from 'vitest';

vi.mock('openai', () => ({ default: vi.fn() }));

const { buildKeywordProductRecommendation } = await import('./aiService.js');

// A catalogue shaped like the live WooCommerce store: one tag per product class.
const TAGS = [
    { id: 1, name: 'Fungicide' },
    { id: 2, name: 'Insecticide' },
    { id: 3, name: 'Bactericide' },
    { id: 4, name: 'Miticide' },
    { id: 5, name: 'Fruit Fly Trap' },
    { id: 6, name: 'Copper' },
    { id: 7, name: 'Mancozeb' },
    { id: 8, name: 'Phosphite' },
    { id: 9, name: 'Neem Oil' },
    { id: 10, name: 'Tricyclazole' },
    { id: 11, name: 'NPK' },
    { id: 12, name: 'Trace Elements' },
    { id: 13, name: 'Magnesium' },
    { id: 14, name: 'Herbicide' },
    { id: 15, name: 'Garden Gloves' },
];
const CATEGORIES = [
    { id: 100, name: 'Disease Control' },
    { id: 101, name: 'Pest Control' },
    { id: 102, name: 'Fertilizer' },
    { id: 103, name: 'Supplement' },
    { id: 104, name: 'Tools' },
];

const confirmed = (overrides) => ({
    status: 'confirmed',
    resultState: 'confident_treatment',
    confidence: 92,
    healthStatus: 'unhealthy',
    productSearchTags: [],
    ...overrides,
});

const CASES = [
    { name: 'chilli anthracnose', diagnosis: { plantType: 'Chilli', disease: 'Anthracnose', pathogenType: 'fungal' }, expect: [1], forbid: [2, 3, 14] },
    { name: 'mango leaf spot', diagnosis: { plantType: 'Mango', disease: 'Fungal leaf spot', pathogenType: 'fungal' }, expect: [1], forbid: [2, 14] },
    { name: 'banana sigatoka', diagnosis: { plantType: 'Banana', disease: 'Black Sigatoka', pathogenType: 'fungal' }, expect: [1], forbid: [2, 14] },
    { name: 'durian phytophthora canker', diagnosis: { plantType: 'Durian', disease: 'Phytophthora stem canker', pathogenType: 'oomycete' }, expect: [1], forbid: [2, 14] },
    { name: 'rice blast', diagnosis: { plantType: 'Rice', disease: 'Rice blast', pathogenType: 'fungal' }, expect: [1], forbid: [2, 14] },
    { name: 'bacterial leaf blight', diagnosis: { plantType: 'Padi', disease: 'Bacterial leaf blight', pathogenType: 'bacterial' }, expect: [3], forbid: [2, 14] },
    { name: 'mealybug', diagnosis: { plantType: 'Papaya', disease: 'Mealybug infestation', pathogenType: 'pest' }, expect: [2], forbid: [1, 3, 14] },
    { name: 'spider mites', diagnosis: { plantType: 'Chilli', disease: 'Spider mites', pathogenType: 'pest' }, expect: [], expectAny: [2, 4], forbid: [3, 14] },
    { name: 'fruit fly', diagnosis: { plantType: 'Mango', disease: 'Fruit fly', pathogenType: 'pest' }, expect: [], expectAny: [2, 5], forbid: [1, 3, 14] },
];

describe('disease → product recommendation matrix', () => {
    it.each(CASES)('$name picks the right product class', ({ diagnosis, expect: required, expectAny, forbid }) => {
        const rec = buildKeywordProductRecommendation(confirmed(diagnosis), TAGS, CATEGORIES);
        for (const id of required) expect(rec.treatmentTagIds).toContain(id);
        if (expectAny) expect(rec.treatmentTagIds.some((id) => expectAny.includes(id))).toBe(true);
        for (const id of forbid) expect(rec.treatmentTagIds).not.toContain(id);
        expect(rec.treatmentTagIds).not.toContain(15);
    });

    it('recommends nutrition, not treatment, for a confirmed nutrient deficiency', () => {
        const rec = buildKeywordProductRecommendation(confirmed({
            plantType: 'Durian',
            disease: 'Magnesium deficiency',
            pathogenType: 'nutrient',
            diseaseCategory: 'nutrient',
            resultState: 'possible_nutrient_issue',
            nutritionalIssues: { status: 'confirmed', deficientNutrients: ['magnesium'] },
        }), TAGS, CATEGORIES);
        expect([...rec.fertilizerTagIds, ...rec.supplementTagIds].some((id) => [11, 12, 13].includes(id))).toBe(true);
        expect(rec.treatmentTagIds).not.toContain(1);
        expect(rec.treatmentTagIds).not.toContain(2);
    });

    it('shows no nutrition products when the deficiency is not backed by nutrient evidence', () => {
        const rec = buildKeywordProductRecommendation(confirmed({
            plantType: 'Durian',
            disease: 'Magnesium deficiency',
            pathogenType: 'nutrient',
            diseaseCategory: 'nutrient',
        }), TAGS, CATEGORIES);
        expect([...rec.fertilizerTagIds, ...rec.supplementTagIds]).toEqual([]);
    });

    it('never recommends treatment products for a healthy plant', () => {
        const rec = buildKeywordProductRecommendation({
            plantType: 'Chilli',
            disease: 'Healthy',
            healthStatus: 'healthy',
            status: 'confirmed',
            resultState: 'healthy',
            confidence: 95,
        }, TAGS, CATEGORIES);
        expect(rec.treatmentTagIds).toEqual([]);
        expect(rec.treatmentCategoryIds).toEqual([]);
    });

    it('withholds treatment products when the scan needs a retake', () => {
        const rec = buildKeywordProductRecommendation(confirmed({
            plantType: 'Chilli',
            disease: 'Anthracnose',
            pathogenType: 'fungal',
            status: 'retake_required',
            resultState: 'retake_required',
            requiresRetake: true,
            confidence: 40,
        }), TAGS, CATEGORIES);
        expect(rec.treatmentTagIds).toEqual([]);
    });
});
