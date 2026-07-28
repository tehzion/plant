import { describe, expect, it } from 'vitest';
import {
  buildProductDiagnosisPayload,
  createProductConsultationFromDiagnosis,
  createProductRecommendationsKey,
  normalizeProductRecommendationsResponse,
} from './liveProductRecommendations.js';

describe('live product recommendation payloads', () => {
  it('carries diagnosis status, evidence, treatment context, and nutrition status', () => {
    const payload = buildProductDiagnosisPayload({
      plantType: 'Papaya',
      disease: 'Suspected Papaya Mealybug / Scale Infestation',
      scanResult: {
        status: 'likely',
        resultState: 'possible_pest',
        confidence: 78,
        confidenceBreakdown: { diagnosisConfidence: 82 },
        needsMoreEvidence: true,
        healthStatus: 'unhealthy',
        pathogenType: 'Pest',
        diseaseCategory: 'pest',
        symptoms: ['White cottony patches'],
        immediateActions: ['Inspect fruit clusters'],
        treatments: ['Use registered pest product after field confirmation'],
        prevention: ['Monitor nearby plants'],
        productSearchTags: ['mealybug-control', 'pest-control'],
        diagnosticEvidence: {
          likelyCauseCategory: 'pest',
          evidenceFor: ['white cottony residue'],
          evidenceAgainst: ['no sunken rot'],
        },
        nutritionalIssues: { status: 'possible' },
      },
    });

    expect(payload).toMatchObject({
      status: 'likely',
      resultState: 'possible_pest',
      confidence: 78,
      diagnosisConfidence: 82,
      needsMoreEvidence: true,
      diseaseCategory: 'pest',
      nutritionalStatus: 'possible',
    });
    expect(payload.immediateActions).toContain('Inspect fruit clusters');
    expect(payload.diagnosticEvidence.evidenceFor).toContain('white cottony residue');
    expect(payload.productSearchTags).toContain('mealybug-control');
  });

  it('includes conservative diagnosis fields in the recommendation cache key', () => {
    const first = createProductRecommendationsKey({
      plantType: 'Papaya',
      disease: 'Suspected Papaya Mealybug / Scale Infestation',
      status: 'likely',
      resultState: 'possible_pest',
      confidence: 78,
      needsMoreEvidence: true,
      productSearchTags: ['pest-control'],
      diagnosticEvidence: { likelyCauseCategory: 'pest', evidenceFor: ['white residue'] },
    }, 'en');

    const second = createProductRecommendationsKey({
      plantType: 'Papaya',
      disease: 'Suspected Papaya Mealybug / Scale Infestation',
      status: 'confirmed',
      resultState: 'confident_treatment',
      confidence: 92,
      needsMoreEvidence: false,
      productSearchTags: ['pest-control'],
      diagnosticEvidence: { likelyCauseCategory: 'pest', evidenceFor: ['live insects visible'] },
    }, 'en');

    expect(first).not.toBe(second);
    expect(first).toContain('"status":"likely"');
    expect(first).toContain('"resultState":"possible_pest"');
    expect(first).toContain('"needsMoreEvidence":true');
  });

  it('includes scan context in the product recommendation cache key', () => {
    const first = createProductRecommendationsKey({
      scanId: 'scan-1',
      plantType: 'Durian',
      disease: 'Leaf Spot',
      confidence: 84,
      severity: 'moderate',
      locationName: 'Melaka',
    }, 'en');

    const second = createProductRecommendationsKey({
      scanId: 'scan-2',
      plantType: 'Durian',
      disease: 'Leaf Spot',
      confidence: 84,
      severity: 'moderate',
      locationName: 'Melaka',
    }, 'en');

    expect(first).not.toBe(second);
    expect(first).toContain('"scanId":"scan-1"');
    expect(first).toContain('"locationName":"Melaka"');
  });

  it('normalizes product match metadata and consultation payloads', () => {
    const normalized = normalizeProductRecommendationsResponse({
      diseaseControl: [
        {
          id: 12,
          name: 'Copper Guard',
          matchScore: '86',
          matchReason: 'Matched copper.',
          matchedTerms: ['copper', null, 'fungicide'],
          curatedRuleId: 'fungal_leaf_spot_anthracnose',
          curatedRuleName: 'Fungal leaf spot / anthracnose',
          activeIngredients: ['copper', '', 'mancozeb'],
          matchedActiveIngredients: ['copper'],
          cautionNote: 'Follow label rate.',
          recommendationRole: 'treatment',
          cautionLevel: 'confirm_before_use',
        },
      ],
      recommendationIntent: 'treatment_ready',
      consultation: {
        phone: '+60136667810',
        url: 'https://wa.me/60136667810',
        message: 'Scan ID: scan-1',
        label: 'Contact us for consultation',
        priority: 'secondary',
        reason: 'Confirm before use.',
      },
    });

    expect(normalized.diseaseControl[0]).toMatchObject({
      matchScore: 86,
      matchReason: 'Matched copper.',
      matchedTerms: ['copper', 'fungicide'],
      curatedRuleId: 'fungal_leaf_spot_anthracnose',
      curatedRuleName: 'Fungal leaf spot / anthracnose',
      activeIngredients: ['copper', 'mancozeb'],
      matchedActiveIngredients: ['copper'],
      cautionNote: 'Follow label rate.',
      recommendationRole: 'treatment',
      cautionLevel: 'confirm_before_use',
    });
    expect(normalized.recommendationIntent).toBe('treatment_ready');
    expect(normalized.consultation.priority).toBe('secondary');
  });

  it('builds a consultation WhatsApp link from scan context', () => {
    const consultation = createProductConsultationFromDiagnosis({
      scanId: 'scan-789',
      plantType: 'Papaya',
      disease: 'Mealybug',
      confidence: 82,
      severity: 'moderate',
      locationName: 'Johor',
      symptoms: ['White patches', 'Sticky residue'],
    }, 'consultation_needed', 'en');

    const decodedUrl = decodeURIComponent(consultation.url);
    expect(consultation.priority).toBe('primary');
    expect(consultation.phone).toBe('+60136667810');
    expect(decodedUrl).toContain('scan-789');
    expect(decodedUrl).toContain('Papaya');
    expect(decodedUrl).toContain('Mealybug');
    expect(decodedUrl).toContain('Johor');
  });
});
