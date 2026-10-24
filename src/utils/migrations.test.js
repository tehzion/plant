import { beforeEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ upload: vi.fn(), neonDataRequest: vi.fn(), neonDataRowRequest: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('./privateImageStorage.js', () => ({ uploadPrivateImage: mocks.upload, resolvePrivateImageUrl: vi.fn() }));
vi.mock('./neonApi.js', () => ({ neonDataRequest: mocks.neonDataRequest, neonDataRowRequest: mocks.neonDataRowRequest }));
import { migrateLocalStorageToSupabase } from './migrations.js';

const scansKey = 'sea_plant_scan_history';
const scan = { id: 'scan-1', image: 'data:image/jpeg;base64,abc', leafImage: 'data:image/jpeg;base64,def', disease: 'Leaf Spot' };
let persisted;
beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear();
    localStorage.setItem(scansKey, JSON.stringify([scan]));
    persisted = false;
    mocks.neonDataRequest.mockImplementation(async (table, payload) => {
        if (payload?.operation === 'bulk-upsert') persisted = true;
        return { rows: [] };
    });
    mocks.neonDataRowRequest.mockImplementation(async (_table, id) => ({ row: persisted ? { id, user_id: 'user-1' } : null }));
    mocks.upload.mockImplementation(async ({ path }) => ({ path, signedUrl: `signed:${path}` }));
});
describe('guest migration', () => {
    it('uploads both photos before inserting the row and clearing local originals', async () => {
        await migrateLocalStorageToSupabase('user-1');
        expect(mocks.upload).toHaveBeenCalledTimes(2);
        expect(mocks.neonDataRequest).toHaveBeenCalledWith('scan_history', { operation: 'bulk-upsert', rows: [expect.objectContaining({
            id: 'scan-1', image_path: 'user-1/scan-1_main.jpg', leaf_image_path: 'user-1/scan-1_leaf.jpg',
        })] });
        expect(localStorage.getItem(scansKey)).toBeNull();
        expect(localStorage.getItem('plant_migrated_user-1')).toBe('1');
    });
    it('retains originals when uploading a photo fails', async () => {
        mocks.upload.mockResolvedValue({ path: '', signedUrl: '' });
        await migrateLocalStorageToSupabase('user-1');
        expect(mocks.neonDataRequest).not.toHaveBeenCalled();
        expect(JSON.parse(localStorage.getItem(scansKey))).toEqual([scan]);
        expect(localStorage.getItem('plant_migrated_user-1')).toBeNull();
    });
    it('retains originals after a failed database write and retries safely', async () => {
        mocks.neonDataRequest.mockRejectedValueOnce(new Error('offline'));
        await migrateLocalStorageToSupabase('user-1');
        expect(localStorage.getItem(scansKey)).not.toBeNull();
        await migrateLocalStorageToSupabase('user-1');
        expect(localStorage.getItem(scansKey)).toBeNull();
    });
    it('pauses on an existing cloud ID before uploading local images', async () => {
        mocks.neonDataRowRequest.mockResolvedValue({ row: { id: 'scan-1', user_id: 'user-1' } });

        await migrateLocalStorageToSupabase('user-1');

        expect(mocks.upload).not.toHaveBeenCalled();
        expect(mocks.neonDataRequest).not.toHaveBeenCalled();
        expect(localStorage.getItem(scansKey)).not.toBeNull();
        expect(localStorage.getItem('plant_migrated_user-1')).toBeNull();
    });
    it('shares an in-flight migration and preserves records added during upload', async () => {
        let release;
        mocks.neonDataRequest.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
        const first = migrateLocalStorageToSupabase('user-1');
        const second = migrateLocalStorageToSupabase('user-1');
        expect(second).toBe(first);
        await vi.waitFor(() => expect(release).toBeTypeOf('function'));
        localStorage.setItem(scansKey, JSON.stringify([scan, { id: 'new-scan' }]));
        release({ error: null }); await first;
        expect(JSON.parse(localStorage.getItem(scansKey))).toHaveLength(2);
        expect(localStorage.getItem('plant_migrated_user-1')).toBeNull();
    });
});
