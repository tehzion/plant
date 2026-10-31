import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import History from './History.jsx';

const navigateMock = vi.fn();
const getGroupedScansMock = vi.fn();
const fetchScanHistoryPageMock = vi.fn();
const groupScansByDateMock = vi.fn();
const deleteScanMock = vi.fn();
const clearAllScansMock = vi.fn();
const notifySuccessMock = vi.fn();
const notifyErrorMock = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
}));

vi.mock('../utils/localStorage', () => ({
    getGroupedScans: (...args) => getGroupedScansMock(...args),
    fetchScanHistoryPage: (...args) => fetchScanHistoryPageMock(...args),
    groupScansByDate: (...args) => groupScansByDateMock(...args),
    deleteScan: (...args) => deleteScanMock(...args),
    clearAllScans: (...args) => clearAllScansMock(...args),
}));

vi.mock('../context/ScanContext', () => ({
    useScanContext: () => ({
        state: { loading: false },
    }),
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-1' },
    }),
}));

vi.mock('../context/NotificationProvider.jsx', () => ({
    useNotifications: () => ({
        notifySuccess: notifySuccessMock,
        notifyError: notifyErrorMock,
    }),
}));

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'history.scanHistory': 'Scan History',
            'history.clearAll': 'Clear All',
            'history.clearConfirm': 'Are you sure you want to clear all scan history?',
            'history.confirmDeleteSingle': 'Delete this scan?',
            'history.deleteScan': 'Delete scan',
            'history.scanDeleted': 'Scan deleted.',
            'history.scanHistoryCleared': 'Scan history cleared.',
            'history.today': 'Today',
            'history.noHistory': 'No Scan History',
            'history.noHistoryMessage': 'Your scanned plants will appear here',
            'history.scanFirstPlant': 'Scan Your First Plant',
            'common.delete': 'Delete',
            'common.cancel': 'Cancel',
            'common.continue': 'Cancel',
            'common.exit': 'Delete',
            'common.ok': 'OK',
        }[key] || key),
    }),
}));

vi.mock('../components/ScanHistoryCard', () => ({
    default: ({ scan, onDelete }) => (
        <button type="button" onClick={() => onDelete(scan.id)}>
            Trigger delete {scan.id}
        </button>
    ),
}));

describe('History', () => {
    beforeEach(() => {
        navigateMock.mockReset();
        getGroupedScansMock.mockReset();
        fetchScanHistoryPageMock.mockReset();
        groupScansByDateMock.mockReset();
        deleteScanMock.mockReset();
        clearAllScansMock.mockReset();
        notifySuccessMock.mockReset();
        notifyErrorMock.mockReset();

        getGroupedScansMock.mockResolvedValue({
            today: [{ id: 'scan-1' }],
            yesterday: [],
            thisWeek: [],
            lastWeek: [],
            older: [],
        });
        fetchScanHistoryPageMock.mockResolvedValue(undefined);
        deleteScanMock.mockResolvedValue(true);
        clearAllScansMock.mockResolvedValue(true);
    });

    it('confirms a single delete through the modal before removing a scan', async () => {
        render(<History />);

        await screen.findByText('Trigger delete scan-1');

        fireEvent.click(screen.getByText('Trigger delete scan-1'));

        expect(screen.getByText('Delete this scan?')).toBeInTheDocument();

        const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
        fireEvent.click(deleteButtons[deleteButtons.length - 1]);

        await waitFor(() => {
            expect(deleteScanMock).toHaveBeenCalledWith('scan-1', 'user-1');
        });

        expect(notifySuccessMock).toHaveBeenCalledWith('Scan deleted.');
    });

    it('confirms clear all through the modal before clearing history', async () => {
        render(<History />);

        await screen.findByRole('button', { name: 'Clear All' });

        fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));

        expect(screen.getByText('Are you sure you want to clear all scan history?')).toBeInTheDocument();

        const confirmButtons = screen.getAllByRole('button', { name: 'Clear All' });
        fireEvent.click(confirmButtons[confirmButtons.length - 1]);

        await waitFor(() => {
            expect(clearAllScansMock).toHaveBeenCalledWith('user-1');
        });

        expect(notifySuccessMock).toHaveBeenCalledWith('Scan history cleared.');
    });
    it.each(['delete', 'clear-all', 'rejected'])('reports a failed %s without claiming success', async (action) => {
        if (action === 'rejected') deleteScanMock.mockRejectedValue(new Error('offline'));
        else if (action === 'delete') deleteScanMock.mockResolvedValue(false);
        else clearAllScansMock.mockResolvedValue(false);
        render(<History />);
        await screen.findByText('Trigger delete scan-1');
        fireEvent.click(action === 'clear-all' ? screen.getByRole('button', { name: 'Clear All' }) : screen.getByText('Trigger delete scan-1'));
        const buttons = screen.getAllByRole('button', { name: action === 'clear-all' ? 'Clear All' : 'Delete' });
        fireEvent.click(buttons[buttons.length - 1]);
        await waitFor(() => expect(notifyErrorMock).toHaveBeenCalledWith('history.deleteFailed'));
        expect(notifySuccessMock).not.toHaveBeenCalled();
    });

    it('filters saved scans and restores them with reset', async () => {
        getGroupedScansMock.mockResolvedValue({ today: [{ id: 'scan-1', disease: 'Leaf spot', plantType: 'Durian' }], yesterday: [], thisWeek: [], lastWeek: [], older: [] });
        render(<History />);
        await screen.findByText('Trigger delete scan-1');
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search scans' }), { target: { value: 'missing crop' } });
        expect(screen.queryByText('Trigger delete scan-1')).not.toBeInTheDocument();
        expect(screen.getByText('No scans match these filters.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
        expect(screen.getByText('Trigger delete scan-1')).toBeInTheDocument();
    });
});
