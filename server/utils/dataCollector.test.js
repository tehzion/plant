// @vitest-environment node
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), upload: vi.fn(), remove: vi.fn(), upsert: vi.fn(), insert: vi.fn(), queryNeon: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('./neonDatabase.js', () => ({ queryNeon: mocks.queryNeon }));
import { logTrainingData, logFeedback, withdrawTrainingImages } from './dataCollector.js';
import { DATA_CONSENT_VERSION } from '../../shared/dataConsent.js';

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SUPABASE_URL', 'https://test.example');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-placeholder'); vi.stubEnv('DIAGNOSIS_DATA_BACKEND', 'supabase');
    mocks.createClient.mockReturnValue({
        storage: { from: vi.fn(() => ({ upload: mocks.upload, remove: mocks.remove })) },
        from: vi.fn(() => ({ upsert: mocks.upsert, insert: mocks.insert })),
    });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.queryNeon.mockResolvedValue({ rows: [] });
});
afterEach(() => vi.unstubAllEnvs());

const OWNER = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const CONSENTED = { aiImprovement: true, version: DATA_CONSENT_VERSION };
const NOT_CONSENTED = { aiImprovement: false, version: DATA_CONSENT_VERSION };
const auditInsert = () => mocks.queryNeon.mock.calls.find(([sql]) => sql.includes('insert into public.diagnosis_training_logs'));

