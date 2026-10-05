import { supabase } from '../lib/supabase.js';
import { flushSyncQueue } from './syncQueue.js';

const API_URL = import.meta.env.VITE_API_URL || '';

export const flushAuthenticatedSyncQueue = async (userId, options = {}) => {
    if (!userId || !supabase?.auth?.getSession) return { synced: 0, conflicts: 0, failed: 0 };
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { synced: 0, conflicts: 0, failed: 0 };
    return flushSyncQueue({
        owner: `user:${userId}`,
        ...options,
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
