import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

export const fetchAdminReviewSummary = async ({ days = 30, limit = 20 } = {}) => {
    if (!supabase?.auth?.getSession) {
        const error = new Error('Admin analytics needs Supabase login.');
        error.code = 'ADMIN_AUTH_UNAVAILABLE';
        throw error;
    }

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) {
        const error = new Error('Please sign in with an admin account.');
        error.code = 'ADMIN_AUTH_REQUIRED';
        throw error;
    }

    const params = new URLSearchParams({
        days: String(days),
        limit: String(limit),
    });
    const response = await fetch(`${API_URL}/api/admin/review-summary?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const error = new Error(payload?.message || payload?.error || 'Could not load admin analytics.');
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
};
