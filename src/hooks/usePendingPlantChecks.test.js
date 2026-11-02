import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn(), update: vi.fn(), refresh: vi.fn() }));
vi.mock('../utils/pendingPlantChecks.js', async (importOriginal) => ({
    ...(await importOriginal()),
    listPendingPlantChecks: mocks.list,
    removePendingPlantCheck: mocks.remove,
    updatePendingPlantCheck: mocks.update,
}));
vi.mock('./useScanService.js', () => ({ refreshScanService: mocks.refresh }));
import { usePendingPlantCheckRunner } from './usePendingPlantChecks.js';

const photo = new File(['x'], 'tree.jpg', { type: 'image/jpeg' });
const check = (id, extra = {}) => ({ id, state: 'waiting', attempts: 0, selectedImage: photo, savedAt: id, ...extra });
const setOnline = value => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
const runner = (analyze) => {
    const onReady = vi.fn(); const onNeedsAttention = vi.fn();
    renderHook(() => usePendingPlantCheckRunner({ owner: 'user:a', analyze, isBusy: () => false, onReady, onNeedsAttention }));
    return { onReady, onNeedsAttention };
};

beforeEach(() => {
    vi.clearAllMocks(); setOnline(true);
    mocks.refresh.mockResolvedValue('online');
    mocks.remove.mockResolvedValue(); mocks.update.mockResolvedValue();
});
afterEach(() => setOnline(true));

describe('running saved plant checks when signal returns', () => {
    it('runs each waiting check oldest first, removes it and tells the farmer', async () => {
        mocks.list.mockResolvedValue([check('a'), check('b'), check('c', { state: 'needs-attention' })]);
        const analyze = vi.fn(async ({ id }) => `scan-${id}`);
        const { onReady } = runner(analyze);
        await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2));
        expect(analyze.mock.calls.map(([c]) => c.id)).toEqual(['a', 'b']);
        expect(mocks.remove.mock.calls.map(([, id]) => id)).toEqual(['a', 'b']);
        expect(onReady).toHaveBeenCalledWith('scan-a', expect.objectContaining({ id: 'a' }));
    });
    it('keeps the check waiting and stops when the connection drops again', async () => {
        mocks.list.mockResolvedValue([check('a'), check('b')]);
        const analyze = vi.fn(async () => { throw Object.assign(new Error('down'), { status: 503 }); });
        const { onReady, onNeedsAttention } = runner(analyze);
        await waitFor(() => expect(mocks.update).toHaveBeenCalled());
        expect(analyze).toHaveBeenCalledTimes(1);
        expect(mocks.update).toHaveBeenCalledWith('user:a', expect.objectContaining({ id: 'a' }), expect.objectContaining({ attempts: 1 }));
        expect(mocks.update.mock.calls[0][2]).not.toHaveProperty('state');
        expect(mocks.remove).not.toHaveBeenCalled();
        expect(onReady).not.toHaveBeenCalled(); expect(onNeedsAttention).not.toHaveBeenCalled();
    });
    it('holds a check with a photo problem for the farmer and moves on', async () => {
        mocks.list.mockResolvedValue([check('a'), check('b')]);
        const analyze = vi.fn(async ({ id }) => {
            if (id === 'a') throw Object.assign(new Error('IMAGE_TOO_DARK'), { userCode: 'IMAGE_TOO_DARK', userMessage: 'The photo is too dark.' });
            return 'scan-b';
        });
        const { onReady, onNeedsAttention } = runner(analyze);
        await waitFor(() => expect(onReady).toHaveBeenCalledWith('scan-b', expect.anything()));
        expect(mocks.update).toHaveBeenCalledWith('user:a', expect.objectContaining({ id: 'a' }), expect.objectContaining({ state: 'needs-attention', lastError: 'The photo is too dark.' }));
        expect(onNeedsAttention).toHaveBeenCalledTimes(1);
    });
    it('does nothing while offline or when the service is still down', async () => {
        mocks.list.mockResolvedValue([check('a')]);
        const analyze = vi.fn();
        setOnline(false);
        runner(analyze);
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(mocks.list).not.toHaveBeenCalled();
        setOnline(true); mocks.refresh.mockResolvedValue('unavailable');
        runner(analyze);
        await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
        expect(analyze).not.toHaveBeenCalled();
    });
});
