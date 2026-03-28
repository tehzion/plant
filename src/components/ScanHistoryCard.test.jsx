import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScanHistoryCard from './ScanHistoryCard.jsx';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
}));

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'common.dateLocale': 'en-MY',
            'history.deleteScan': 'Delete scan',
            'results.healthy': 'Healthy',
            'history.confirmDeleteSingle': 'Delete this scan?',
            'home.categoryTree': 'Tree',
        }[key] || key),
    }),
}));

describe('ScanHistoryCard', () => {
    it('deletes without using a browser confirm dialog', () => {
        const onDelete = vi.fn();
        const confirmSpy = vi.spyOn(window, 'confirm');

        render(
            <ScanHistoryCard
                scan={{
                    id: 'scan-1',
                    disease: 'Leaf Spot',
                    image: 'https://example.com/leaf.jpg',
                    plantType: 'tree',
                    timestamp: '2026-03-29T10:00:00.000Z',
                    healthStatus: 'Healthy',
                }}
                onDelete={onDelete}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Delete scan' }));

        expect(onDelete).toHaveBeenCalledWith('scan-1');
        expect(confirmSpy).not.toHaveBeenCalled();
    });
});
