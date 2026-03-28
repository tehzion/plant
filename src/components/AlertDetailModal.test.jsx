import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AlertDetailModal from './AlertDetailModal.jsx';

const notifyErrorMock = vi.fn();

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'profile.aiSopHeader': 'AI SOP',
            'profile.aiGenerating': 'Generating...',
            'profile.aiSopFailed': 'Failed to generate SOP. Please check connection.',
            'profile.logTreatment': 'Log Treatment Action',
            'profile.inProgress': 'In Progress',
            'profile.resolved': 'Resolved',
            'profile.acknowledgeOnly': 'Acknowledge Only',
            'profile.saveToLog': 'Save to Activity Log',
            'profile.detected': 'Detected',
            'results.treatmentSteps': 'Response Steps (SOP)',
        }[key] || key),
    }),
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-1' },
    }),
}));

vi.mock('../context/NotificationProvider.jsx', () => ({
    useNotifications: () => ({
        notifyError: notifyErrorMock,
        notifyWarning: vi.fn(),
    }),
}));

vi.mock('../utils/localStorage', () => ({
    consumeStorageCleanupNotice: vi.fn(() => null),
    saveLogEntry: vi.fn(),
}));

vi.mock('../utils/aiFarmService', () => ({
    generateSOP: vi.fn(async () => {
        throw new Error('network failed');
    }),
}));

describe('AlertDetailModal', () => {
    beforeEach(() => {
        notifyErrorMock.mockReset();
    });

    it('shows a toast when SOP generation fails and keeps the modal mounted', async () => {
        render(
            <AlertDetailModal
                scan={{
                    id: 'scan-1',
                    disease: 'Leaf Spot',
                    severity: 'moderate',
                    category: 'Durian',
                    timestamp: new Date().toISOString(),
                }}
                onClose={vi.fn()}
                onAcknowledge={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /ai sop/i }));

        await waitFor(() => {
            expect(notifyErrorMock).toHaveBeenCalledWith('Failed to generate SOP. Please check connection.');
        });

        expect(screen.getByText('Log Treatment Action')).toBeInTheDocument();
    });
});
