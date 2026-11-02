import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ActionGrid from './ActionGrid.jsx';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('../../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'nav.checkPlant': 'Check plant health',
            'nav.products': 'Products',
            'nav.shop': 'Shop',
            'nav.history': 'History',
            'profile.quickActions': 'Quick Actions',
            'home.mygapTitle': 'myGAP',
            'settings.guide': 'User Guide',
        }[key] || key),
    }),
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
}));

describe('ActionGrid', () => {
    it('keeps the plant check and history as first-class farm tools', () => {
        const onScan = vi.fn();

        render(<ActionGrid onScan={onScan} />);

        fireEvent.click(screen.getByRole('button', { name: 'Check plant health' }));
        fireEvent.click(screen.getByRole('button', { name: 'History' }));

        expect(onScan).toHaveBeenCalledTimes(1);
        expect(navigateMock).toHaveBeenCalledWith('/history');
    });
});
