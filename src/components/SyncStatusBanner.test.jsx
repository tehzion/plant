import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SyncStatusBanner from './SyncStatusBanner.jsx';

const sync = vi.hoisted(() => ({ getSyncSummary: vi.fn(), listWaitingRecords: vi.fn(), retryFailedSync: vi.fn(), SYNC_STATUS_EVENT: 'plant-sync-status' }));
const resolve = vi.hoisted(() => vi.fn());
vi.mock('../utils/cloudSync.js', () => ({ resolveSyncConflict: resolve }));
vi.mock('../utils/syncQueue.js', () => sync);
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('../i18n/i18n.jsx', () => ({ useLanguage: () => ({ language: 'en', t: (key) => key }) }));

afterEach(() => vi.restoreAllMocks());

describe('SyncStatusBanner', () => {
    it('lets the owner compare a conflict and explicitly choose their change', async () => {
        sync.getSyncSummary.mockResolvedValue({ pending: 0, failed: 0, conflict: 1 });
        sync.listWaitingRecords.mockResolvedValue([{ id: 'op-1', collection: 'logbook', type: 'update', state: 'conflict', payload: { notes: 'mine' }, conflict: { serverRecord: { notes: 'server' } } }]);
        resolve.mockResolvedValue({});
        render(<SyncStatusBanner />);
        fireEvent.click(await screen.findByRole('button', { name: 'Show waiting records' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Use my change' }));
        await waitFor(() => expect(resolve).toHaveBeenCalledWith('user-1', 'op-1', 'mine'));
    });
    it('stays hidden when online with nothing waiting', async () => {
        sync.getSyncSummary.mockResolvedValue({ pending: 0, failed: 0, conflict: 0 });
        const { container } = render(<SyncStatusBanner />);
        await waitFor(() => expect(sync.getSyncSummary).toHaveBeenCalledWith('user:user-1'));
        expect(container).toBeEmptyDOMElement();
    });

    it('tells the farmer records are saved on the device while offline', async () => {
        vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
        sync.getSyncSummary.mockResolvedValue({ pending: 2, failed: 0, conflict: 0 });
        render(<SyncStatusBanner />);
        expect(await screen.findByText(/2 record\(s\) saved on this device/)).toBeInTheDocument();
        expect(screen.getByText('You are offline')).toBeInTheDocument();
    });

    it('offers a retry when records failed to sync', async () => {
        sync.getSyncSummary.mockResolvedValue({ pending: 0, failed: 1, conflict: 0 });
        render(<SyncStatusBanner />);
        expect(await screen.findByRole('button', { name: 'Retry sync' })).toBeInTheDocument();
        expect(screen.getByText(/could not sync/)).toBeInTheDocument();
    });
});
