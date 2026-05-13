import { describe, expect, it } from 'vitest';
import {
  buildProductDiagnosisPayload,
  createProductRecommendationsKey,
} from './liveProductRecommendations.js';

describe('live product recommendation payloads', () => {
  it('carries diagnosis status, evidence, treatment context, and nutrition status', () => {
    const payload = buildProductDiagnosisPayload({
      plantType: 'Papaya',
      disease: 'Suspected Papaya Mealybug / Scale Infestation',
      scanResult: {
        status: 'likely',
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
      confidence: 78,
      needsMoreEvidence: true,
      productSearchTags: ['pest-control'],
      diagnosticEvidence: { likelyCauseCategory: 'pest', evidenceFor: ['white residue'] },
    }, 'en');

    const second = createProductRecommendationsKey({
      plantType: 'Papaya',
      disease: 'Suspected Papaya Mealybug / Scale Infestation',
      status: 'confirmed',
      confidence: 92,
      needsMoreEvidence: false,
      productSearchTags: ['pest-control'],
      diagnosticEvidence: { likelyCauseCategory: 'pest', evidenceFor: ['live insects visible'] },
    }, 'en');

    expect(first).not.toBe(second);
    expect(first).toContain('"status":"likely"');
    expect(first).toContain('"needsMoreEvidence":true');
  });
});
