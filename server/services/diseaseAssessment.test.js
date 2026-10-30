import { describe, expect, it, vi } from 'vitest';
import { redactDosageInstructions, validateStructuredAssessment } from '../../shared/diseaseAssessment.js';

const openai = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('openai', () => ({ default: class { constructor() { this.chat = { completions: { create: openai.create } }; } } }));
const { mergeDiagnosisResult, runDiagnosisStageWithRetry, MAX_DIAGNOSIS_ATTEMPTS, localizeStoredAnalysisResult } = await import('./aiService.js');

// Mocked model output only — no provider is called in these tests.
const capture = { imageQualityConfidence: 88, requiresRetake: false, detailSufficient: true };
const diagnosis = (overrides = {}) => ({
    primaryDiagnosis: 'Early Blight',
    primaryScientificName: 'Alternaria solani',
    confidenceLevel: 'medium',
    healthStatus: 'unhealthy',
    severity: 'moderate',
    diseaseCategory: 'fungal',
    pathogenType: 'Fungal',
    diagnosisConfidence: 68,
    needsMoreEvidence: false,
    symptoms: ['Brown leaf lesions', 'Yellowing around affected areas'],
    additionalNotes: 'Lesions with concentric rings are consistent with early blight.',
    diagnosticEvidence: { evidenceFor: ['Concentric rings in lesions'], evidenceAgainst: ['No fruit lesions visible'] },
    differentialDiagnoses: [
        { name: 'Septoria Leaf Spot', category: 'fungal_disease', confidenceLevel: 'low', likelihood: 25,
            supportingEvidence: ['Brown spots on lower leaves'], weakeningEvidence: ['Lesions are larger than typical'],
            distinguishingFeatures: ['Septoria spots are small with grey centres and dark specks'] },
        { name: 'Nutrient Deficiency', category: 'nutrient_deficiency', confidenceLevel: 'low', likelihood: 15,
            distinguishingFeatures: ['Yellowing may occur without characteristic lesions'] },
    ],
    ...overrides,
});
const merge = (diagnosisOverrides = {}, extra = {}) => mergeDiagnosisResult({
    stageOne: { capture_assessment: capture, diagnosis_assessment: diagnosis(diagnosisOverrides) },
    stageTwo: { treatments: ['Spray mancozeb at 2 g/L every 7 days'], immediateActions: ['Remove badly affected leaves'], prevention: ['Improve airflow'] },
    language: 'en', category: 'Tomato', plantNetResult: null,
    speciesContext: { confirmed: true, confidence: 82, primaryName: 'Tomato', scientificName: 'Solanum lycopersicum', source: 'PlantNet' },
    speciesAssessment: { confidence: 82, confirmed: true }, imageQuality: { tree: { qualityConfidence: 90 } },
    ...extra,
});

