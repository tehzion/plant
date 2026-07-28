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

    it('anchors diagnosis-stage examples to named likely conditions and retake cases', () => {
        const examples = aiService.buildDiagnosisStageFewShotExamples('en');

        expect(examples).toContain('Papaya white cottony fruit patches');
        expect(examples).toContain('Suspected Papaya Mealybug / Scale Infestation');
        expect(examples).toContain('Coconut leaf lesion likely fungal blight');
        expect(examples).toContain('Likely Coconut Leaf Blight');
        expect(examples).toContain('Weak or blurred image retake');
        expect(examples).toContain('"requiresRetake": true');
    });

    it('diagnosis prompt requires named likely diagnoses instead of generic category labels', () => {
        const prompt = aiService.buildDiagnosisStagePrompt({
            plantNetResult: null,
            speciesAssessment: null,
            category: 'Papaya',
            language: 'en',
            userLocation: 'Malaysia',
            malaysiaCropInfo: {
                cropType: 'papaya',
                info: {
                    commonDiseases: [
                        'Papaya Mealybug - white cottony wax on fruit, stems, and leaf undersides',
                    ],
                    nutrientIssues: [],
                },
            },
            leafImage: null,
            imageQuality: null,
        });

        expect(prompt).toContain('primaryDiagnosis MUST be a named likely/suspected condition');
        expect(prompt).toContain('Avoid generic labels such as "Potential Pest Infestation"');
        expect(prompt).toContain('Never increase disease confidence only because PlantNet species confidence is high');
        expect(prompt).toContain('Visual evidence checklist');
        expect(prompt).toContain('needsMoreEvidence may be true');
        expect(prompt).toContain('Suspected Papaya Mealybug / Scale Infestation');
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

    it('builds safer PlantNet organ hints for fruit-heavy scans', () => {
        expect(aiService.buildPlantNetOrganHints({
            category: 'Papaya fruit',
            hasLeafImage: true,
        })).toEqual(['fruit', 'leaf', 'habit']);
    });

    it('creates confirmed species context only when PlantNet is strong and not conflicting', () => {
        const assessment = aiService.assessSpeciesIdentification({
            scientificName: 'Carica papaya',
            commonNames: ['Papaya'],
            confidence: 88,
            source: 'PlantNet',
            allMatches: [
                { name: 'Carica papaya', commonNames: ['Papaya'], confidence: 88 },
                { name: 'Mangifera indica', commonNames: ['Mango'], confidence: 12 },
            ],
        }, 'Papaya');

        const context = aiService.buildSpeciesContext({
            plantNetResult: { scientificName: 'Carica papaya', source: 'PlantNet', organHints: ['fruit', 'leaf'] },
            speciesAssessment: assessment,
            category: 'Papaya',
        });

        expect(context.confirmed).toBe(true);
        expect(context.categoryConflict).toBe(false);
        expect(context.scientificName).toBe('Carica papaya');
        expect(context.instruction).toContain('not disease evidence');
    });

    it('downgrades strong PlantNet context when it conflicts with the selected crop', () => {
        const assessment = aiService.assessSpeciesIdentification({
            scientificName: 'Mangifera indica',
            commonNames: ['Mango'],
            confidence: 90,
            allMatches: [
                { name: 'Mangifera indica', commonNames: ['Mango'], confidence: 90 },
                { name: 'Carica papaya', commonNames: ['Papaya'], confidence: 5 },
            ],
        }, 'Coconut');

        const context = aiService.buildSpeciesContext({
            plantNetResult: { scientificName: 'Mangifera indica', source: 'PlantNet' },
            speciesAssessment: assessment,
            category: 'Coconut',
        });

        expect(context.confirmed).toBe(false);
        expect(context.weak).toBe(true);
        expect(context.categoryConflict).toBe(true);
    });

    it('passes species context as a separate assistant message before image diagnosis', () => {
        const messages = aiService.createModelMessagesWithImages(
            'Return JSON',
            'data:image/jpeg;base64,tree',
            null,
            {
                source: 'PlantNet',
                confirmed: false,
                weak: true,
                categoryConflict: true,
                confidence: 42,
                margin: 2,
                userCategory: 'Coconut',
                topCandidates: [{ name: 'Mangifera indica', confidence: 42 }],
            },
        );

        expect(messages).toHaveLength(3);
        expect(messages[1].role).toBe('assistant');
        expect(messages[1].content).toContain('supporting crop/species context only');
        expect(messages[1].content).toContain('must not be treated as disease evidence');
        expect(messages[2].role).toBe('user');
    });

    it('uses user category as the species-context source when PlantNet is unavailable', () => {
        const context = aiService.buildSpeciesContext({
            plantNetResult: null,
            category: 'Coconut',
            source: 'User category',
        });

        expect(context.source).toBe('User category');
        expect(context.confirmed).toBe(false);
        expect(context.topCandidates[0].name).toBe('Coconut');
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

    it('keeps suspected pest results actionable without claiming confirmed treatment', () => {
        const fallback = aiService.createFallbackTreatmentPlan({
            disease: 'Potential Pest Infestation',
            healthStatus: 'unhealthy',
            pathogenType: 'pest',
            symptoms: ['white patches on fruit'],
            requiresRetake: true,
        }, 'en');

        expect(fallback.immediateActions.join(' ')).toContain('Inspect fruit clusters');
        expect(fallback.treatments.join(' ')).toContain('If pests are visible');
        expect(fallback.treatments.join(' ')).toContain('after field confirmation');
        expect(fallback.treatments.join(' ')).not.toContain('No treatment recommended');
        expect(fallback.productSearchTags).toContain('pest-control');
    });

    it('refines papaya white-patch pest results into a named suspected diagnosis', () => {
        const filtered = aiService.applyDiseaseSanityFilters({
            plantType: 'Carica papaya (Papaya)',
            disease: 'Potential Pest Infestation',
            healthStatus: 'unhealthy',
            severity: 'moderate',
            pathogenType: 'Pest',
            diseaseCategory: 'pest',
            confidence: 78,
            status: 'uncertain',
            needsMoreEvidence: true,
            additionalNotes: 'The presence of white patches suggests a pest issue, but further evidence is needed for a definitive diagnosis.',
            symptoms: ['white patches on papaya fruit'],
            diagnosticEvidence: {
                likelyCauseCategory: 'pest',
                evidenceFor: ['white cottony patches on fruit'],
            },
        }, 'en', {
            cropType: 'papaya',
            info: {
                commonDiseases: [
                    'Papaya Mealybug - white cottony wax on fruit, stems, and leaf undersides',
                    'Scale Insect Infestation - white or brown waxy patches on fruit and stems',
                ],
            },
        });

        expect(filtered.disease).toBe('Suspected Papaya Mealybug / Scale Infestation');
        expect(filtered.status).toBe('likely');
        expect(filtered.needsMoreEvidence).toBe(false);
        expect(filtered.additionalNotes).toContain('mealybug or scale-type pests');
        expect(filtered.additionalNotes).not.toContain('further evidence is needed');
        expect(filtered.productSearchTags).toContain('mealybug-control');
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

    it('keeps cautious product recommendation cache keys separate from confirmed diagnoses', () => {
        const likelyKey = aiService.buildProductRecommendationCacheKey({
            plantType: 'Papaya',
            disease: 'Suspected Papaya Mealybug / Scale Infestation',
            healthStatus: 'unhealthy',
            pathogenType: 'pest',
            status: 'likely',
            confidence: 78,
            diagnosisConfidence: 82,
            needsMoreEvidence: true,
            requiresRetake: false,
            diseaseCategory: 'pest',
            nutritionalStatus: 'none',
            diagnosticEvidence: { likelyCauseCategory: 'pest' },
            productSearchTags: ['pest-control'],
        }, 'en');

        const confirmedKey = aiService.buildProductRecommendationCacheKey({
            plantType: 'Papaya',
            disease: 'Suspected Papaya Mealybug / Scale Infestation',
            healthStatus: 'unhealthy',
            pathogenType: 'pest',
            status: 'confirmed',
            confidence: 94,
            diagnosisConfidence: 92,
            needsMoreEvidence: false,
            requiresRetake: false,
            diseaseCategory: 'pest',
            nutritionalStatus: 'none',
            diagnosticEvidence: { likelyCauseCategory: 'pest' },
            productSearchTags: ['pest-control'],
        }, 'en');

        expect(likelyKey).not.toBe(confirmedKey);
        expect(likelyKey).toContain('_likely_');
        expect(likelyKey).toContain('_needs-evidence_');
        expect(confirmedKey).toContain('_confirmed_');
        expect(confirmedKey).toContain('_evidence-ok_');
    });

    it('marks confident disease matches as treatment-ready and enriches products with match metadata', () => {
        const diagnosis = {
            scanId: 'scan-123',
            plantType: 'Durian',
            disease: 'Leaf Spot',
            healthStatus: 'unhealthy',
            pathogenType: 'fungal',
            status: 'confirmed',
            confidence: 91,
            diagnosisConfidence: 89,
            symptoms: ['Brown leaf spots'],
            treatments: ['Apply registered copper fungicide'],
            productSearchTags: ['fungicide', 'leaf-spot'],
        };
        const enriched = aiService.enrichRecommendedProducts([
            {
                id: 1,
                name: 'Copper Fungicide',
                description: 'Disease control for fungal leaf spot',
                tags: ['fungicide'],
                categories: ['Disease Control'],
            },
        ], diagnosis, 'treatment');

        expect(aiService.canRecommendTreatmentProducts(diagnosis)).toBe(true);
        expect(aiService.getProductRecommendationIntent(diagnosis, { treatmentCount: enriched.length })).toBe('treatment_ready');
        expect(enriched[0]).toMatchObject({
            recommendationRole: 'treatment',
            cautionLevel: 'standard',
        });
        expect(enriched[0].matchScore).toBeGreaterThan(0);
        expect(enriched[0].matchReason).toContain('Matched');
        expect(enriched[0].matchedTerms).toContain('fungicide');
    });

    it('routes uncertain or retake-needed scans to support-only consultation instead of treatment', () => {
        const diagnosis = {
            plantType: 'Papaya',
            disease: 'Possible Mealybug Infestation',
            healthStatus: 'unhealthy',
            pathogenType: 'pest',
            status: 'uncertain',
            confidence: 68,
            needsMoreEvidence: true,
            requiresRetake: true,
            productSearchTags: ['pest-control'],
        };

        expect(aiService.canRecommendTreatmentProducts(diagnosis)).toBe(false);
        expect(aiService.getProductRecommendationIntent(diagnosis, { treatmentCount: 3 })).toBe('support_only');
        expect(aiService.getProductCautionLevel(diagnosis, 'treatment')).toBe('consult_first');
    });

    it('uses consultation-needed when a strong disease scan has no direct treatment match', () => {
        const diagnosis = {
            scanId: 'scan-456',
            plantType: 'Coconut',
            disease: 'Bud Rot',
            healthStatus: 'unhealthy',
            pathogenType: 'fungal',
            status: 'confirmed',
            confidence: 88,
            severity: 'severe',
            locationName: 'Kota Tinggi',
            symptoms: ['Spear leaf collapse'],
        };
        const consultation = aiService.buildProductConsultation(
            diagnosis,
            aiService.PRODUCT_RECOMMENDATION_INTENTS.CONSULTATION_NEEDED,
            'en',
        );

        expect(aiService.getProductRecommendationIntent(diagnosis, { treatmentCount: 0, fertilizerCount: 2 })).toBe('consultation_needed');
        expect(consultation.priority).toBe('primary');
        expect(consultation.phone).toBe('+60136667810');
        expect(decodeURIComponent(consultation.url)).toContain('scan-456');
        expect(decodeURIComponent(consultation.url)).toContain('Bud Rot');
        expect(decodeURIComponent(consultation.url)).toContain('Kota Tinggi');
    });

    it('returns stored analysis unchanged when already in the target language', async () => {
        const result = await aiService.localizeStoredAnalysisResult({
            disease: 'Leaf Spot',
            analysisLanguage: 'ms',
        }, 'ms');

        expect(result).toEqual({
            disease: 'Leaf Spot',
            analysisLanguage: 'ms',
        });
    });

    it('does not overwrite analysisLanguage when localization is unavailable', async () => {
        const previousKey = process.env.OPENAI_API_KEY;
        delete process.env.OPENAI_API_KEY;

        const result = await aiService.localizeStoredAnalysisResult({
            disease: 'Leaf Spot',
            analysisLanguage: 'en',
        }, 'zh');

        process.env.OPENAI_API_KEY = previousKey;

        expect(result).toEqual({
            disease: 'Leaf Spot',
            analysisLanguage: 'en',
        });
    });
});
