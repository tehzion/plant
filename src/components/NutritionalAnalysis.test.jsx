import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NutritionalAnalysis from './NutritionalAnalysis.jsx';

vi.mock('../i18n/i18n.jsx', () => ({
  useLanguage: () => ({
    t: (key) => ({
      'results.nutritionalIssues': 'Nutritional Analysis',
      'results.noDeficiency': 'No Nutritional Deficiencies Detected',
      'results.noDeficiencyMessage': 'Nutrition looks balanced.',
      'results.nutrientDeficiencyDetected': 'Nutrient Deficiency Detected',
      'results.possibleNutrientIssue': 'Possible nutrient issue',
      'results.possibleBadge': 'Possible',
      'results.suspectedNutrients': 'Suspected nutrients',
      'results.possibleNutrientOverlap': 'Possible nutrient overlap',
      'results.nutritionMayAlsoBeContributing': 'Nutrition may also be contributing',
      'results.lackingNutrients': 'Lacking Nutrients',
      'results.sevMild': 'Mild',
      'results.sevModerate': 'Moderate',
      'results.sevSevere': 'Severe',
      'common.unknown': 'Unknown',
    }[key] || key),
  }),
}));

describe('NutritionalAnalysis', () => {
  it('shows the confirmed deficiency state for legacy deficiency data', () => {
    render(
      <NutritionalAnalysis
        nutritionalIssues={{
          hasDeficiency: true,
          severity: 'Moderate',
          symptoms: ['Yellowing leaf edges'],
          deficientNutrients: [{ nutrient: 'Potassium', severity: 'Moderate' }],
        }}
      />,
    );

    expect(screen.getByText('Nutrient Deficiency Detected')).toBeInTheDocument();
    expect(screen.getByText('Potassium')).toBeInTheDocument();
    expect(screen.getAllByText('Moderate').length).toBeGreaterThan(0);
  });

  it('shows a softer possible-overlap state without claiming confirmed deficiency', () => {
    render(
      <NutritionalAnalysis
        nutritionalIssues={{
          status: 'possible',
          possibleNutrients: ['Magnesium'],
          symptoms: ['Mild interveinal yellowing'],
          reasoning: 'Fungal spotting is primary, but mild nutrient stress may also be contributing.',
        }}
      />,
    );

    expect(screen.getByText('Possible nutrient issue')).toBeInTheDocument();
    expect(screen.getByText('Possible')).toBeInTheDocument();
    expect(screen.getByText('Magnesium')).toBeInTheDocument();
    expect(screen.queryByText('Nutrient Deficiency Detected')).not.toBeInTheDocument();
  });
});

