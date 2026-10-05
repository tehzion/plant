// @vitest-environment node
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), upload: vi.fn(), upsert: vi.fn(), insert: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
import { logTrainingData, logFeedback } from './dataCollector.js';

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SUPABASE_URL', 'https://test.example');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-placeholder'); vi.stubEnv('DIAGNOSIS_DATA_BACKEND', 'supabase');
    mocks.createClient.mockReturnValue({
        storage: { from: vi.fn(() => ({ upload: mocks.upload })) },
        from: vi.fn(() => ({ upsert: mocks.upsert, insert: mocks.insert })),
    });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

it('stores private images and an idempotent durable diagnosis record', async () => {
    const id = '8ea7d623-6f88-4695-bce1-f7c71f4c3c47';
    const result = { disease: 'Leaf spot', confidence: 70 };
    expect(await logTrainingData({ id, treeImage: 'data:image/jpeg;base64,/9j/AA==', result })).toBe(true);
    expect(mocks.upload).toHaveBeenCalledWith(`training/${id}_tree.jpg`, expect.any(Buffer), expect.objectContaining({ upsert: true }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ id, raw_result: result }), { onConflict: 'id' });
});
it('reports an audit upload failure instead of writing a photo-less record', async () => {
    mocks.upload.mockResolvedValue({ error: new Error('storage offline') });
    expect(await logTrainingData({ id: 'scan-1', treeImage: 'data:image/jpeg;base64,/9j/AA==', result: {} })).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
});
it('stores feedback with the same scan ID', async () => {
    expect(await logFeedback({ scanId: 'scan-1', wasCorrect: true })).toBe(true);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ scan_id: 'scan-1', feedback: { scanId: 'scan-1', wasCorrect: true } }));
});
