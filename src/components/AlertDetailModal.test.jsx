import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AlertDetailModal from './AlertDetailModal.jsx';

const notifyErrorMock = vi.fn();
const storageMocks = vi.hoisted(() => ({
    saveDailyNote: vi.fn(),
    saveLogEntry: vi.fn(),
    consumeStorageCleanupNotice: vi.fn(() => null),
}));

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'profile.aiSopHeader': 'Suggested SOP',
            'profile.aiGenerating': 'Preparing...',
            'profile.aiSopFailed': 'Failed to prepare SOP. Please check connection.',
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
    consumeStorageCleanupNotice: storageMocks.consumeStorageCleanupNotice,
    saveDailyNote: storageMocks.saveDailyNote,
    saveLogEntry: storageMocks.saveLogEntry,
}));

vi.mock('../utils/aiFarmService', () => ({
    generateSOP: vi.fn(async () => {
        throw new Error('network failed');
    }),
}));

describe('AlertDetailModal', () => {
    beforeEach(() => {
        notifyErrorMock.mockReset();
        storageMocks.saveDailyNote.mockReset();
        storageMocks.saveDailyNote.mockResolvedValue({ id: 'note-1' });
        storageMocks.saveLogEntry.mockReset();
        storageMocks.consumeStorageCleanupNotice.mockClear();
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

        fireEvent.click(screen.getByRole('button', { name: /suggested sop/i }));

        await waitFor(() => {
            expect(notifyErrorMock).toHaveBeenCalledWith('Failed to prepare SOP. Please check connection.');
        });

        expect(screen.getByText('Log Treatment Action')).toBeInTheDocument();
    });

    it('saves treatment actions as structured daily notes', async () => {
        render(
            <AlertDetailModal
                scan={{
                    id: 'scan-1',
                    disease: 'Leaf Spot',
                    severity: 'moderate',
                    category: 'Durian',
                    timestamp: new Date().toISOString(),
                    treatments: ['Apply labeled fungicide'],
                }}
                onClose={vi.fn()}
                onAcknowledge={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /resolved/i }));
        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Applied copper spray to affected rows.' },
        });
        fireEvent.click(screen.getByRole('button', { name: /save to activity log/i }));

        await waitFor(() => {
            expect(storageMocks.saveDailyNote).toHaveBeenCalledWith(
                expect.objectContaining({
                    activity_type: 'spray',
                    disease_name_observed: 'Leaf Spot',
                    scout_severity: 'Moderate',
                    expense_category: 'Pesticide',
                    note: expect.stringContaining('Treatment status: Resolved'),
                }),
                'user-1',
            );
        });

        expect(storageMocks.saveDailyNote.mock.calls[0][0].note).toContain('Applied copper spray');
        expect(storageMocks.saveLogEntry).not.toHaveBeenCalled();
    });
});
