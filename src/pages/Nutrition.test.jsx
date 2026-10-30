import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Nutrition from './Nutrition.jsx';

const navigateMock = vi.fn();
const fetchScanHistoryPageMock = vi.fn();
const getScanByIdMock = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('../utils/localStorage', () => ({
    fetchScanHistoryPage: (...args) => fetchScanHistoryPageMock(...args),
    getScanById: (...args) => getScanByIdMock(...args),
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'common.loading': 'Loading',
            'results.nutrition': 'Nutrition',
            'history.noHistoryMessage': 'No saved scan found.',
            'history.scanHistory': 'Scan history',
        }[key] || key),
    }),
}));

describe('Nutrition entry page', () => {
    beforeEach(() => {
        navigateMock.mockReset();
        fetchScanHistoryPageMock.mockReset();
        getScanByIdMock.mockReset();
    });

    it('opens the latest saved scan directly on the Nutrition tab', async () => {
        fetchScanHistoryPageMock.mockResolvedValue({ rows: [{ id: 'scan-latest' }] });

        render(<Nutrition />);

        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/results/scan-latest?tab=nutrition', { replace: true });
        });
    });

    it('offers History when no saved scan is available', async () => {
        fetchScanHistoryPageMock.mockResolvedValue({ rows: [] });

        render(<Nutrition />);

        expect(await screen.findByRole('heading', { name: 'Nutrition' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /scan history/i })).toBeInTheDocument();
    });
});
