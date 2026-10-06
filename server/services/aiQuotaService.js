import { getServiceClient } from '../utils/supabaseAuth.js';

const memoryCounters = new Map();

const todayKey = () => new Date().toISOString().slice(0, 10);

export const consumeAiQuota = async ({ identity = 'anonymous', limit = 50 } = {}) => {
    const key = `${identity}:${todayKey()}`;
    const client = getServiceClient();
    if (!client) {
        const next = (memoryCounters.get(key) || 0) + 1;
        memoryCounters.set(key, next);
        return { allowed: next <= limit, used: next, limit };
    }
    const { data, error } = await client.rpc('consume_ai_quota', {
        p_identity_key: identity,
        p_window_date: todayKey(),
        p_limit: limit,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const used = Number(row?.used ?? row?.request_count ?? 0);
    const quotaLimit = Number(row?.quota_limit ?? row?.limit ?? limit);
    return { allowed: Boolean(row?.allowed), used, limit: quotaLimit };
};
