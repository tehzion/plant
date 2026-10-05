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
    const { data: current, error: readError } = await client.from('ai_usage_counters')
        .select('request_count').eq('identity_key', identity).eq('window_date', todayKey()).maybeSingle();
    if (readError) throw readError;
    const next = Number(current?.request_count || 0) + 1;
    const { error } = await client.from('ai_usage_counters').upsert({
        identity_key: identity, window_date: todayKey(), request_count: next, updated_at: new Date().toISOString(),
    }, { onConflict: 'identity_key,window_date' });
    if (error) throw error;
    return { allowed: next <= limit, used: next, limit };
};
