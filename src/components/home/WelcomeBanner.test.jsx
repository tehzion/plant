import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WelcomeBanner, { WELCOME_SEEN_KEY } from './WelcomeBanner.jsx';

vi.mock('../../i18n/i18n.jsx', () => ({ useLanguage: () => ({ t: (key) => key }) }));

beforeEach(() => localStorage.clear());

describe('WelcomeBanner', () => {
    it('greets a first-time visitor and starts the first plant check', () => {
        const onStart = vi.fn();
        const { unmount } = render(<WelcomeBanner onStart={onStart} />);
        expect(screen.getByRole('heading', { name: 'home.welcomeTitle' })).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', { name: 'home.welcomeStart' }));
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('heading', { name: 'home.welcomeTitle' })).toBeNull();
        unmount();
        render(<WelcomeBanner onStart={onStart} />);
        expect(screen.queryByRole('heading', { name: 'home.welcomeTitle' })).toBeNull();
    });
    it('stays closed after the farmer dismisses it either way', () => {
        render(<WelcomeBanner />);
        fireEvent.click(screen.getByRole('button', { name: 'home.welcomeClose' }));
        expect(localStorage.getItem(WELCOME_SEEN_KEY)).toBe('1');
        expect(screen.queryByRole('heading', { name: 'home.welcomeTitle' })).toBeNull();
    });
});
