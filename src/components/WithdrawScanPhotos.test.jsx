import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import WithdrawScanPhotos from './WithdrawScanPhotos.jsx';
const api = vi.hoisted(() => vi.fn());
vi.mock('../utils/neonApi.js', () => ({ neonApiRequest: api }));
vi.mock('../i18n/i18n.jsx', () => ({ useLanguage: () => ({ t: key => key }) }));
it('requires confirmation, sends ownership proof in the body and reports a failed withdrawal', async () => {
    api.mockRejectedValue(new Error('offline'));
    render(<WithdrawScanPhotos scan={{ id: 'scan-1', feedbackToken: 'proof' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'photoPrivacy.withdraw' }));
    expect(api).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole('button', { name: 'photoPrivacy.withdraw' });
    fireEvent.click(buttons.at(-1));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('photoPrivacy.withdrawFailed'));
    expect(api.mock.calls[0][1].body).toContain('proof');
    expect(api.mock.calls[0][0]).not.toContain('proof');
});
