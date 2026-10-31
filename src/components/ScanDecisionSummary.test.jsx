import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScanDecisionSummary from './ScanDecisionSummary.jsx';

vi.mock('../i18n/i18n.jsx', () => ({ useLanguage: () => ({ language: 'en', t: (key) => ({ 'results.healthy': 'Healthy', 'results.notRecorded': 'Not recorded' }[key] || key) }) }));

describe('scan decision summary', () => {
    it('does not label a healthy result as a likely issue', () => {
        render(<ScanDecisionSummary result={{ healthy: true, disease: 'Healthy Plant', resultState: 'healthy', tone: 'healthy', symptoms: [] }} />);
        expect(screen.getByRole('region', { name: 'Healthy' })).toBeInTheDocument();
        expect(screen.queryByText('Likely issue')).not.toBeInTheDocument();
    });
});
