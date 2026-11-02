import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotFound from './NotFound.jsx';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
    Link: ({to, children, ...props}) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('../i18n/i18n', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'common.notFoundTitle': 'Halaman tidak dijumpai',
            'common.notFoundMessage': 'Halaman ini tiada atau telah dipindahkan.',
            'common.backToHome': 'Ke laman utama',
            'common.goBack': 'Kembali',
        }[key] || key),
    }),
}));

describe('NotFound', () => {
    it('speaks the chosen language and leads back home', () => {
        render(<NotFound />);

        expect(screen.getByRole('heading', { name: 'Halaman tidak dijumpai' })).toBeInTheDocument();
        expect(screen.queryByText(/Oops|404/)).not.toBeInTheDocument();

        expect(screen.getByRole('link', {name:'Ke laman utama'})).toHaveAttribute('href','/');
        expect(screen.queryByRole('button', {name:'Kembali'})).not.toBeInTheDocument();
    });
    it('only offers Back when there is an in-app history entry', () => {
        window.history.replaceState({idx:1}, '');
        render(<NotFound />);
        fireEvent.click(screen.getByRole('button', {name:'Kembali'}));
        expect(navigateMock).toHaveBeenCalledWith(-1);
        window.history.replaceState(null, '');
    });
});
