import { supabase } from '../lib/supabase.js';
import { flushSyncQueue } from './syncQueue.js';
import { deleteRecord, getMetadata, setMetadata, listOperations, updateOperation, removeOperation } from './indexedDbStorage.js';
import { neonDataRowRequest } from './neonApi.js';

const API_URL = import.meta.env.VITE_API_URL || '';
const TABLES = { scans: 'scan_history', logbook: 'mygap_logs', notes: 'daily_notes', plots: 'plots', checklist: 'mygap_checklist' };

export const resolveSyncConflict = async (userId, operationId, choice) => {
    if (!userId || !['mine', 'server'].includes(choice)) throw new Error('Invalid conflict choice.');
    const owner = `user:${userId}`;
    const operation = (await listOperations(owner)).find(op => op.id === operationId && op.state === 'conflict');
    if (!operation) throw new Error('Conflict not found.');
    const table = TABLES[operation.collection];
    if (!table) throw new Error('This conflict requires support.');
    const { row } = await neonDataRowRequest(table, operation.collection === 'checklist' ? userId : operation.recordId, { operation: 'get' });
    if (choice === 'mine') {
        if (!row || operation.type === 'create' || operation.conflict?.reason === 'ownership') throw new Error('The server record is unavailable. Keep the server version or contact support.');
        await updateOperation({ ...operation, expectedRecord: row, expectedRevision: row.revision ?? 0,
            ...(operation.collection === 'checklist' ? { payload: { ...operation.payload, updated_at: new Date().toISOString() } } : {}),
            state: 'pending', attempts: 0, nextRetryAt: 0, conflict: null });
        await flushAuthenticatedSyncQueue(userId);
    } else {
        await removeOperation(operation.id);
        await deleteRecord(owner, operation.collection === 'checklist' ? 'checklist:current' : operation.recordId);
        if (operation.collection === 'checklist') await setMetadata(`cloud-cache:${owner}:checklist`, row?.state || {});
        const key = `cloud-cache:${owner}:${operation.collection}`;
        const cached = await getMetadata(key) || [];
        await setMetadata(key, [...cached.filter(item => String(item.id) !== String(operation.recordId)), ...(row ? [row] : [])]);
    }
    window.dispatchEvent(new CustomEvent('plant-sync-status', { detail: { owner } }));
    window.dispatchEvent(new Event('plant-records-changed'));
};

export const flushAuthenticatedSyncQueue = async (userId, options = {}) => {
    if (!userId || !supabase?.auth?.getSession) return { synced: 0, conflicts: 0, failed: 0 };
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { synced: 0, conflicts: 0, failed: 0 };
    return flushSyncQueue({
        owner: `user:${userId}`,
        ...options,
        // Once the server has the record, drop the on-device pending copy.
        onSynced: async (operation, result) => {
            const owner = `user:${userId}`;
            if (operation.type === 'delete' && operation.collection === 'scans') {
                const paths = [operation.expectedRecord?.image_path, operation.expectedRecord?.leaf_image_path].filter(path => typeof path === 'string' && path.startsWith(`${userId}/`));
                if (paths.length && supabase?.storage?.from) {
                    const { error } = await supabase.storage.from('scan-images').remove(paths);
                    if (error) throw error;
                }
            }
            const key = `cloud-cache:${owner}:${operation.collection}`;
            const cached = await getMetadata(key);
            if (Array.isArray(cached)) {
                const rows = operation.type === 'delete' ? cached.filter(row => String(row.id) !== String(operation.recordId))
                    : cached.map(row => String(row.id) === String(operation.recordId) ? { ...row, ...operation.payload, ...(result?.revision != null ? { revision: result.revision } : {}) } : row);
                await setMetadata(key, rows);
            }
            await deleteRecord(owner, operation.collection === 'checklist' ? 'checklist:current' : operation.recordId).catch(() => {});
        },
        send: async (operation) => {
            const response = await fetch(`${API_URL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(operation),
            });
            const payload = await response.json().catch(() => ({}));
            if (response.status === 409) return { conflict: true, ...payload };
            if (!response.ok) {
                const error = new Error(payload.message || payload.error || 'Sync failed.');
                error.status = response.status;
                throw error;
            }
            return payload;
        },
    });
};
