import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EventProductHero from './EventProductHero.jsx';

vi.mock('../../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'home.eventEyebrow': 'Plant Health AI',
            'home.eventHeadline': 'From plant diagnosis to practical action.',
            'home.eventDescription': 'Take a photo and get a practical care plan.',
            'home.eventPrimaryAction': 'Scan your plant',
            'home.eventSecondaryAction': 'See how it works',
            'home.eventExampleLabel': 'Example report',
            'home.eventExampleNote': 'Illustrative scenario',
            'home.eventObserved': 'Observed',
            'home.eventAction': 'Next action',
            'home.eventFollowUp': 'Follow-up ready',
            'home.eventHowItWorks': 'From photo to field action',
            'home.eventStepCapture': 'Capture',
            'home.eventStepAnalyze': 'Analyze',
            'home.eventStepAct': 'Act',
            'home.eventCaptureDesc': 'Take a clear photo.',
            'home.eventAnalyzeDesc': 'Review visible evidence.',
            'home.eventActDesc': 'Follow the next step.',
            'home.eventTrust': 'Evidence-led guidance.',
            'home.demoMode': 'Demo Mode',
            'home.eventDemoTitle': 'Event demo scenarios',
            'home.eventDemoNote': 'Simulated examples only.',
            'home.eventDemoHealthy': 'Healthy plant',
            'home.eventDemoSymptomatic': 'Visible symptoms',
            'home.eventDemoUnclear': 'Unclear image',
            'home.step1Title': 'Upload Plant Photo',
            'home.viewHistory': 'View history',
        }[key] || key),
    }),
}));

describe('EventProductHero', () => {
    it('explains the event flow and opens the labeled demo scenarios', () => {
        const onScan = vi.fn();
        const onDemoScenario = vi.fn();

        render(<EventProductHero onScan={onScan} showDemoScenarios onDemoScenario={onDemoScenario} />);

        expect(screen.getByRole('heading', { name: 'From plant diagnosis to practical action.' })).toBeInTheDocument();
        expect(screen.getByText('Illustrative scenario')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'From photo to field action' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Scan your plant/i }));
        fireEvent.click(screen.getByRole('button', { name: /Unclear image/i }));

        expect(onScan).toHaveBeenCalledTimes(1);
        expect(onDemoScenario).toHaveBeenCalledWith('demo-scan-4');
    });
});
