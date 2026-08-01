import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminReviewDashboard from './AdminReviewDashboard.jsx';

const useAuthMock = vi.hoisted(() => vi.fn());
const fetchAdminReviewSummaryMock = vi.hoisted(() => vi.fn());

vi.mock('../context/AuthContext', () => ({
    useAuth: useAuthMock,
}));

vi.mock('../utils/adminAnalytics.js', () => ({
    fetchAdminReviewSummary: fetchAdminReviewSummaryMock,
}));

vi.mock('../components/LoadingSpinner', () => ({
    default: () => <div>Loading</div>,
}));

describe('AdminReviewDashboard', () => {
    beforeEach(() => {
        useAuthMock.mockReset();
        fetchAdminReviewSummaryMock.mockReset();
        fetchAdminReviewSummaryMock.mockResolvedValue({
            generatedAt: '2026-08-01T00:00:00.000Z',
            windowDays: 30,
            counts: {
                recentScans: 12,
                uncertainScans: 3,
                consultationLeads: 4,
                productClicks: 9,
                checkoutClicks: 2,
            },
            uncertainScans: [
                {
                    id: 'scan-1',
                    crop: 'Kelapa',
                    disease: 'No clear disease detected',
                    confidence: 45,
                    status: 'needs_closer_photo',
                    createdAt: '2026-08-01T00:00:00.000Z',
                },
            ],
            recentLeads: [
                {
                    id: 'lead-1',
                    scanId: 'scan-1',
                    crop: 'Kelapa',
                    disease: 'Bud Rot',
                    recommendationIntent: 'consultation_needed',
                    createdAt: '2026-08-01T00:01:00.000Z',
                },
            ],
            topProducts: [{ name: 'Copper Guard', count: 5 }],
            commonDiseases: [{ name: 'Bud Rot', count: 3 }],
            recentProductEvents: [
                {
                    id: 'event-1',
                    eventType: 'product_click',
                    productName: 'Copper Guard',
                    crop: 'Kelapa',
                    disease: 'Bud Rot',
                    createdAt: '2026-08-01T00:02:00.000Z',
                },
            ],
        });
    });

    it('asks guests to sign in before viewing admin analytics', () => {
        useAuthMock.mockReturnValue({ user: null });

        render(
            <MemoryRouter>
                <AdminReviewDashboard />
            </MemoryRouter>,
        );

        expect(screen.getByText('Admin sign-in required')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /go to sign in/i })).toHaveAttribute('href', '/profile');
    });

    it('renders admin counts and review lists for signed-in admins', async () => {
        useAuthMock.mockReturnValue({ user: { id: 'admin-1', email: 'admin@example.com' } });

        render(
            <MemoryRouter>
                <AdminReviewDashboard />
            </MemoryRouter>,
        );

        expect(await screen.findByText('Review Dashboard')).toBeInTheDocument();
        await waitFor(() => {
            expect(fetchAdminReviewSummaryMock).toHaveBeenCalledWith({ days: 30, limit: 30 });
        });
        expect(screen.getByText('Recent scans')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('Need review')).toBeInTheDocument();
        expect(screen.getByText('No clear disease detected')).toBeInTheDocument();
        expect(screen.getAllByText('Copper Guard').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Bud Rot').length).toBeGreaterThan(0);
    });
});