describe('structured disease assessment', () => {
    it('returns a valid schema with a primary condition and meaningful alternatives', () => {
        const result = merge();
        const structured = result.structuredAssessment;
        expect(validateStructuredAssessment(structured)).toEqual([]);
        expect(structured.plant).toMatchObject({ scientific_name: 'Solanum lycopersicum', identification_status: 'likely' });
        expect(structured.assessment.primary_condition).toMatchObject({
            name: 'Early Blight', scientific_name: 'Alternaria solani', category: 'fungal_disease', confidence_level: 'medium',
        });
        expect(structured.assessment.alternative_conditions.map((item) => item.name)).toEqual(['Septoria Leaf Spot', 'Nutrient Deficiency']);
        expect(structured.assessment.alternative_conditions[0]).toMatchObject({
            supporting_evidence: ['Brown spots on lower leaves'],
            weakening_evidence: ['Lesions are larger than typical'],
            distinguishing_features: [expect.stringContaining('grey centres')],
        });
        expect(structured.assessment.symptoms_overlap).toBe(true);
        // Legacy fields stay intact for the existing result page and PDF.
        expect(result.differentialDiagnoses[0]).toMatchObject({ name: 'Septoria Leaf Spot', likelihood: 25 });
    });

    it('does not pad alternatives and drops duplicates, generic and unexplained entries', () => {
        const result = merge({ differentialDiagnoses: [
            { name: 'Early Blight (Alternaria solani)', reason: 'same as primary' },
            { name: 'Unknown', reason: 'placeholder' },
            'Bacterial Spot',
            { name: 'Bacterial Spot', supportingEvidence: ['Angular lesions near veins'] },
            { name: 'bacterial spot', reason: 'duplicate in other case' },
        ] });
        expect(result.structuredAssessment.assessment.alternative_conditions.map((item) => item.name)).toEqual(['Bacterial Spot']);
        expect(result.structuredAssessment.assessment.alternative_conditions[0].category).toBe('bacterial_disease');
    });

    it('caps alternatives at three', () => {
        const many = ['Rust', 'Anthracnose', 'Downy Mildew', 'Sunscald'].map((name) => ({ name, reason: `${name} remains possible` }));
        expect(merge({ differentialDiagnoses: many }).structuredAssessment.assessment.alternative_conditions).toHaveLength(3);
    });

    it('never rates an alternative as more certain than the primary condition', () => {
        const result = merge({ diagnosisConfidence: 45, confidenceLevel: 'low', differentialDiagnoses: [
            { name: 'Septoria Leaf Spot', confidenceLevel: 'high', likelihood: 90, reason: 'small spots' },
        ] });
        expect(result.structuredAssessment.assessment.alternative_conditions[0].confidence_level).toBe('low');
    });
});

describe('low-confidence handling', () => {
    it('asks for more evidence, recommends review and withholds chemical treatment', () => {
        const result = merge({ diagnosisConfidence: 42, confidenceLevel: 'high', needsMoreEvidence: true });
        const { assessment, recommendations } = result.structuredAssessment;
        // A model claiming "high" cannot override a weak numeric estimate.
        expect(result.confidenceLevel).toBe('low');
        expect(assessment.needs_expert_review).toBe(true);
        expect(assessment.additional_information_needed.length).toBeGreaterThan(0);
        expect(assessment.additional_information_needed.join(' ')).toMatch(/close-up/i);
        expect(assessment.follow_up_questions.length).toBeGreaterThan(0);
        expect(recommendations.product_matching_eligible).toBe(false);
        expect(recommendations.chemical_treatment_withheld).toBe(true);
        expect(result.treatments).toEqual([]);
        expect(validateStructuredAssessment(result.structuredAssessment)).toEqual([]);
    });

    it('localises fallback follow-up guidance', () => {
        const result = merge({ diagnosisConfidence: 40, needsMoreEvidence: true }, { language: 'ms' });
        expect(result.structuredAssessment.assessment.follow_up_questions[0]).toMatch(/simptom/i);
    });

    it('reports a retake rather than a diagnosis for unusable photos', () => {
        const result = merge({}, { imageQuality: { tree: { qualityConfidence: 20, requiresRetake: true } } });
        expect(result.structuredAssessment.assessment.status).toBe('retake_required');
        expect(result.structuredAssessment.assessment.primary_condition).toBeNull();
        expect(result.confidenceLevel).toBe('insufficient_evidence');
    });

    it('marks species uncertainty when identification is weak', () => {
        const result = merge({}, { speciesContext: { confirmed: false, confidence: 30, primaryName: 'Tomato' }, speciesAssessment: { confidence: 30 } });
        expect(result.structuredAssessment.plant.identification_status).toBe('uncertain');
    });
});

describe('treatment safety', () => {
    it('replaces model-generated dosages and spray intervals with label guidance', () => {
        const result = merge({ diagnosisConfidence: 92, confidenceLevel: 'high', resultState: 'confident_treatment' });
        expect(result.treatmentEligible).toBe(true);
        expect(result.treatments).toEqual(['Spray mancozeb at the rate on the registered product label at the interval on the label']);
        expect(redactDosageInstructions(['Semburan 20 ml per 10 liter setiap 14 hari'], 'ms')[0])
            .toBe('Semburan mengikut kadar pada label produk berdaftar mengikut selang pada label');
    });
});

