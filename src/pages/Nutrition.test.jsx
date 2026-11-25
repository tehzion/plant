import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Nutrition from './Nutrition.jsx';

const navigateMock = vi.fn();
const fetchScanHistoryPageMock = vi.fn();
const getScanByIdMock = vi.fn();

const routeParams = vi.hoisted(() => ({ value: {} }));

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
    useParams: () => routeParams.value,
    useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('../utils/localStorage', () => ({
    fetchScanHistoryPage: (...args) => fetchScanHistoryPageMock(...args),
    getScanById: (...args) => getScanByIdMock(...args),
}));

vi.mock('../context/AuthContext', () => ({ useDataOwner: () => 'guest:local',
    useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'common.loading': 'Loading',
            'results.nutrition': 'Nutrition',
            'history.needScanFirst': 'Check a plant first.',
            'history.scanNotFoundMessage': 'This scan is not saved on this phone.',
            'nav.history': 'History',
            'nav.checkPlant': 'Check plant health',
        }[key] || key),
    }),
}));

describe('Nutrition entry page', () => {
    beforeEach(() => {
        navigateMock.mockReset();
        fetchScanHistoryPageMock.mockReset();
        getScanByIdMock.mockReset();
        routeParams.value = {};
    });

    it('opens the latest saved scan directly on the Nutrition tab', async () => {
        fetchScanHistoryPageMock.mockResolvedValue({ rows: [{ id: 'scan-latest' }] });

        render(<Nutrition />);

        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/results/scan-latest?tab=nutrition', { replace: true });
        });
    });

    it('sends a farmer with no scans to check a plant, not to an empty History', async () => {
        fetchScanHistoryPageMock.mockResolvedValue({ rows: [] });

        render(<Nutrition />);

        expect(await screen.findByRole('heading', { name: 'Nutrition' })).toBeInTheDocument();
        expect(screen.getByText('Check a plant first.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Check plant health' }));
        expect(navigateMock).toHaveBeenCalledWith('/?scan=true');
    });

    it('says a named scan is missing and offers History', async () => {
        routeParams.value = { id: 'scan-gone' };
        getScanByIdMock.mockResolvedValue(null);

        render(<Nutrition />);

        expect(await screen.findByText('This scan is not saved on this phone.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
    });
});
