import { getNeonPool, queryNeon } from '../utils/neonDatabase.js';

const memoryCounters = new Map();

const todayKey = timeZone => timeZone
    ? new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    : new Date().toISOString().slice(0, 10);

export const consumeAiQuota = async ({ identity = 'anonymous', limit = 50, timeZone } = {}) => {
    const day = todayKey(timeZone);
    const key = `${identity}:${day}`;
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
        [identity, day],
    );
    const used = Number(rows[0]?.request_count || 0);
    return { allowed: used <= limit, used, limit };
};
