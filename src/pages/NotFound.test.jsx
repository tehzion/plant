import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotFound from './NotFound.jsx';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
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

        fireEvent.click(screen.getByRole('button', { name: 'Ke laman utama' }));
        expect(navigateMock).toHaveBeenCalledWith('/');

        fireEvent.click(screen.getByRole('button', { name: 'Kembali' }));
        expect(navigateMock).toHaveBeenCalledWith(-1);
    });
});