it('stores private images under the owner prefix and an owner-bound durable record', async () => {
    const id = '8ea7d623-6f88-4695-bce1-f7c71f4c3c47';
    const result = { disease: 'Leaf spot', confidence: 70 };
    mocks.queryNeon.mockImplementation(async (sql) => ({ rows: sql.startsWith('select') ? [] : [{ id }] }));
    expect(await logTrainingData({ id, ownerHash: OWNER, dataConsent: CONSENTED, treeImage: 'data:image/jpeg;base64,/9j/AA==', result })).toBe(true);
    expect(mocks.upload).toHaveBeenCalledWith(`training/${OWNER.slice(0, 16)}/${id}_tree.jpg`, expect.any(Buffer), expect.objectContaining({ upsert: true }));
    const [sql, params] = auditInsert();
    expect(sql).toContain("where diagnosis_training_logs.metadata->>'ownerHash' is not distinct from excluded.metadata->>'ownerHash'");
    expect(params).toEqual([id, expect.any(String), null, expect.objectContaining({ tree: `training/${OWNER.slice(0, 16)}/${id}_tree.jpg` }), result, { dataConsent: CONSENTED, ownerHash: OWNER }]);
});
it('refuses to overwrite an assessment that belongs to a different identity', async () => {
    mocks.queryNeon.mockResolvedValueOnce({ rows: [{ owner_hash: OTHER }] });
    expect(await logTrainingData({ id: 'scan-1', ownerHash: OWNER, treeImage: 'data:image/jpeg;base64,/9j/AA==', result: {} })).toBe(false);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(auditInsert()).toBeUndefined();
});
it('treats a lost race with another identity as a failed write', async () => {
    mocks.queryNeon.mockResolvedValue({ rows: [] });
    expect(await logTrainingData({ id: 'scan-1', ownerHash: OWNER, result: {} })).toBe(false);
});
it('reports an audit upload failure instead of writing a photo-less record', async () => {
    mocks.upload.mockResolvedValue({ error: new Error('storage offline') });
    expect(await logTrainingData({ id: 'scan-1', ownerHash: OWNER, dataConsent: CONSENTED, treeImage: 'data:image/jpeg;base64,/9j/AA==', result: {} })).toBe(false);
    expect(auditInsert()).toBeUndefined();
});
it('stores feedback with the same scan ID and server-side attribution', async () => {
    const attribution = { source: 'farmer', verifiedBy: 'scan_capability', submitterHash: OWNER };
    expect(await logFeedback({ scanId: 'scan-1', wasCorrect: true }, attribution)).toBe(true);
    expect(mocks.queryNeon).toHaveBeenCalledWith(expect.stringContaining('diagnosis_feedback'), ['scan-1', { scanId: 'scan-1', wasCorrect: true, attribution }, expect.any(String)]);
});
it('keeps the assessment but not the photos when the farmer has not opted in', async () => {
    const id = 'scan-2';
    mocks.queryNeon.mockImplementation(async (sql) => ({ rows: sql.startsWith('select') ? [] : [{ id }] }));
    expect(await logTrainingData({ id, ownerHash: OWNER, dataConsent: NOT_CONSENTED, treeImage: 'data:image/jpeg;base64,/9j/AA==', leafImage: 'data:image/jpeg;base64,/9j/AA==', result: {} })).toBe(true);
    expect(mocks.upload).not.toHaveBeenCalled();
    const [, params] = auditInsert();
    expect(params[3]).toEqual({ tree: null, leaf: null });
    expect(params[5]).toEqual({ dataConsent: NOT_CONSENTED, ownerHash: OWNER });
});
it('treats missing, malformed or outdated consent as no consent', async () => {
    mocks.queryNeon.mockImplementation(async (sql) => ({ rows: sql.startsWith('select') ? [] : [{ id: 'scan-3' }] }));
    for (const dataConsent of [undefined, { aiImprovement: 'yes', version: DATA_CONSENT_VERSION }, { aiImprovement: true, version: 'old' }]) {
        await logTrainingData({ id: 'scan-3', ownerHash: OWNER, dataConsent, treeImage: 'data:image/jpeg;base64,/9j/AA==', result: {} });
    }
    expect(mocks.upload).not.toHaveBeenCalled();
    const inserts = mocks.queryNeon.mock.calls.filter(([sql]) => sql.includes('insert into public.diagnosis_training_logs'));
    expect(inserts.map(([, params]) => params[5].dataConsent.aiImprovement)).toEqual([false, false, false]);
});
it('withdraws consent by deleting stored photos and marking the record not consented', async () => {
    mocks.queryNeon.mockImplementation(async (sql) => ({ rows: sql.startsWith('select') ? [{ images: { tree: 'training/a/s_tree.jpg', leaf: null } }] : [] }));
    expect(await withdrawTrainingImages('scan-4')).toEqual({ removed: 1 });
    expect(mocks.remove).toHaveBeenCalledWith(['training/a/s_tree.jpg']);
    const [sql, params] = mocks.queryNeon.mock.calls.find(([text]) => text.trim().startsWith('update'));
    expect(sql).toContain('dataConsent');
    expect(params[1]).toEqual({ tree: null, leaf: null });
    expect(params[2]).toMatchObject({ aiImprovement: false, withdrawnAt: expect.any(String) });
});
it('does not mark the record when photo deletion fails, and rejects invalid IDs', async () => {
    mocks.queryNeon.mockResolvedValue({ rows: [{ images: { tree: 'training/a/s_tree.jpg' } }] });
    mocks.remove.mockResolvedValue({ error: new Error('storage offline') });
    await expect(withdrawTrainingImages('scan-5')).rejects.toThrow('storage offline');
    expect(mocks.queryNeon.mock.calls.some(([text]) => text.trim().startsWith('update'))).toBe(false);
    await expect(withdrawTrainingImages('../etc')).rejects.toThrow('Invalid scan ID');
});
it('does not remove photos when the capability belongs to another audit owner with the same scan ID', async () => {
    mocks.queryNeon.mockResolvedValue({ rows: [{ images: { tree: 'training/owner/scan_tree.jpg' }, metadata: { ownerHash: 'original-owner' } }] });
    await expect(withdrawTrainingImages('scan-collision', 'other-owner')).rejects.toMatchObject({ status: 403 });
    expect(mocks.remove).not.toHaveBeenCalled();
});

it('returns null when there is no record to withdraw', async () => {
    mocks.queryNeon.mockResolvedValue({ rows: [] });
    expect(await withdrawTrainingImages('scan-6')).toBeNull();
});
