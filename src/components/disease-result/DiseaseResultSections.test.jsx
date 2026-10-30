import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DiseaseResultSections from './DiseaseResultSections.jsx';
import { normalizeDiseaseResult } from '../../utils/diseaseResultUtils.js';

const t = (key) => key;

describe('similar-condition comparison', () => {
    it('renders alternatives with confidence level and distinguishing evidence', () => {
        const normalized = normalizeDiseaseResult({
            disease: 'Early Blight', healthStatus: 'unhealthy',
            structuredAssessment: { assessment: { alternative_conditions: [{
                name: 'Septoria Leaf Spot', confidence_level: 'low',
                supporting_evidence: ['Brown spots on lower leaves'], weakening_evidence: ['Lesions larger than typical'],
                distinguishing_features: ['Septoria spots have grey centres'],
            }] } },
        }, t);
        render(<DiseaseResultSections normalized={normalized} t={t} />);
        expect(screen.getByText('Septoria Leaf Spot')).toBeInTheDocument();
        expect(screen.getByText('Low')).toBeInTheDocument();
        expect(screen.getByText('Lesions larger than typical')).toBeInTheDocument();
        expect(screen.getByText('Septoria spots have grey centres')).toBeInTheDocument();
    });

    it('still renders legacy saved scans that only carry name and reason', () => {
        const normalized = normalizeDiseaseResult({ disease: 'Leaf spot', differentialDiagnoses: [{ name: 'Rust', likelihood: 20, reason: 'orange pustules' }] }, t);
        render(<DiseaseResultSections normalized={normalized} t={t} />);
        expect(screen.getByText('Rust')).toBeInTheDocument();
        expect(screen.getByText('orange pustules')).toBeInTheDocument();
    });
});
