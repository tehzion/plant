import { describe, expect, it } from 'vitest';
import { buildProductPlanDraftFromRecommendations } from './productPlanDraft.js';

describe('product plan drafts', () => {
    it('builds a spray draft for selected disease-control products', () => {
        const draft = buildProductPlanDraftFromRecommendations({
            diagnosis: {
                scanId: 'scan-1',
                plantType: 'Durian',
                disease: 'Leaf Spot',
                confidence: 92,
                severity: 'severe',
                resultState: 'confident_treatment',
            },
            recommendationIntent: 'treatment_ready',
            consultation: { phone: '+60136667810' },
            products: {
                diseaseControl: [
                    {
                        id: 10,
                        name: 'Copper Guard',
                        recommendationRole: 'treatment',
                        matchScore: 88,
                        matchedActiveIngredients: ['copper'],
                        cautionLevel: 'standard',
                    },
                ],
            },
            selectedProductIds: [10],
        });

        expect(draft).toMatchObject({
            activity_type: 'spray',
            chemical_name: 'Copper Guard',
            disease_name_observed: 'Leaf Spot',
            scout_severity: 'High',
            inspection_status: 'Urgent',
            expense_category: 'Pesticide',
        });
        expect(draft.note).toContain('Linked scan: scan-1');
        expect(draft.note).toContain('Copper Guard');
        expect(draft.note).toContain('active ingredient: copper');
    });

    it('builds a fertilizer draft for maintenance products', () => {
        const draft = buildProductPlanDraftFromRecommendations({
            diagnosis: {
                scanId: 'scan-healthy',
                plantType: 'Papaya',
                disease: 'None',
                resultState: 'healthy',
            },
            recommendationIntent: 'healthy_maintenance',
            products: {
                fertilizers: [
                    { id: 12, name: 'NPK 15-15-15', recommendationRole: 'fertilizer' },
                ],
            },
        });

        expect(draft).toMatchObject({
            activity_type: 'fertilize',
            chemical_name: 'NPK 15-15-15',
            disease_name_observed: '',
            inspection_type: 'Soil/Nutrient',
            expense_category: 'Fertilizer',
        });
    });

    it('builds a scouting draft when consultation is primary and no products are selected', () => {
        const draft = buildProductPlanDraftFromRecommendations({
            diagnosis: {
                scanId: 'scan-review',
                plantType: 'Coconut',
                disease: 'Bud rot',
                resultState: 'expert_review_needed',
            },
            recommendationIntent: 'consultation_needed',
            consultation: { phone: '+60136667810' },
            products: {},
        });

        expect(draft).toMatchObject({
            activity_type: 'scout',
            disease_name_observed: 'Bud rot',
            inspection_status: 'Action Required',
            expense_category: 'Labor',
        });
        expect(draft.note).toContain('Recommended products: none selected yet');
        expect(draft.note).toContain('+60136667810');
    });
});
