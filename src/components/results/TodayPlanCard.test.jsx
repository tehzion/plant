import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TodayPlanCard, { recheckDays } from './TodayPlanCard.jsx';

vi.mock('../../i18n/i18n.jsx', () => ({ useLanguage: () => ({ language: 'en', t: (key) => key }) }));

const result = {
    immediateActions: ['Remove badly affected leaves', 'Check nearby plants', 'Keep leaves dry', 'Fourth action'],
    structuredAssessment: { assessment: {
        follow_up_questions: ['Did symptoms start on older leaves?'],
        additional_information_needed: ['A close-up of one affected leaf'],
    } },
};

beforeEach(() => localStorage.clear());

describe('TodayPlanCard', () => {
    it('shows at most three actions and the evidence still needed', () => {
        render(<TodayPlanCard result={result} scanId="scan-1" />);
        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(expect.arrayContaining(['Remove badly affected leaves', 'Keep leaves dry']));
        expect(screen.queryByText('Fourth action')).not.toBeInTheDocument();
        expect(screen.getByText('A close-up of one affected leaf')).toBeInTheDocument();
    });

    it('records a tapped answer and keeps it after re-render', () => {
        const { unmount } = render(<TodayPlanCard result={result} scanId="scan-1" />);
        fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
        expect(screen.getByRole('button', { name: 'Yes' })).toHaveAttribute('aria-pressed', 'true');
        unmount();
        render(<TodayPlanCard result={result} scanId="scan-1" />);
        expect(screen.getByRole('button', { name: 'Yes' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('keeps action checks and field answers when translated labels change', () => {
        const source = { ...result, treatmentEligible: true, treatments: ['Original treatment'] };
        const { rerender } = render(<TodayPlanCard result={source} sourceResult={source} planStarted scanId="scan-language" />);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Check nearby plants' }));
        const translated = { ...source, treatments: ['Rawatan asal'], immediateActions: ['Buang daun', 'Periksa pokok berdekatan', 'Kekalkan daun kering'] };
        rerender(<TodayPlanCard result={translated} sourceResult={source} planStarted scanId="scan-language" />);
        expect(screen.getByRole('checkbox', { name: 'Periksa pokok berdekatan' })).toBeChecked();
    });

    it('focuses the first real action when supporting information is also present', () => {
        render(<TodayPlanCard result={result} planStarted scanId="scan-focus" />);
        expect(screen.getByRole('checkbox', { name: 'Remove badly affected leaves' })).toHaveFocus();
        expect(screen.queryByRole('checkbox', { name: 'A close-up of one affected leaf' })).not.toBeInTheDocument();
    });

    it('uses a consistent recheck interval and does not leak treatment when review is needed', () => {
        expect(recheckDays({ treatmentEligible: true })).toBe(3);
        expect(recheckDays({ healthy: true })).toBe(14);
        expect(recheckDays({ requiresRetake: true })).toBeNull();
        render(<TodayPlanCard result={{ treatments: ['Do not show this'], needsReview: true }} scanId="scan-1" />);
        expect(screen.queryByText('Do not show this')).not.toBeInTheDocument();
    });
});
