import { describe, expect, it, vi } from 'vitest';
vi.mock('openai', () => ({ default: class {} }));
const { buildDiagnosisStagePrompt, buildDiagnosisStageFewShotExamples } = await import('./diagnosis.js');

const prompt = (language = 'en') => buildDiagnosisStagePrompt({ plantNetResult: null, speciesAssessment: { confidence: 0 },
    speciesContext: { confirmed: true, categoryConflict: false }, category: 'Tomato', language, userLocation: 'Johor', malaysiaCropInfo: null, leafImage: null, imageQuality: null });

// Each rule answers an error seen in the October 2026 dataset runs or in stored production results.
describe('diagnosis prompt rules', () => {
    it('asks for the specific disease instead of a symptom name', () => {
        expect(prompt()).toMatch(/"Leaf Spot", "Leaf Blight", "Fungal Leaf Spot", "Chlorosis" or "Rust" alone are not acceptable/);
    });
    it('compares the tomato, grape, corn, mite, citrus and padi look-alikes', () => {
        const text = prompt();
        for (const name of ['Septoria Leaf Spot', 'Bacterial Spot', 'Target Spot', 'Esca', 'Gray Leaf Spot', 'Spider mites', 'Citrus greening', 'Brown Spot']) {
            expect(text).toContain(name);
        }
        expect(text).toMatch(/Do not default to Early Blight/);
    });
    it('anchors high confidence to a visible hallmark sign with look-alikes ruled out', () => {
        expect(prompt()).toMatch(/80 or more only when the hallmark sign/);
    });
    it('flags temperate diseases as unusual in Malaysia', () => {
        expect(prompt()).toMatch(/Cedar Apple Rust/);
    });
    it('asks for plain words in every language', () => {
        expect(prompt('ms')).toMatch(/avoid nekrotik, lesi, klorosis and halo/);
    });
    it('keeps hedge words and second conditions out of the disease name', () => {
        expect(prompt()).toMatch(/Do not put hedge words/);
    });
});

describe('few-shot examples', () => {
    it('never show a generic name as the main answer', () => {
        const examples = buildDiagnosisStageFewShotExamples('en');
        expect(examples).not.toMatch(/"primaryDiagnosis": "Leaf Spot"/);
        expect(examples).toMatch(/"primaryDiagnosis": "Anthracnose"/);
    });
    it('use plain Malay', () => {
        const examples = buildDiagnosisStageFewShotExamples('ms');
        expect(examples).not.toMatch(/\b(lesi|Lesi|nekrotik|klorosis)\b/);
    });
});
