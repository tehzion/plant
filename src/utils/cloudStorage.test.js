import { beforeEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), upload: vi.fn(), fetchNeonRows: vi.fn(), neonDataRequest: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('./neonApi.js', () => ({ fetchNeonRows: mocks.fetchNeonRows, neonDataRequest: mocks.neonDataRequest, neonDataRowRequest: vi.fn() }));
vi.mock('./privateImageStorage.js', () => ({
    uploadPrivateImage: mocks.upload,
    resolvePrivateImageUrl: vi.fn(async (_path, fallback) => fallback),
}));
import { fetchAllUserRows, getDailyNotes, saveScan } from './localStorage.js';

beforeEach(() => { vi.clearAllMocks(); mocks.neonDataRequest.mockResolvedValue({ row: {} }); });
describe('cloud records', () => {
    it('reads all records even when the server returns a lower page cap', async () => {
        const records = Array.from({ length: 650 }, (_, i) => ({ id: `note-${i}`, created_at: '2026-01-01', note: 'record' }));
        mocks.fetchNeonRows.mockImplementation(async (_table, { offset }) => records.slice(offset, offset + 500));
        const result = await getDailyNotes('user-1');
        expect(result).toHaveLength(650);
        expect(mocks.fetchNeonRows).toHaveBeenCalledTimes(2);
    });
    it('rejects partial results if a later page fails', async () => {
        mocks.fetchNeonRows.mockResolvedValueOnce(Array.from({ length: 500 }, (_, id) => ({ id }))).mockRejectedValueOnce(new Error('offline'));
        await expect(fetchAllUserRows('daily_notes', 'user-1')).rejects.toThrow('offline');
    });
    it('does not create a photo-less scan after an upload failure', async () => {
        mocks.upload.mockResolvedValue({ path: '', signedUrl: '' });
        await expect(saveScan({ id: 'analysis-id', image: 'data:image/jpeg;base64,abc' }, 'user-1')).rejects.toThrow('Photo upload failed');
        expect(mocks.neonDataRequest).not.toHaveBeenCalled();
    });
    it('keeps the diagnosis ID in the cloud row and returned scan', async () => {
        mocks.upload.mockResolvedValue({ path: 'user-1/analysis-id_main.jpg', signedUrl: 'signed-url' });
        const scan = await saveScan({ id: 'analysis-id', image: 'data:image/jpeg;base64,abc' }, 'user-1');
        expect(scan.id).toBe('analysis-id');
        expect(mocks.neonDataRequest).toHaveBeenCalledWith('scan_history', expect.objectContaining({
            operation: 'insert', payload: expect.objectContaining({ id: 'analysis-id', user_id: 'user-1' }),
        }));
    });
});
