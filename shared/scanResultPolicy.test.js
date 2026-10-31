import { describe, expect, it } from 'vitest';
import { assessScanDecision, getScanSectionPolicy } from './scanResultPolicy.js';

const confidentFungalScan = {
  disease: 'Fungal leaf spot',
  diseaseCategory: 'fungal',
  pathogenType: 'fungal',
  status: 'confirmed',
  resultState: 'confident_treatment',
  confidence: 92,
  healthStatus: 'unhealthy',
};

describe('getScanSectionPolicy', () => {
  it('keeps confident disease products out of nutrition', () => {
    expect(getScanSectionPolicy(confidentFungalScan)).toEqual({
      nutritionStatus: 'none',
      nutritionPrimary: false,
      diseasePrimary: true,
      showNutritionProducts: false,
      showDiseaseProducts: true,
    });
  });

  it('makes confirmed nutrient findings nutrition-first', () => {
    const policy = getScanSectionPolicy({
      disease: 'Potassium deficiency',
      diseaseCategory: 'nutrient',
      resultState: 'possible_nutrient_issue',
      nutritionalIssues: {
        status: 'confirmed',
        hasDeficiency: true,
        deficientNutrients: ['Potassium'],
      },
      healthStatus: 'unhealthy',
    });

    expect(policy.nutritionStatus).toBe('confirmed');
    expect(policy.nutritionPrimary).toBe(true);
    expect(policy.diseasePrimary).toBe(false);
    expect(policy.showNutritionProducts).toBe(true);
    expect(policy.showDiseaseProducts).toBe(false);
  });

  it('keeps disease primary while allowing evidence-backed nutrition support for mixed scans', () => {
    const policy = getScanSectionPolicy({
      ...confidentFungalScan,
      nutritionalIssues: {
        status: 'possible',
        possibleNutrients: ['Magnesium'],
        reasoning: 'Mild interveinal yellowing may also reflect magnesium stress.',
      },
    });

    expect(policy.nutritionStatus).toBe('possible');
    expect(policy.nutritionPrimary).toBe(false);
    expect(policy.diseasePrimary).toBe(true);
    expect(policy.showNutritionProducts).toBe(true);
    expect(policy.showDiseaseProducts).toBe(true);
  });

  it('allows maintenance nutrition support for healthy plants without disease products', () => {
    const policy = getScanSectionPolicy({
      disease: 'Healthy Plant',
      healthStatus: 'healthy',
      resultState: 'healthy',
    });

    expect(policy.nutritionStatus).toBe('none');
    expect(policy.nutritionPrimary).toBe(false);
    expect(policy.diseasePrimary).toBe(false);
    expect(policy.showNutritionProducts).toBe(true);
    expect(policy.showDiseaseProducts).toBe(false);
  });

  it('blocks both product groups for a retake without nutrient evidence', () => {
    expect(getScanSectionPolicy({
      disease: 'Unknown',
      resultState: 'needs_closer_photo',
      requiresRetake: true,
      healthStatus: 'unhealthy',
    })).toEqual({
      nutritionStatus: 'none',
      nutritionPrimary: false,
      diseasePrimary: false,
      showNutritionProducts: false,
      showDiseaseProducts: false,
    });
  });

  it('does not treat an unsupported possible label as nutrient evidence', () => {
    const policy = getScanSectionPolicy({
      disease: 'Fungal leaf spot',
      diseaseCategory: 'fungal',
      resultState: 'expert_review_needed',
      nutritionalIssues: {
        status: 'possible',
        reasoning: 'The cause is unclear.',
      },
      healthStatus: 'unhealthy',
    });

    expect(policy.showNutritionProducts).toBe(false);
    expect(policy.showDiseaseProducts).toBe(false);
  });
});

describe('look-alike safety rule', () => {
    const confident = {
        schemaVersion: 2, status: 'high_confidence', healthStatus: 'unhealthy', diseaseCategory: 'fungal',
        diagnosisConfidence: 90, captureAssessment: { imageQualityConfidence: 90 },
        disease: 'Early Blight', primaryScientificName: 'Alternaria solani',
    };
    it('withholds treatment for tomato Early Blight when Late Blight and Leaf Mold were never weighed', () => {
        const decision = assessScanDecision({ ...confident, plantType: 'Tomato (Solanum lycopersicum)', differentialDiagnoses: [{ name: 'Septoria Leaf Spot' }] });
        expect(decision.treatmentEligible).toBe(false);
        expect(decision.missingLookAlikes).toEqual(['Late Blight', 'Leaf Mold']);
    });
    it('allows treatment once the look-alikes were compared, including by scientific name', () => {
        const decision = assessScanDecision({ ...confident, plantType: 'Tomato', differentialDiagnoses: [{ name: 'Late Blight' }, { name: 'Other', scientificName: 'Passalora fulva' }] });
        expect(decision.missingLookAlikes).toEqual([]);
        expect(decision.treatmentEligible).toBe(true);
    });
    it('only requires Late Blight on potato and matches Malay and Chinese names', () => {
        expect(assessScanDecision({ ...confident, plantType: 'Kentang', disease: 'Hawar Awal', primaryScientificName: '' }).missingLookAlikes).toEqual(['Late Blight']);
        expect(assessScanDecision({ ...confident, plantType: '番茄', disease: '晚疫病', primaryScientificName: '', differentialDiagnoses: [{ name: '早疫病' }] }).treatmentEligible).toBe(true);
    });
    it('leaves other crops and diseases unchanged', () => {
        const decision = assessScanDecision({ ...confident, plantType: 'Corn (Zea mays)', disease: 'Northern Corn Leaf Blight', primaryScientificName: 'Exserohilum turcicum' });
        expect(decision.missingLookAlikes).toEqual([]);
        expect(decision.treatmentEligible).toBe(true);
    });
});
