import { describe, expect, it, vi } from 'vitest';

vi.mock('openai', () => ({
    default: class MockOpenAI {
        constructor() {
            this.chat = {
                completions: {
                    create: vi.fn(),
                },
            };
        }
    },
}));

vi.mock('form-data', () => ({
    default: class MockFormData {
        append() {}
        getHeaders() {
            return {};
        }
    },
}));

vi.mock('node-fetch', () => ({
    default: vi.fn(),
}));

vi.mock('dotenv', () => ({
    default: {
        config: vi.fn(),
    },
}));

const aiService = await import('./aiService.js');

describe('aiService helpers', () => {

    it('identifies generic product names correctly', () => {
        expect(aiService.isGenericProductName('baja')).toBe(true);
        expect(aiService.isGenericProductName('chemical')).toBe(true);
        expect(aiService.isGenericProductName('NPK 15-15-15')).toBe(false);
    });

    it('normalizes parsed logs so generic chemical names do not prefill the UI', () => {
        const parsed = aiService.normalizeParsedLogResult({
            type: 'spray',
            chemicalName: 'organic',
            quantity: '20L',
        });

        expect(parsed.chemicalName).toBeNull();
        expect(parsed.quantity).toBe('20L');
    });

    it('replaces generic fertilizer recommendations with specific alternatives', () => {
        const normalized = aiService.normalizeAnalysisResult(
            {
                disease: 'Potassium deficiency',
                nutritionalIssues: {
                    hasDeficiency: true,
                    deficientNutrients: [{ nutrient: 'Potassium' }],
                },
                fertilizerRecommendations: [
                    {
                        fertilizerName: 'fertilizer',
                    },
                ],
            },
            'en',
            {
                cropType: 'banana',
                info: {
                    localFertilizers: ['MOP (Muriate of Potash)', 'NPK MARDI 15-15-15'],
                },
            },
        );

        expect(normalized.fertilizerRecommendations[0].fertilizerName).toBe('MOP (Muriate of Potash)');
        expect(aiService.isGenericProductName(normalized.fertilizerRecommendations[0].fertilizerName)).toBe(false);
    });

    it('normalizes deficient nutrient items into a stable object shape', () => {
        expect(aiService.normalizeDeficientNutrients([
            'Potassium',
            {
                name: 'Magnesium',
                severity: 'Moderate',
                symptoms: 'Interveinal chlorosis',
                actions: ['Apply kieserite'],
            },
            null,
        ])).toEqual([
            {
                nutrient: 'Potassium',
                severity: '',
                symptoms: [],
                recommendations: [],
            },
            {
                nutrient: 'Magnesium',
                severity: 'Moderate',
                symptoms: ['Interveinal chlorosis'],
                recommendations: ['Apply kieserite'],
            },
        ]);
    });

    it('normalizes legacy nutritional issues into a confirmed deficiency state', () => {
        expect(aiService.normalizeNutritionalIssues({
            hasDeficiency: true,
            severity: 'Moderate',
            deficientNutrients: ['Potassium'],
        })).toEqual({
            status: 'confirmed',
            hasDeficiency: true,
            severity: 'Moderate',
            symptoms: [],
            deficientNutrients: [
                {
                    nutrient: 'Potassium',
                    severity: '',
                    symptoms: [],
                    recommendations: [],
                },
            ],
            possibleNutrients: [],
            reasoning: '',
        });
    });

    it('keeps possible nutrient overlap distinct from a confirmed deficiency', () => {
        expect(aiService.normalizeNutritionalIssues({
            status: 'possible',
            possibleNutrients: ['Magnesium', { nutrient: 'Potassium' }],
            symptoms: ['Interveinal yellowing'],
            reasoning: 'Fungal spotting is primary, but mild nutrient stress may also be contributing.',
        })).toEqual({
            status: 'possible',
            hasDeficiency: false,
            severity: 'Mild',
            symptoms: ['Interveinal yellowing'],
            deficientNutrients: [],
            possibleNutrients: ['Magnesium', 'Potassium'],
            reasoning: 'Fungal spotting is primary, but mild nutrient stress may also be contributing.',
        });
    });

    it('builds contextual ask-AI summaries from recent notes and alerts', () => {
        const summary = aiService.buildAskAIContextSummary(
            [
                {
                    created_at: '2026-03-27T10:00:00.000Z',
                    activity_type: 'spray',
                    plot_id: 'Plot A',
                    chemical_name: 'Mancozeb',
                    note: 'Sprayed lower canopy before rain',
                },
            ],
            [
                {
                    created_at: '2026-03-28T08:00:00.000Z',
                    disease: 'Leaf Spot',
                    severity: 'high',
                    category: 'Durian',
                },
            ],
            'en',
        );

        expect(summary).toContain('Recent farm notes');
        expect(summary).toContain('Mancozeb');
        expect(summary).toContain('Leaf Spot');
    });

    it('summarizes farm logs for AI without carrying photo payload noise', () => {
        const summary = aiService.summarizeFarmLogsForAI([
            {
                created_at: '2026-03-27T10:00:00.000Z',
                activity_type: 'spray',
                plot_id: 'Plot A',
                chemical_name: 'Mancozeb',
                note: 'Sprayed lower canopy before rain',
                photo_url: 'data:image/jpeg;base64,abc123',
            },
        ]);

        expect(summary).toEqual([
            expect.objectContaining({
                activity: 'spray',
                plot: 'Plot A',
                chemical: 'Mancozeb',
                note: 'Sprayed lower canopy before rain',
            }),
        ]);
        expect(JSON.stringify(summary)).not.toContain('photo_url');
        expect(JSON.stringify(summary)).not.toContain('data:image');
    });

    it('always includes healthy, fungal, and nutrient few-shot examples', () => {
        const examples = aiService.buildAnalyzeFewShotExamples('en');

        expect(examples).toContain('Healthy example');
        expect(examples).toContain('Fungal disease example');
        expect(examples).toContain('Nutrient deficiency example');
    });

    it('does not lock weak PlantNet identification as confirmed species context', () => {
        const assessment = aiService.assessSpeciesIdentification({
            scientificName: 'Mangifera indica',
            commonNames: ['Mango'],
            confidence: 17,
            allMatches: [
                { name: 'Mangifera indica', confidence: 17 },
                { name: 'Artocarpus heterophyllus', confidence: 12 },
            ],
        }, 'Fruit');

        expect(assessment.confirmed).toBe(false);
        expect(assessment.margin).toBe(5);
    });

    it('downgrades implausible bacterial diagnosis without bacterial evidence', () => {
        const filtered = aiService.applyDiseaseSanityFilters({
            disease: 'Angular leaf spot',
            healthStatus: 'unhealthy',
            severity: 'moderate',
            pathogenType: 'Bacterial',
            confidence: 82,
            status: 'confirmed',
            diagnosticEvidence: {
                lesionShape: 'round',
                lesionBorderHalo: 'yellow halo',
                evidenceFor: ['dark circular spots'],
                evidenceAgainst: [],
            },
        }, 'en');

        expect(filtered.status).not.toBe('confirmed');
        expect(filtered.needsMoreEvidence).toBe(true);
    });

    it('normalizes predictive-risk output so generic product names do not prefill spray actions', () => {
        const risk = aiService.normalizePredictiveRiskResult({
            hasRisk: true,
            riskLevel: 'high',
            warningMessage: 'Heavy rain may worsen leaf spot.',
            suggestedAction: 'Inspect affected blocks before rain.',
            recommendedTreatment: {
                activity: 'spray',
                chemical: 'fungicide',
            },
        });

        expect(risk.recommendedTreatment.activity).toBe('inspect');
        expect(risk.recommendedTreatment.chemical).toBeNull();
        expect(risk.recommendedTreatment.prefillAllowed).toBe(true);
    });

    it('drops invalid WooCommerce tag and category ids from AI product selections', () => {
        const validated = aiService.validateProductRecommendationSelection(
            {
                treatmentTagIds: ['10', '999', '10'],
                treatmentCategoryIds: [3, 'oops'],
                fertilizerTagIds: [22],
                fertilizerCategoryIds: [44],
                supplementTagIds: ['77', 'abc'],
                supplementCategoryIds: [88, 9999],
                reasoning: 'Matched store catalog ids only.',
            },
            [{ id: 10 }, { id: 22 }, { id: 77 }],
            [{ id: 3 }, { id: 44 }, { id: 88 }],
        );

        expect(validated).toEqual({
            treatmentTagIds: [10],
            treatmentCategoryIds: [3],
            fertilizerTagIds: [22],
            fertilizerCategoryIds: [44],
            supplementTagIds: [77],
            supplementCategoryIds: [88],
            reasoning: 'Matched store catalog ids only.',
        });
    });
});
