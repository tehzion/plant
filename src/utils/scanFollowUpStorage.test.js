import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    getScanHistory: vi.fn(), getPlots: vi.fn(), isCloudUser: vi.fn(), writeStorageCollection: vi.fn(),
    from: vi.fn(), uploadPrivateImage: vi.fn(), neonDataRowRequest: vi.fn(),
}));
vi.mock('../lib/supabase.js', () => ({ supabase: { from: mocks.from } }));
vi.mock('./localStorage.js', () => ({ ...mocks, STORAGE_COLLECTION_KEYS: { STORAGE_KEY: 'scans' } }));
vi.mock('./privateImageStorage.js', () => ({ uploadPrivateImage: mocks.uploadPrivateImage }));
vi.mock('./neonApi.js', () => ({ neonDataRowRequest: mocks.neonDataRowRequest }));
const { saveScanFollowUp } = await import('./scanFollowUpStorage.js');
const changes = { outcome: 'improving', plotId: '', nextCheckDate: '2026-10-10', note: 'New leaves look better' };

describe('follow-up persistence', () => {
    beforeEach(() => {
        vi.resetAllMocks(); mocks.isCloudUser.mockReturnValue(false);
        mocks.getScanHistory.mockReturnValue([{ id: 'scan', disease: 'Leaf Spot', followUp: { history: [{ id: 'old' }] } }]);
        mocks.getPlots.mockResolvedValue([]); mocks.writeStorageCollection.mockReturnValue({ ok: true });
        mocks.neonDataRowRequest.mockReset();
    });
    it('appends an outcome without changing the original diagnosis or removing evidence', async () => {
        const saved = await saveScanFollowUp('scan', changes);
        expect(saved.followUp.history).toHaveLength(2);
        expect(mocks.writeStorageCollection.mock.calls[0][1][0].disease).toBe('Leaf Spot');
    });
    it('reports failed device writes and rejects unavailable plots', async () => {
        mocks.writeStorageCollection.mockReturnValue({ ok: false });
        await expect(saveScanFollowUp('scan', changes)).rejects.toThrow('storage');
        await expect(saveScanFollowUp('scan', { ...changes, plotId: 'other-user-plot' })).rejects.toThrow('plot');
    });
    it('scopes cloud reads and writes to the owner and detects concurrent updates', async () => {
        mocks.isCloudUser.mockReturnValue(true);
        mocks.neonDataRowRequest
            .mockResolvedValueOnce({ row: { result_json: { disease: 'Leaf Spot' }, revision: 7 } })
            .mockResolvedValueOnce({ row: null });
        await expect(saveScanFollowUp('scan', changes, 'owner')).rejects.toThrow('another session');
        expect(mocks.neonDataRowRequest).toHaveBeenNthCalledWith(1, 'scan_history', 'scan', { operation: 'get' });
        expect(mocks.neonDataRowRequest).toHaveBeenNthCalledWith(2, 'scan_history', 'scan', expect.objectContaining({
            operation: 'update', payload: expect.objectContaining({ revision: 8 }),
        }));
    });
});
