// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ verifyUser: vi.fn(), getUserRow: vi.fn(), summary: vi.fn() }));
vi.mock('../utils/supabaseAuth.js', async () => ({
    ...(await vi.importActual('../utils/supabaseAuth.js')),
    verifyAuthenticatedUser: mocks.verifyUser,
}));
vi.mock('../services/neonDataService.js', () => ({ getUserRow: mocks.getUserRow }));
vi.mock('../services/expertReviewService.js', () => ({ getFarmerReviewSummary: mocks.summary }));

import { registerFarmerReviewRoutes } from './farmerReviewRoutes.js';
import { createScanCapability } from '../utils/scanCapability.js';

const routes = {};
registerFarmerReviewRoutes({ post: (path, handler) => { routes[path] = handler; } });
const call = async (req) => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();
    await routes['/api/scans/:scanId/expert-review']({ headers: {}, get: () => '', body: {}, ...req }, res, next);
    if (next.mock.calls[0]?.[0]) throw next.mock.calls[0][0];
    return res;
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.summary.mockResolvedValue({ verdict: 'corrected', correctedDiagnosis: 'Septoria Leaf Spot' });
});

describe('farmer view of expert reviews', () => {
    it('returns the latest verdict to the device that ran the scan', async () => {
        const feedbackToken = createScanCapability('scan-1', 'guest:a');
        const res = await call({ params: { scanId: 'scan-1' }, body: { feedbackToken } });
        expect(res.json).toHaveBeenCalledWith({ review: { verdict: 'corrected', correctedDiagnosis: 'Septoria Leaf Spot' } });
    });

    it('returns the verdict to the signed-in owner of the scan', async () => {
        mocks.verifyUser.mockResolvedValue({ id: 'user-a' });
        mocks.getUserRow.mockResolvedValue({ id: 'scan-1' });
        const res = await call({ params: { scanId: 'scan-1' }, headers: { authorization: 'Bearer token' } });
        expect(mocks.getUserRow).toHaveBeenCalledWith('scan_history', 'user-a', 'scan-1');
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ review: expect.any(Object) }));
    });

    it('hides reviews from anyone else, including a token for another scan', async () => {
        const otherToken = createScanCapability('scan-2', 'guest:a');
        const res = await call({ params: { scanId: 'scan-1' }, body: { feedbackToken: otherToken } });
        expect(res.status).toHaveBeenCalledWith(404);
        mocks.verifyUser.mockResolvedValue({ id: 'user-b' });
        mocks.getUserRow.mockResolvedValue(null);
        const notOwner = await call({ params: { scanId: 'scan-1' }, headers: { authorization: 'Bearer token' } });
        expect(notOwner.status).toHaveBeenCalledWith(404);
        expect(mocks.summary).not.toHaveBeenCalled();
    });

    it('treats a missing review table as no review', async () => {
        mocks.summary.mockRejectedValue(Object.assign(new Error('relation does not exist'), { code: '42P01' }));
        const res = await call({ params: { scanId: 'scan-1' }, body: { feedbackToken: createScanCapability('scan-1', 'guest:a') } });
        expect(res.json).toHaveBeenCalledWith({ review: null });
    });
});
