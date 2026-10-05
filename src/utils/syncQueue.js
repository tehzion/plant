import {
    enqueueOperation,
    listPendingOperations,
    removeOperation,
    updateOperation,
} from './indexedDbStorage.js';

export const SYNC_RETRY_DELAYS_MS = [2000, 5000, 15000, 60000];

const isRetryable = (error) => !error?.status || error.status === 408 || error.status === 429 || error.status >= 500;

export const queueSyncOperation = (operation) => enqueueOperation(operation);

export const flushSyncQueue = async ({ owner, send, isAuthenticated = true, onConflict = () => {}, onProgress = () => {} }) => {
    if (!owner || !isAuthenticated) return { synced: 0, conflicts: 0, failed: 0 };
    const operations = await listPendingOperations(owner);
    let synced = 0; let conflicts = 0; let failed = 0;
    for (const operation of operations) {
        try {
            const result = await send(operation);
            if (result?.conflict) {
                conflicts += 1;
                await updateOperation({ ...operation, state: 'conflict', conflict: result });
                onConflict(operation, result);
            } else {
                synced += 1;
                await removeOperation(operation.id);
            }
        } catch (error) {
            const attempts = operation.attempts + 1;
            if (!isRetryable(error) || attempts >= 5) {
                failed += 1;
                await updateOperation({ ...operation, attempts, state: 'failed', lastError: error.message });
            } else {
                await updateOperation({ ...operation, attempts, nextRetryAt: Date.now() + SYNC_RETRY_DELAYS_MS[Math.min(attempts - 1, SYNC_RETRY_DELAYS_MS.length - 1)] });
            }
        }
        onProgress({ synced, conflicts, failed });
    }
    return { synced, conflicts, failed };
};
