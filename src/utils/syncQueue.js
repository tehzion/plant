import {
    enqueueOperation,
    listOperations,
    listPendingOperations,
    removeOperation,
    retryFailedOperations,
    updateOperation,
} from './indexedDbStorage.js';

export const SYNC_RETRY_DELAYS_MS = [2000, 5000, 15000, 60000];

const isRetryable = (error) => !error?.status || error.status === 408 || error.status === 429 || error.status >= 500;

export const SYNC_STATUS_EVENT = 'plant-sync-status';

const notifySyncStatus = (owner) => {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    try { window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: { owner } })); } catch { /* non-browser runtime */ }
};

export const queueSyncOperation = async (operation) => {
    const queued = await enqueueOperation(operation);
    notifySyncStatus(operation.owner);
    return queued;
};

/** Counts queued work by state so the UI can show what is still on the device. */
export const getSyncSummary = async (owner) => {
    const summary = { pending: 0, failed: 0, conflict: 0, lastError: '' };
    if (!owner) return summary;
    for (const operation of await listOperations(owner)) {
        if (operation.state === 'pending') summary.pending += 1;
        else if (operation.state === 'failed') { summary.failed += 1; summary.lastError = operation.lastError || summary.lastError; }
        else if (operation.state === 'conflict') summary.conflict += 1;
    }
    return summary;
};

export const retryFailedSync = async (owner) => {
    const count = await retryFailedOperations(owner);
    notifySyncStatus(owner);
    return count;
};

let activeFlush = null;

// Only one flush runs at a time per tab; overlapping "online" and
// "visibilitychange" events would otherwise send the same operation twice.
export const flushSyncQueue = (options) => {
    if (activeFlush) return activeFlush;
    activeFlush = runFlush(options).finally(() => { activeFlush = null; notifySyncStatus(options?.owner); });
    return activeFlush;
};

const runFlush = async ({ owner, send, isAuthenticated = true, onConflict = () => {}, onProgress = () => {}, onSynced = () => {} }) => {
    if (!owner || !isAuthenticated) return { synced: 0, conflicts: 0, failed: 0 };
    const operations = await listPendingOperations(owner);
    let synced = 0; let conflicts = 0; let failed = 0;
    for (const operation of operations) {
        if (operation.nextRetryAt && operation.nextRetryAt > Date.now()) continue;
        try {
            const result = await send(operation);
            if (result?.conflict) {
                conflicts += 1;
                await updateOperation({ ...operation, state: 'conflict', conflict: result });
                onConflict(operation, result);
            } else {
                synced += 1;
                // Server writes are idempotent, so if the tab closes before
                // this removal the replay is recognised as a duplicate.
                await removeOperation(operation.id);
                await onSynced(operation, result);
            }
        } catch (error) {
            // Losing connectivity mid-flush is not a failed attempt; leave the
            // remaining work pending for the next "online" event.
            if (typeof navigator !== 'undefined' && navigator.onLine === false && !error?.status) break;
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
