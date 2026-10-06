import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ScanPhotoGuidance from './ScanPhotoGuidance.jsx';

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({ language: 'en' }),
}));

describe('ScanPhotoGuidance', () => {
    it('shows localized whole-plant and close-up capture guidance', () => {
        render(<ScanPhotoGuidance plantPart="leaf" captureRole="whole" />);

        expect(screen.getByText('Take clearer plant photos')).toBeInTheDocument();
        expect(screen.getByText('Whole-plant view')).toBeInTheDocument();
        expect(screen.getByText('Affected-area close-up')).toBeInTheDocument();
        expect(screen.getByText('Use soft daylight and avoid glare or deep shadows.')).toBeInTheDocument();
    });

    it('shows an issue-specific retake message, focuses it, and dismisses it', async () => {
        const onDismissIssue = vi.fn();
        render(<ScanPhotoGuidance qualityIssue="IMAGE_TOO_BLURRY" onDismissIssue={onDismissIssue} />);

        expect(screen.getByText('Retake this photo')).toBeInTheDocument();
        expect(screen.getByText('Hold the phone steady, tap to focus, and keep the plant still.')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByRole('complementary')).toHaveFocus());
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss photo tip' }));
        expect(onDismissIssue).toHaveBeenCalledTimes(1);
    });
});
