import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    getScanHistory: vi.fn(), getPlots: vi.fn(), isCloudUser: vi.fn(), writeStorageCollection: vi.fn(),
    from: vi.fn(), uploadPrivateImage: vi.fn(),
}));
vi.mock('../lib/supabase.js', () => ({ supabase: { from: mocks.from } }));
vi.mock('./localStorage.js', () => ({ ...mocks, STORAGE_COLLECTION_KEYS: { STORAGE_KEY: 'scans' } }));
vi.mock('./privateImageStorage.js', () => ({ uploadPrivateImage: mocks.uploadPrivateImage }));
const { saveScanFollowUp } = await import('./scanFollowUpStorage.js');
const changes = { outcome: 'improving', plotId: '', nextCheckDate: '2026-10-10', note: 'New leaves look better' };

describe('follow-up persistence', () => {
    beforeEach(() => {
        vi.resetAllMocks(); mocks.isCloudUser.mockReturnValue(false);
        mocks.getScanHistory.mockReturnValue([{ id: 'scan', disease: 'Leaf Spot', followUp: { history: [{ id: 'old' }] } }]);
        mocks.getPlots.mockResolvedValue([]); mocks.writeStorageCollection.mockReturnValue({ ok: true });
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
        const read = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { result_json: { disease: 'Leaf Spot' }, revision: 7 } }) };
        const write = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({ data: [] }) };
        mocks.from.mockReturnValueOnce(read).mockReturnValueOnce(write);
        await expect(saveScanFollowUp('scan', changes, 'owner')).rejects.toThrow('another session');
        expect(read.eq).toHaveBeenCalledWith('user_id', 'owner');
        expect(write.eq).toHaveBeenCalledWith('user_id', 'owner');
        expect(write.eq).toHaveBeenCalledWith('revision', 7);
        expect(write.update).toHaveBeenCalledWith(expect.objectContaining({ revision: 8 }));
    });
});
