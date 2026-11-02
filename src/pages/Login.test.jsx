import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login.jsx';

const navigateMock = vi.fn();
const routeLocation = vi.hoisted(() => ({ pathname: '/profile' }));
const pendingDraft = vi.hoisted(() => ({ value: null }));

vi.mock('react-router-dom', () => ({
    Link: ({ to, children }) => <a href={to}>{children}</a>,
    useNavigate: () => navigateMock,
    useLocation: () => routeLocation,
}));

vi.mock('../context/AuthContext', () => ({ useDataOwner: () => 'guest:local',
    useAuth: () => ({ user: null, signIn: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(), demoAuthEnabled: false }),
}));

vi.mock('../utils/scanFollowUpDraft.js', () => ({
    peekFollowUpDraft: () => pendingDraft.value,
}));

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'login.farmIntroTitle': 'My farm',
            'login.farmIntroGuest': 'Continue without an account',
            'login.signIn': 'Sign In',
            'login.register': 'Create Account',
            'login.welcomeBack': 'Welcome Back',
            'login.email': 'Email Address',
        }[key] || key),
    }),
}));

describe('Login on the My farm tab', () => {
    beforeEach(() => {
        navigateMock.mockReset();
        routeLocation.pathname = '/profile';
        pendingDraft.value = null;
    });

    it('explains the account before showing the form, and lets the farmer skip it', () => {
        render(<Login />);

        expect(screen.getByRole('heading', { name: 'My farm' })).toBeInTheDocument();
        expect(screen.queryByText('Email Address')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Continue without an account' }));
        expect(navigateMock).toHaveBeenCalledWith('/');
    });

    it('opens the right form from the intro', () => {
        render(<Login />);

        fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
        expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
        expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    it('goes straight to the form on /login and when a scan follow-up is waiting', () => {
        routeLocation.pathname = '/login';
        const { unmount } = render(<Login />);
        expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
        unmount();

        routeLocation.pathname = '/profile';
        pendingDraft.value = { scanId: 'scan-1' };
        render(<Login />);
        expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    });
});


it('shows readable confirmation guidance even if a translation is missing', async () => {
    routeLocation.pathname = '/profile';
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }).closest('form'));
    expect(await screen.findByRole('status')).toHaveTextContent('Check your email for a confirmation link');
    expect(screen.queryByText('login.checkEmail')).not.toBeInTheDocument();
});
