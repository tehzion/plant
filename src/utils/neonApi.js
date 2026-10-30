import { supabase } from '../lib/supabase';

const apiBase = () => String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const getNeonAccessToken = async () => {
    const result = await supabase?.auth?.getSession?.();
    return result?.data?.session?.access_token || '';
};

export const neonApiRequest = async (path, options = {}) => {
    const { authRequired = true, ...requestOptions } = options;
    const token = await getNeonAccessToken();
    if (!token && authRequired) throw new Error('Your session has expired. Sign in again and retry.');
    const headers = new Headers(requestOptions.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (requestOptions.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${apiBase()}${path}`, { ...requestOptions, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(payload.message || payload.error || 'Database request failed.');
        error.status = response.status;
        throw error;
    }
    return payload;
};

export const neonDataRequest = (table, payload = {}, options = {}) => neonApiRequest(`/api/data/${table}`, {
    method: options.method || 'POST',
    body: JSON.stringify(payload),
    authRequired: options.authRequired !== false,
});

export const neonDataRowRequest = (table, id, payload = {}) => neonApiRequest(`/api/data/${table}/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
});

export const fetchNeonRows = async (table, { limit = 500, offset = 0 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const result = await neonApiRequest(`/api/data/${table}?${params.toString()}`, { method: 'GET' });
    return result.rows || result.data || [];
};
