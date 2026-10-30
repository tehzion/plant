import { neonApiRequest } from './neonApi.js';

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
