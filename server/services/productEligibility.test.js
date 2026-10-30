// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildRecommendationReason, evaluateProductEligibility, partitionByEligibility } from './productEligibility.js';

const fungalDurian = { disease: 'Anthracnose (Colletotrichum)', diseaseCategory: 'fungal', plantType: 'Durian (Durio zibethinus)' };
const label = 'Registered product label: contact fungicide for use against leaf spot diseases.';

describe('product recommendation eligibility', () => {
    it('accepts a product whose purpose, crop and label information fit the diagnosis', () => {
        const result = evaluateProductEligibility({ name: 'Mancozeb 80WP', description: `${label} Suitable for durian and mango.` }, fungalDurian);
        expect(result).toMatchObject({ status: 'eligible', checks: { purpose: 'match', crop: 'compatible', labelInfo: 'available' } });
    });

    it('rejects a product listed only for other crops', () => {
        const result = evaluateProductEligibility({ name: 'Rice Blast Fungicide', description: `${label} For rice (padi) only.` }, fungalDurian);
        expect(result.status).toBe('not_suitable');
        expect(result.reasons).toContain('crop_not_listed');
    });

    it('does not recommend a product just because of a shared keyword', () => {
        // "leaf spot" appears in the text, but this is an insecticide.
        const result = evaluateProductEligibility({ name: 'Abamectin', description: 'Insecticide to control mites that cause leaf spot-like stippling on all crops.' }, fungalDurian);
        expect(result.status).toBe('not_suitable');
        expect(result.checks.purpose).toBe('conflict');
    });

    it('never treats herbicides or viral diseases as chemical treatment matches', () => {
        expect(evaluateProductEligibility({ name: 'Glyphosate', description: 'Herbicide for all crops weed control and plantation maintenance.' }, fungalDurian).status).toBe('not_suitable');
        expect(evaluateProductEligibility({ name: 'Copper fungicide', description: label }, { disease: 'Papaya Ringspot Virus', diseaseCategory: 'viral' }).status).toBe('not_suitable');
    });

    it('rejects products with known restrictions', () => {
        const result = evaluateProductEligibility({ name: 'Turf Fungicide', description: `${label} Turf use only.` }, fungalDurian);
        expect(result).toMatchObject({ status: 'not_suitable', checks: { restriction: 'restricted' } });
    });

    it('keeps products with missing label or crop information out of verified treatments', () => {
        expect(evaluateProductEligibility({ name: 'Fungicide' }, fungalDurian)).toMatchObject({ status: 'needs_verification', reasons: expect.arrayContaining(['label_info_missing']) });
        expect(evaluateProductEligibility({ name: 'Copper fungicide', description: label }, fungalDurian)).toMatchObject({ status: 'needs_verification', checks: { crop: 'not_stated' } });
    });

    it('accepts an unstated crop only when an expert-curated rule matched the product', () => {
        const product = { name: 'Copper fungicide', description: label };
        const match = { curatedRuleId: 'fungal_leaf_spot_anthracnose', matchedActiveIngredients: ['copper'], matchScore: 60 };
        expect(evaluateProductEligibility(product, fungalDurian, 'treatment', match).status).toBe('eligible');
    });

    it('requires an insecticidal purpose for pest damage', () => {
        const pest = { disease: 'Mealybug infestation', diseaseCategory: 'pest', plantType: 'Papaya' };
        expect(evaluateProductEligibility({ name: 'Neem oil', description: 'Botanical insecticide for mealybug and aphid control on papaya and vegetables.' }, pest).status).toBe('eligible');
        expect(evaluateProductEligibility({ name: 'Copper fungicide', description: `${label} papaya` }, pest).status).toBe('not_suitable');
    });

    it('applies lighter checks to fertiliser products but still excludes pesticides', () => {
        const nutrient = { disease: 'Potassium deficiency', diseaseCategory: 'nutrient', plantType: 'Banana' };
        expect(evaluateProductEligibility({ name: 'NPK 12-12-17', description: 'Compound fertiliser' }, nutrient, 'fertilizer').status).toBe('eligible');
        expect(evaluateProductEligibility({ name: 'Cypermethrin', description: 'Insecticide' }, nutrient, 'fertilizer').status).toBe('not_suitable');
    });

    it('partitions products and explains eligible recommendations', () => {
        const split = partitionByEligibility([
            { id: 1, name: 'Mancozeb 80WP', description: `${label} durian` },
            { id: 2, name: 'Fungicide' },
            { id: 3, name: 'Paraquat', description: 'Herbicide' },
        ], fungalDurian, 'treatment', 'ms');
        expect(split.eligible.map((product) => product.id)).toEqual([1]);
        expect(split.eligible[0].recommendationReason).toBe('Disenaraikan untuk Anthracnose; menyebut Durian');
        expect(split.discovery).toEqual([expect.objectContaining({ id: 2, discoveryOnly: true })]);
        expect(split.excluded).toBe(1);
        expect(buildRecommendationReason({ disease: 'Leaf spot' }, { checks: { curatedRule: true } })).toBe('Listed for Leaf spot; matches an expert-curated rule');
    });
});
