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
    it('offers only tools the navigation does not already have', () => {
        render(<ActionGrid />);

        expect(screen.queryByRole('button', { name: 'Check plant health' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'History' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'myGAP' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'User Guide' }));
        expect(navigateMock).toHaveBeenCalledWith('/guide');
        expect(screen.getByRole('button', { name: 'Products' })).toBeTruthy();
    });
});
