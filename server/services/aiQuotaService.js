import { getNeonPool, queryNeon } from '../utils/neonDatabase.js';

const memoryCounters = new Map();

const todayKey = () => new Date().toISOString().slice(0, 10);

export const consumeAiQuota = async ({ identity = 'anonymous', limit = 50 } = {}) => {
    const key = `${identity}:${todayKey()}`;
    if (!getNeonPool()) {
        const next = (memoryCounters.get(key) || 0) + 1;
        memoryCounters.set(key, next);
        return { allowed: next <= limit, used: next, limit };
    }
    const { rows } = await queryNeon(
        `insert into public.ai_usage_counters(identity_key, window_date, request_count, updated_at)
         values ($1, $2, 1, now())
         on conflict (identity_key, window_date) do update
         set request_count = public.ai_usage_counters.request_count + 1, updated_at = now()
         returning request_count`,
        [identity, todayKey()],
    );
    const used = Number(rows[0]?.request_count || 0);
    return { allowed: used <= limit, used, limit };
};
