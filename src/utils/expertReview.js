import { getNeonAccessToken, neonApiRequest } from './neonApi.js';

// Expert review API. Reviewer permission is enforced on the server; the
// browser only carries the signed-in session.
export const fetchReviewQueue = ({ status = 'needs_review', days = 30, limit = 30 } = {}) => {
    const params = new URLSearchParams({ status, days: String(days), limit: String(limit) });
    return neonApiRequest(`/api/expert/cases?${params.toString()}`, { method: 'GET' });
};

export const fetchReviewCase = (scanId) => neonApiRequest(`/api/expert/cases/${encodeURIComponent(scanId)}`, { method: 'GET' });

export const submitReview = (scanId, review) => neonApiRequest(`/api/expert/cases/${encodeURIComponent(scanId)}/reviews`, {
    method: 'POST',
    body: JSON.stringify(review),
});

const API_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Latest expert verdict for the farmer's own scan, or null. Never throws. */
export const fetchScanExpertReview = async (scan = {}) => {
    if (!scan?.id || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null;
    try {
        const token = await getNeonAccessToken().catch(() => '');
        const response = await fetch(`${API_URL}/api/scans/${encodeURIComponent(scan.id)}/expert-review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ feedbackToken: scan.feedbackToken || undefined }),
        });
        if (!response.ok) return null;
        return (await response.json())?.review || null;
    } catch {
        return null;
    }
};
