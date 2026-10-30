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

    it('suggests a re-check date matched to the result', () => {
        const onSetRecheck = vi.fn();
        render(<TodayPlanCard result={{ ...result, treatmentEligible: true }} scanId="scan-1" onSetRecheck={onSetRecheck} />);
        fireEvent.click(screen.getByRole('button', { name: /Set a re-check date/ }));
        const expected = new Date(); expected.setDate(expected.getDate() + 5);
        expect(onSetRecheck.mock.calls[0][0].date).toBe(`${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`);
        expect(recheckDays({ healthy: true })).toBe(14);
        expect(recheckDays({ requiresRetake: true })).toBeNull();
    });
});
