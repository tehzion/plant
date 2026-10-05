import { render, screen } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import OrderHistory from './OrderHistory.jsx';
vi.mock('../i18n/i18n.jsx', () => ({ useLanguage: () => ({ t: (key) => key, label: (_key, fallback) => fallback }) }));
vi.mock('../utils/localStorage.js', () => ({ getLocalOrders: () => [12, 13] }));
vi.mock('../utils/orderSession.js', () => ({ getOrderSession: async () => ({ guestId: 'verified-owner', accessToken: 'signed-token' }) }));
vi.mock('lucide-react', () => ({ Package: () => null, Clock: () => null, CheckCircle2: () => null,
    ChevronRight: () => null, ShoppingBag: () => null, Loader2: () => null }));
afterEach(() => vi.unstubAllGlobals());

it('uses signed order access and explains references that require verified recovery', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{
        id: 12, status: 'processing', date_created: '2026-01-01', total: '10', currency: 'MYR',
    }] });
    vi.stubGlobal('fetch', fetch);
    render(<OrderHistory guestId="old-browser-id" user={{ id: 'user-a' }} />);
    await screen.findByText('#12');
    expect(fetch).toHaveBeenCalledWith('/api/orders/user/verified-owner?ids=12,13', {
        headers: { Authorization: 'Bearer signed-token' },
    });
    expect(screen.getByText(/older orders need store verification/i)).toBeInTheDocument();
});
