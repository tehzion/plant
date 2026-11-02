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
      showRecoveryProducts: true,
    });
  });

  it('offers recovery products for a sick plant but not for a retake, an unclear or a healthy result', () => {
    const unsureDisease = { disease: 'Brown Spot', diseaseCategory: 'fungal', healthStatus: 'unhealthy', confidence: 60 };
    expect(getScanSectionPolicy(unsureDisease).showRecoveryProducts).toBe(true);
    expect(getScanSectionPolicy({ ...unsureDisease, requiresRetake: true }).showRecoveryProducts).toBe(false);
    expect(getScanSectionPolicy({ disease: 'No clear diagnosis yet', healthStatus: 'unknown' }).showRecoveryProducts).toBe(false);
    expect(getScanSectionPolicy({ disease: 'No Issues', healthStatus: 'healthy', resultState: 'healthy', confidence: 92 }).showRecoveryProducts).toBe(false);
    expect(getScanSectionPolicy({ ...unsureDisease, secondCheck: { applied: true } }).showRecoveryProducts).toBe(false);
  });

  it('shows no products once the second photo check has vetoed the result', () => {
    expect(getScanSectionPolicy({ ...confidentFungalScan, secondCheck: { applied: true } }))
      .toMatchObject({ showNutritionProducts: false, showDiseaseProducts: false });
    expect(getScanSectionPolicy({ disease: 'No Issues', healthStatus: 'healthy', resultState: 'healthy', confidence: 92, secondCheck: { applied: true } }))
      .toMatchObject({ showNutritionProducts: false });
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
      showRecoveryProducts: false,
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
    it('withholds treatment for tomato Early Blight when Late Blight, Leaf Mold and bacterial spot were never weighed', () => {
        const decision = assessScanDecision({ ...confident, plantType: 'Tomato (Solanum lycopersicum)', differentialDiagnoses: [{ name: 'Septoria Leaf Spot' }] });
        expect(decision.treatmentEligible).toBe(false);
        expect(decision.missingLookAlikes).toEqual(['Late Blight', 'Leaf Mold', 'Bacterial Leaf Spot']);
    });
    it('allows treatment once the look-alikes were compared, including by scientific name', () => {
        const decision = assessScanDecision({ ...confident, plantType: 'Tomato', differentialDiagnoses: [{ name: 'Late Blight' }, { name: 'Other', scientificName: 'Passalora fulva' }, { name: 'Bacterial spot' }] });
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

describe('unsure healthy verdict', () => {
    const noIssues = {
        schemaVersion: 2, healthStatus: 'healthy', disease: 'No Issues', diseaseCategory: 'healthy',
        diagnosisConfidence: 76, captureAssessment: { imageQualityConfidence: 90 },
    };
    it('is not shown as healthy below high confidence', () => {
        const decision = assessScanDecision({ ...noIssues, confidenceLevel: 'medium' });
        expect(decision.healthy).toBe(false);
        expect(decision.treatmentEligible).toBe(false);
        expect(decision.needsReview).toBe(true);
    });
    it('stays healthy at high confidence and for older scans without a level', () => {
        expect(assessScanDecision({ ...noIssues, diagnosisConfidence: 88, confidenceLevel: 'high' }).healthy).toBe(true);
        expect(assessScanDecision({ ...noIssues, diagnosisConfidence: 88 }).healthy).toBe(true);
        expect(assessScanDecision({ ...noIssues, disease: 'Tiada Masalah', diagnosisConfidence: 88, confidenceLevel: 'high' }).healthy).toBe(true);
    });
});

describe('subtle signs on a healthy verdict', () => {
    const noIssues = {
        schemaVersion: 2, healthStatus: 'healthy', disease: 'No Issues', diseaseCategory: 'healthy',
        diagnosisConfidence: 88, confidenceLevel: 'high', captureAssessment: { imageQualityConfidence: 90 },
    };
    it('is not shown as healthy when any sign is present or unclear', () => {
        expect(assessScanDecision({ ...noIssues, subtleSigns: { paleStippling: 'unclear', powderyFilm: 'absent' } }).healthy).toBe(false);
        expect(assessScanDecision({ ...noIssues, subtleSigns: { powderyFilm: 'present' } }).healthy).toBe(false);
    });
    it('stays healthy when every reported sign is absent', () => {
        expect(assessScanDecision({ ...noIssues, subtleSigns: { paleStippling: 'absent', powderyFilm: 'absent' } }).healthy).toBe(true);
    });
});

describe('decision gaps found in the November 2026 review', () => {
  const confident = { status: 'confirmed', diagnosisConfidence: 88, confidence: 82, healthStatus: 'unhealthy',
    schemaVersion: 2, captureAssessment: { imageQualityConfidence: 85 }, diseaseCategory: 'fungal' };
  const cases = [
    // [name, scan, expected resultState]
    ['rice blast without brown spot weighed', { ...confident, plantType: 'Padi', disease: 'Penyakit Karah Padi (blast)' }, 'expert_review_needed'],
    ['rice blast with brown spot weighed', { ...confident, plantType: 'Rice', disease: 'Rice blast',
      differentialDiagnoses: [{ name: 'Brown spot' }] }, 'confident_treatment'],
    ['brown spot without blast weighed', { ...confident, plantType: 'Padi', disease: 'Bintik Perang' }, 'expert_review_needed'],
    ['leaf blight without leaf streak weighed', { ...confident, plantType: 'Padi', disease: 'Hawar Daun Bakteria', diseaseCategory: 'bacterial' }, 'expert_review_needed'],
    ['chilli cercospora without bacterial spot weighed', { ...confident, plantType: 'Cili', disease: 'Cercospora leaf spot' }, 'expert_review_needed'],
    ['tomato early blight without bacterial spot weighed', { ...confident, plantType: 'Tomato', disease: 'Early Blight',
      differentialDiagnoses: [{ name: 'Late Blight' }, { name: 'Leaf Mold' }] }, 'expert_review_needed'],
    ['tomato early blight with all look-alikes weighed', { ...confident, plantType: 'Tomato', disease: 'Early Blight',
      differentialDiagnoses: [{ name: 'Late Blight' }, { name: 'Leaf Mold' }, { name: 'Bacterial Spot' }] }, 'confident_treatment'],
    ['virus named but category mislabelled', { ...confident, plantType: 'Tomato', disease: 'Tomato spotted wilt virus', diseaseCategory: 'disease' }, 'expert_review_needed'],
    ['virus in Chinese with no category', { ...confident, plantType: '辣椒', disease: '辣椒病毒病', diseaseCategory: '' }, 'expert_review_needed'],
    ['crop not stated and not confirmed', { ...confident, plantType: 'Tomato', disease: 'Septoria leaf spot',
      speciesAssessment: { confirmed: false, farmerStatedCrop: false } }, 'expert_review_needed'],
    ['crop stated by the farmer', { ...confident, plantType: 'Tomato', disease: 'Septoria leaf spot',
      speciesAssessment: { confirmed: false, farmerStatedCrop: true } }, 'confident_treatment'],
    ['crop confirmed by the species check', { ...confident, plantType: 'Tomato', disease: 'Septoria leaf spot',
      speciesAssessment: { confirmed: true, farmerStatedCrop: false } }, 'confident_treatment'],
    ['older scan without the crop flag', { ...confident, plantType: 'Tomato', disease: 'Septoria leaf spot',
      speciesAssessment: { confirmed: false } }, 'confident_treatment'],
  ];
  it.each(cases)('%s', (_name, scan, expected) => {
    expect(assessScanDecision(scan).resultState).toBe(expected);
  });

  it('marks a serious unconfirmed problem as urgent, but not a retake or a confident call', () => {
    expect(assessScanDecision({ ...confident, disease: 'Unknown rot', diagnosisConfidence: 50, severity: 'severe' }).urgent).toBe(true);
    expect(assessScanDecision({ ...confident, disease: 'Unknown rot', diagnosisConfidence: 50, severity: 'mild' }).urgent).toBe(false);
    expect(assessScanDecision({ ...confident, disease: 'Unknown rot', requiresRetake: true, severity: 'severe' }).urgent).toBe(false);
    expect(assessScanDecision({ ...confident, plantType: 'Tomato', disease: 'Septoria leaf spot', severity: 'severe' }).urgent).toBe(false);
  });
});
