import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecentScans from './RecentScans.jsx';

vi.mock('../../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'home.recentScans': 'Recent Scans',
            'home.seeAll': 'See all',
            'home.noRecentScans': 'No recent scans',
            'results.healthy': 'Healthy',
            'common.dateLocale': 'en-US',
            'common.locationNA': 'Location N/A',
        }[key] || key),
    }),
}));

describe('RecentScans', () => {
    it('uses saved image URLs and falls back to the raw location name when no translation exists', () => {
        const onScanClick = vi.fn();

        render(
            <RecentScans
                scans={[
                    {
                        id: 'scan-1',
                        disease: 'Leaf Blight',
                        plantType: 'coconut',
                        timestamp: '2026-03-29T10:00:00.000Z',
                        healthStatus: 'healthy',
                        image_url: 'https://example.com/scan.jpg',
                        locationName: 'Kuala Lumpur',
                    },
                ]}
                onSeeAll={() => {}}
                onScanClick={onScanClick}
            />,
        );

        expect(screen.getByText('Kuala Lumpur')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Leaf Blight' })).toHaveAttribute('src', 'https://example.com/scan.jpg');

        fireEvent.click(screen.getByText('Leaf Blight'));
        expect(onScanClick).toHaveBeenCalledWith('scan-1');
    });
});
