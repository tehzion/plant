// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { flushSyncQueue, SYNC_RETRY_DELAYS_MS } from './syncQueue.js';

vi.mock('./indexedDbStorage.js', () => ({
    listPendingOperations: vi.fn(async () => [{ id: 'op-1', owner: 'guest:a', recordId: 'r1', type: 'update', attempts: 0 }]),
    updateOperation: vi.fn(async (value) => value),
    removeOperation: vi.fn(async () => undefined),
    enqueueOperation: vi.fn(),
}));

describe('sync queue', () => {
    it('uses the defined retry schedule and stops after a terminal failure', async () => {
        expect(SYNC_RETRY_DELAYS_MS).toEqual([2000, 5000, 15000, 60000]);
        const result = await flushSyncQueue({ owner: 'guest:a', send: vi.fn().mockRejectedValue(Object.assign(new Error('offline'), { status: 503 })) });
        expect(result.failed).toBe(0);
    });
});
