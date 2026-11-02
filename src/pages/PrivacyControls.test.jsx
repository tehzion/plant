import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ clear: vi.fn(), export: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'A' } }), useDataOwner: () => 'user:A' }));
vi.mock('../i18n/i18n.jsx', () => ({ useLanguage: () => ({ language: 'en', t: key => key }) }));
vi.mock('../utils/privacyTools.js', () => ({ clearPrivacyDeviceData: mocks.clear, buildPrivacyExport: mocks.export, privacyRequestLink: type => `mailto:privacy@infinitas.com.my?subject=${encodeURIComponent(type)}` }));
import PrivacyControls from './PrivacyControls.jsx';
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
it('offers written requests to the approved contact and keeps destructive clearing gated', () => {
    render(<MemoryRouter><PrivacyControls /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'privacy@infinitas.com.my' })).toHaveAttribute('href', 'mailto:privacy@infinitas.com.my');
    expect(screen.getByRole('link', { name: 'Access to all personal data' }).getAttribute('href')).toContain('mailto:privacy@infinitas.com.my');
    const clear = screen.getByRole('button', { name: 'Clear my device copies' });
    expect(clear).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'I understand unsynced changes will be lost.' }));
    expect(clear).toBeEnabled();
});
it('reports an export failure without claiming a successful or complete access response', async () => {
    mocks.export.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><PrivacyControls /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Download my app records' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Could not complete this action'));
    expect(mocks.export).toHaveBeenCalledWith(expect.objectContaining({ owner: 'user:A', userId: 'A' }));
});