describe('bounded retry for malformed AI output', () => {
    const reply = (content) => ({ model: 'mock-model', choices: [{ message: { content } }] });
    const valid = JSON.stringify({ capture_assessment: capture, diagnosis_assessment: diagnosis() });

    it('repairs a malformed reply with one extra call', async () => {
        const callModel = vi.fn()
            .mockResolvedValueOnce(reply('Sorry, here is the result: {not json'))
            .mockResolvedValueOnce(reply(valid));
        const { stage, attempts } = await runDiagnosisStageWithRetry([{ role: 'user', content: 'x' }], callModel);
        expect(attempts).toBe(2);
        expect(stage.diagnosis_assessment.primaryDiagnosis).toBe('Early Blight');
        expect(callModel.mock.calls[1][0].at(-1).content).toMatch(/malformed_json/);
    });

    it('stops after the attempt limit and raises a classified error', async () => {
        const callModel = vi.fn().mockResolvedValue(reply('{"capture_assessment": {}}'));
        await expect(runDiagnosisStageWithRetry([], callModel)).rejects.toMatchObject({ code: 'AI_RESPONSE_INVALID' });
        expect(callModel).toHaveBeenCalledTimes(MAX_DIAGNOSIS_ATTEMPTS);
    });

    it('does not retry a usable reply', async () => {
        const callModel = vi.fn().mockResolvedValue(reply(valid));
        await runDiagnosisStageWithRetry([], callModel);
        expect(callModel).toHaveBeenCalledOnce();
    });

    it('propagates provider failures without extra diagnosis calls', async () => {
        const callModel = vi.fn().mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }));
        await expect(runDiagnosisStageWithRetry([], callModel)).rejects.toMatchObject({ status: 429 });
        expect(callModel).toHaveBeenCalledOnce();
    });
});

describe('schema validation', () => {
    it('flags malformed structured assessments', () => {
        expect(validateStructuredAssessment(null)).toEqual(['not_an_object']);
        const bad = merge().structuredAssessment;
        bad.assessment.alternative_conditions.push({ name: 'Early Blight', confidence_level: 'low', supporting_evidence: [], weakening_evidence: [], distinguishing_features: [] });
        bad.recommendations.product_matching_eligible = true;
        bad.assessment.confidence_level = 'low';
        const issues = validateStructuredAssessment(bad);
        expect(issues).toEqual(expect.arrayContaining(['duplicate_alternative_2', 'alternative_without_comparison_2', 'products_eligible_with_low_confidence']));
    });
});

describe('stored result localisation', () => {
    it('rebuilds the structured comparison in the new language', async () => {
        vi.stubEnv('OPENAI_API_KEY', 'test-only-placeholder');
        const stored = { ...merge({ diagnosisConfidence: 45, needsMoreEvidence: true }), analysisLanguage: 'en' };
        // Mocked translation response; no provider is called.
        openai.create.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
            disease: 'Hawar Awal',
            differentialDiagnoses: [{ name: 'Bintik Daun Septoria', reason: 'bintik kecil', distinguishingFeatures: ['bintik kecil berpusat kelabu'] }],
            followUpQuestions: ['Bilakah simptom bermula?'],
        }) } }] });
        const localized = await localizeStoredAnalysisResult(stored, 'ms');
        vi.unstubAllEnvs();
        const { assessment } = localized.structuredAssessment;
        expect(assessment.primary_condition.name).toBe('Hawar Awal');
        expect(assessment.alternative_conditions[0]).toMatchObject({ name: 'Bintik Daun Septoria', distinguishing_features: ['bintik kecil berpusat kelabu'] });
        expect(assessment.follow_up_questions).toEqual(['Bilakah simptom bermula?']);
        expect(validateStructuredAssessment(localized.structuredAssessment)).toEqual([]);
    });
});
