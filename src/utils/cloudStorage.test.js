import { beforeEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), upload: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('./privateImageStorage.js', () => ({
    uploadPrivateImage: mocks.upload,
    resolvePrivateImageUrl: vi.fn(async (_path, fallback) => fallback),
}));
import { fetchAllUserRows, getDailyNotes, saveScan } from './localStorage.js';

beforeEach(() => vi.clearAllMocks());
describe('cloud records', () => {
    it('reads all records even when the server returns a lower page cap', async () => {
        const records = Array.from({ length: 650 }, (_, i) => ({ id: `note-${i}`, created_at: '2026-01-01', note: 'record' }));
        const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
            range: vi.fn(async (start) => ({ data: records.slice(start, start + 100), error: null, count: records.length })) };
        mocks.from.mockReturnValue(chain);
        const result = await getDailyNotes('user-1');
        expect(result).toHaveLength(650);
        expect(chain.range).toHaveBeenCalledTimes(7);
        expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });
    it('rejects partial results if a later page fails', async () => {
        const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValueOnce({ data: [{ id: 1 }], count: 2 })
                .mockResolvedValueOnce({ data: null, error: new Error('offline') }) };
        mocks.from.mockReturnValue(chain);
        await expect(fetchAllUserRows('daily_notes', 'user-1')).rejects.toThrow('offline');
    });
    it('does not create a photo-less scan after an upload failure', async () => {
        mocks.upload.mockResolvedValue({ path: '', signedUrl: '' });
        await expect(saveScan({ id: 'analysis-id', image: 'data:image/jpeg;base64,abc' }, 'user-1')).rejects.toThrow('Photo upload failed');
        expect(mocks.from).not.toHaveBeenCalled();
    });
    it('keeps the diagnosis ID in the cloud row and returned scan', async () => {
        mocks.upload.mockResolvedValue({ path: 'user-1/analysis-id_main.jpg', signedUrl: 'signed-url' });
        const insert = vi.fn().mockResolvedValue({ error: null }); mocks.from.mockReturnValue({ insert });
        const scan = await saveScan({ id: 'analysis-id', image: 'data:image/jpeg;base64,abc' }, 'user-1');
        expect(scan.id).toBe('analysis-id');
        expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id: 'analysis-id', user_id: 'user-1' }));
    });
});
