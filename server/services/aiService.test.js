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
});
