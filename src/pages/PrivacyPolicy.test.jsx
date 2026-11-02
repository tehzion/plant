import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
vi.mock('../i18n/i18n.jsx', () => ({ useLanguage: () => ({ language: 'en' }) }));
import PrivacyPolicy from './PrivacyPolicy.jsx';
it('makes both notice languages and the real privacy contact available', () => {
    render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Personal data protection notice');
    expect(screen.getAllByRole('link', { name: 'privacy@infinitas.com.my' })[0]).toHaveAttribute('href', 'mailto:privacy@infinitas.com.my');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ms' } });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Notis perlindungan data peribadi');
    expect(screen.getByRole('link', { name: 'Urus data saya' })).toHaveAttribute('href', '/privacy-controls');
});
