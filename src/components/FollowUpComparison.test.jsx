import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import FollowUpComparison from './FollowUpComparison.jsx';

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({ language: 'en' }),
}));

describe('FollowUpComparison', () => {
    const scan = {
        image: 'original.jpg',
        disease: 'Leaf spot',
        symptoms: ['Spots'],
        severity: 'severe',
        timestamp: '2026-01-01T00:00:00Z',
    };
    const events = [
        { id: 'older', recordedAt: '2026-01-02T00:00:00Z', outcome: 'unchanged', severity: 'severe', note: 'Still present' },
        { id: 'newer', recordedAt: '2026-01-03T00:00:00Z', outcome: 'improving', severity: 'moderate', note: 'Fewer spots', photo: 'latest.jpg' },
    ];

    it('defaults to the newest event and renders both sides', () => {
        render(<FollowUpComparison scan={scan} events={events} resolvedPhotos={{}} selectedEventId="newer" onSelectEvent={vi.fn()} />);

        expect(screen.getByText('Original scan')).toBeInTheDocument();
        expect(screen.getByText('Selected follow-up')).toBeInTheDocument();
        expect(screen.getByText('Fewer spots')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveValue('newer');
    });

    it('allows switching to an earlier saved event', () => {
        const onSelectEvent = vi.fn();
        render(<FollowUpComparison scan={scan} events={events} selectedEventId="newer" onSelectEvent={onSelectEvent} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'older' } });
        expect(onSelectEvent).toHaveBeenCalledWith('older');
    });
});
