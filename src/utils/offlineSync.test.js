import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for the IndexedDB layer. It survives module reloads (the
// equivalent of an app restart) because it lives outside the modules under test.
const idb = vi.hoisted(() => ({ ops: new Map(), records: new Map(), meta: new Map() }));
vi.mock('./indexedDbStorage.js', async () => {
    const actual = await vi.importActual('./indexedDbStorage.js');
    const key = (owner, id) => `${owner}:${id}`;
    return {
        findQueuedDuplicate: actual.findQueuedDuplicate,
        isIndexedDbAvailable: () => true,
        enqueueOperation: vi.fn(async (input) => {
            const existing = actual.findQueuedDuplicate([...idb.ops.values()].filter((op) => op.owner === input.owner), input);
            const op = existing ? { ...existing, payload: input.payload } : { id: `op-${idb.ops.size + 1}`, state: 'pending', attempts: 0, nextRetryAt: 0, createdAt: new Date(Date.now() + idb.ops.size).toISOString(), ...input };
            idb.ops.set(op.id, op);
            return op;
        }),
        listOperations: async (owner) => [...idb.ops.values()].filter((op) => op.owner === owner),
        listPendingOperations: async (owner) => [...idb.ops.values()].filter((op) => op.owner === owner && op.state === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        updateOperation: async (op) => { idb.ops.set(op.id, op); },
        removeOperation: async (id) => { idb.ops.delete(id); },
        retryFailedOperations: async (owner) => {
            const failed = [...idb.ops.values()].filter((op) => op.owner === owner && op.state === 'failed');
            failed.forEach((op) => idb.ops.set(op.id, { ...op, state: 'pending', nextRetryAt: 0, lastError: null }));
            return failed.length;
        },
        putRecord: async ({ owner, collection, id, value }) => { idb.records.set(key(owner, id), { owner, collection, id, value }); },
        getRecord: async (owner, id) => idb.records.get(key(owner, id))?.value ?? null,
        listRecords: async (owner, collection) => [...idb.records.values()].filter((row) => row.owner === owner && (!collection || row.collection === collection)).map((row) => row.value),
        deleteRecord: async (owner, id) => { idb.records.delete(key(owner, id)); },
        getMetadata: async (k) => idb.meta.get(k) ?? null,
        setMetadata: async (k, v) => { idb.meta.set(k, v); },
        putPhoto: vi.fn(), dataUrlToBlob: () => null,
    };
});
const api = vi.hoisted(() => ({ neonDataRequest: vi.fn(), fetchNeonRows: vi.fn(), neonDataRowRequest: vi.fn() }));
vi.mock('./neonApi.js', () => api);
vi.mock('../lib/supabase', () => ({ supabase: { storage: {}, auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } } }));
vi.mock('./privateImageStorage.js', () => ({ resolvePrivateImageUrl: async (_path, url) => url || '', uploadPrivateImage: vi.fn() }));

const USER = '33333333-3333-4333-8333-333333333333';
const OWNER = `user:${USER}`;
const networkDown = () => new TypeError('Failed to fetch');
const setOnline = (value) => vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(value);

beforeEach(() => {
    idb.ops.clear(); idb.records.clear(); idb.meta.clear();
    vi.clearAllMocks();
});
afterEach(() => vi.restoreAllMocks());

describe('offline record saving for signed-in farmers', () => {
    it('keeps a myGAP entry on the device and queues it when the network is down', async () => {
        setOnline(false);
        api.neonDataRequest.mockRejectedValue(networkDown());
        const { saveLogEntry } = await import('./localStorage.js');
        const saved = await saveLogEntry({ type: 'pesticide', notes: 'Sprayed block A', crop: 'Chilli', quantity: '2 tanks', operator: 'Ali' }, USER);
        expect(saved).toMatchObject({ syncStatus: 'pending', crop: 'Chilli', quantity: '2 tanks', operator: 'Ali' });
        const [op] = idb.ops.values();
        expect(op).toMatchObject({ owner: OWNER, collection: 'logbook', type: 'create', recordId: saved.id });
        // The owner is never taken from the queued payload.
        expect(op.payload).not.toHaveProperty('user_id');
    });

    it('does not silently queue records the server rejected for a non-network reason', async () => {
        setOnline(true);
        api.neonDataRequest.mockRejectedValue(Object.assign(new Error('This record ID is already in use.'), { status: 409 }));
        const { saveDailyNote } = await import('./localStorage.js');
        expect(await saveDailyNote({ note: 'x' }, USER)).toBeNull();
        expect(idb.ops.size).toBe(0);
    });

    it('shows pending records alongside the last cached copy while offline', async () => {
        const { getLogbook, saveLogEntry } = await import('./localStorage.js');
        setOnline(true);
        api.fetchNeonRows.mockResolvedValueOnce([{ id: 'server-1', type: 'fertilizer', notes: 'From server', created_at: '2026-10-01T00:00:00Z' }]);
        expect((await getLogbook(USER)).map((row) => row.id)).toEqual(['server-1']);
        vi.restoreAllMocks();
        setOnline(false);
        api.neonDataRequest.mockRejectedValue(networkDown());
        api.fetchNeonRows.mockRejectedValue(networkDown());
        const pending = await saveLogEntry({ type: 'harvest', notes: 'Offline entry' }, USER);
        const rows = await getLogbook(USER);
        expect(rows.map((row) => row.id)).toEqual([pending.id, 'server-1']);
        expect(rows[0].syncStatus).toBe('pending');
    });

    it('queues an offline checklist change and prefers it over the server copy', async () => {
        setOnline(false);
        api.neonDataRequest.mockRejectedValue(networkDown());
        const { getChecklistState, saveChecklistState } = await import('./localStorage.js');
        expect(await saveChecklistState({ water: true }, USER)).toBe(true);
        expect([...idb.ops.values()][0]).toMatchObject({ collection: 'checklist', type: 'update', payload: { state: { water: true } } });
        expect(await getChecklistState(USER)).toEqual({ water: true });
        expect(api.fetchNeonRows).not.toHaveBeenCalled();
    });
});

describe('sync queue reliability', () => {
    const queue = async (recordId, payload = {}) => {
        const { queueSyncOperation } = await import('./syncQueue.js');
        return queueSyncOperation({ owner: OWNER, collection: 'notes', recordId, type: 'create', payload });
    };

    it('persists queued work across an app restart', async () => {
        setOnline(false);
        await queue('note-1', { note: 'a' });
        vi.resetModules();
        const { getSyncSummary } = await import('./syncQueue.js');
        expect(await getSyncSummary(OWNER)).toMatchObject({ pending: 1, failed: 0 });
    });

    it('collapses repeated saves of the same record into one operation', async () => {
        await queue('note-1', { note: 'first' });
        await queue('note-1', { note: 'second' });
        expect(idb.ops.size).toBe(1);
        expect([...idb.ops.values()][0].payload).toEqual({ note: 'second' });
    });

    it('treats a duplicate replay as synced and removes the local pending copy', async () => {
        setOnline(true);
        await queue('note-1');
        idb.records.set(`${OWNER}:note-1`, { owner: OWNER, collection: 'notes', id: 'note-1', value: { id: 'note-1' } });
        const { flushSyncQueue } = await import('./syncQueue.js');
        const onSynced = vi.fn(async (op) => { idb.records.delete(`${OWNER}:${op.recordId}`); });
        const result = await flushSyncQueue({ owner: OWNER, send: vi.fn(async () => ({ ok: true, duplicate: true })), onSynced });
        expect(result.synced).toBe(1);
        expect(idb.ops.size).toBe(0);
        expect(idb.records.size).toBe(0);
    });

    it('recovers from an interrupted sync without losing or double-counting work', async () => {
        await queue('note-1'); await queue('note-2');
        const { flushSyncQueue } = await import('./syncQueue.js');
        const onLine = setOnline(true);
        const send = vi.fn()
            .mockResolvedValueOnce({ ok: true })
            .mockImplementationOnce(async () => { onLine.mockReturnValue(false); throw networkDown(); });
        expect(await flushSyncQueue({ owner: OWNER, send })).toMatchObject({ synced: 1, failed: 0 });
        const [remaining] = idb.ops.values();
        expect(remaining).toMatchObject({ recordId: 'note-2', state: 'pending', attempts: 0 });
        onLine.mockReturnValue(true);
        expect(await flushSyncQueue({ owner: OWNER, send: vi.fn(async () => ({ ok: true })) })).toMatchObject({ synced: 1 });
        expect(idb.ops.size).toBe(0);
    });

    it('runs one flush at a time so overlapping triggers cannot send twice', async () => {
        setOnline(true);
        await queue('note-1');
        const { flushSyncQueue } = await import('./syncQueue.js');
        const send = vi.fn(async () => ({ ok: true }));
        await Promise.all([flushSyncQueue({ owner: OWNER, send }), flushSyncQueue({ owner: OWNER, send })]);
        expect(send).toHaveBeenCalledOnce();
    });

    it('keeps conflicts and terminal failures visible instead of discarding them', async () => {
        setOnline(true);
        await queue('note-1'); await queue('note-2');
        const { flushSyncQueue, getSyncSummary, retryFailedSync } = await import('./syncQueue.js');
        const send = vi.fn()
            .mockResolvedValueOnce({ conflict: true, reason: 'ownership' })
            .mockRejectedValueOnce(Object.assign(new Error('Invalid sync operation.'), { status: 400 }));
        await flushSyncQueue({ owner: OWNER, send });
        expect(await getSyncSummary(OWNER)).toEqual({ pending: 0, failed: 1, conflict: 1, lastError: 'Invalid sync operation.' });
        expect(await retryFailedSync(OWNER)).toBe(1);
        expect((await getSyncSummary(OWNER)).pending).toBe(1);
    });
});
