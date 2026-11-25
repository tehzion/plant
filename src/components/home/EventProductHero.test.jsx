import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EventProductHero from './EventProductHero.jsx';

vi.mock('../../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'home.checkTitle': 'Check plant health',
            'home.checkDesc': 'Upload a clear photo of the plant.',
            'home.checkAction': 'Upload a photo',
            'home.checkTipsLabel': 'For a useful result',
            'home.checkTip1': 'Photograph the whole plant in daylight.',
            'home.checkTip2': 'Add a close-up.',
            'home.checkTip3': 'Results are guidance, not a confirmed diagnosis.',
            'home.eventDemoTitle': 'Event demo scenarios',
            'home.eventDemoNote': 'Simulated examples only.',
            'home.eventDemoHealthy': 'Healthy plant',
            'home.eventDemoSymptomatic': 'Visible symptoms',
            'home.eventDemoUnclear': 'Unclear image',
        }[key] || key),
    }),
}));

describe('EventProductHero', () => {
    it('offers the plant check with photo guidance and opens the labeled demo scenarios', () => {
        const onScan = vi.fn();
        const onDemoScenario = vi.fn();

        render(<EventProductHero onScan={onScan} showDemoScenarios onDemoScenario={onDemoScenario} />);

        expect(screen.getByRole('heading', { name: 'Check plant health' })).toBeInTheDocument();
        expect(screen.getByText('Results are guidance, not a confirmed diagnosis.')).toBeInTheDocument();
        expect(screen.getByText('Simulated examples only.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Upload a photo/i }));
        fireEvent.click(screen.getByRole('button', { name: /Unclear image/i }));

        expect(onScan).toHaveBeenCalledTimes(1);
        expect(onDemoScenario).toHaveBeenCalledWith('demo-scan-4');
    });

    it('hides demo scenarios for regular farmers', () => {
        render(<EventProductHero onScan={vi.fn()} />);
        expect(screen.queryByText('Event demo scenarios')).not.toBeInTheDocument();
    });
});
