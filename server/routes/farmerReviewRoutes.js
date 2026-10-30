import { verifyScanCapability } from '../utils/scanCapability.js';
import { getBearerToken, verifyAuthenticatedUser } from '../utils/supabaseAuth.js';
import { verifyOrderSession } from '../utils/orderAccess.js';
import { getUserRow } from '../services/neonDataService.js';
import { getFarmerReviewSummary } from '../services/expertReviewService.js';

// Lets a farmer see whether an expert reviewed their own scan. Access follows
// the same rule as feedback: the scan's signed capability or the owning account.
export const canReadScanReview = async (req, scanId) => {
    if (verifyScanCapability(scanId, req.body?.feedbackToken)) return true;
    const token = getBearerToken(req);
    if (!token || verifyOrderSession(token)) return false;
    const user = await verifyAuthenticatedUser(req).catch(() => null);
    if (!user) return false;
    return Boolean(await getUserRow('scan_history', user.id, scanId).catch(() => null));
};

export const registerFarmerReviewRoutes = (app) => {
    // POST keeps the capability token out of URLs and access logs.
    app.post('/api/scans/:scanId/expert-review', async (req, res, next) => {
        try {
            const scanId = String(req.params.scanId || '');
            if (!await canReadScanReview(req, scanId)) return res.status(404).json({ review: null });
            res.json({ review: await getFarmerReviewSummary(scanId) });
        } catch (error) {
            // A missing review table (migration not yet applied) must not
            // break the result page.
            if (error?.code === '42P01') return res.json({ review: null });
            next(error);
        }
    });
};
