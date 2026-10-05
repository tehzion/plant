import { supabase } from '../lib/supabase.js';

const API_URL = import.meta.env.VITE_API_URL || '';

export const fetchReportSummary = async ({ from, to, plotId } = {}) => {
    if (!supabase?.auth?.getSession) throw new Error('Reports need an authenticated account.');
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Reports need an authenticated account.');
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (plotId && plotId !== 'all') params.set('plotId', plotId);
    const response = await fetch(`${API_URL}/api/reports/summary?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.error || 'Could not load reports.');
    return payload;
};
