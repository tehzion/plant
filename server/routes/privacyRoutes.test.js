// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ verifyAuthenticatedUser: vi.fn(), getAccountConsent: vi.fn(), saveAccountConsent: vi.fn() }));
vi.mock('../utils/supabaseAuth.js', () => ({ verifyAuthenticatedUser: mocks.verifyAuthenticatedUser }));
vi.mock('../services/accountConsentService.js', () => mocks);
import { registerPrivacyRoutes } from './privacyRoutes.js';
const routes = {};
registerPrivacyRoutes({ get: (path, handler) => { routes.get = handler; }, post: (path, handler) => { routes.post = handler; } });
beforeEach(() => { vi.clearAllMocks(); });
it('checks authentication before reading preferences', async () => {
    mocks.verifyAuthenticatedUser.mockRejectedValue(Object.assign(new Error('Sign in'), { status: 401 }));
    const next = vi.fn();
    await routes.get({}, {}, next);
    expect(next.mock.calls[0][0].status).toBe(401);
    expect(mocks.getAccountConsent).not.toHaveBeenCalled();
});
it('uses only the authenticated account when saving a client preference', async () => {
    mocks.verifyAuthenticatedUser.mockResolvedValue({ id: 'owner' });
    mocks.saveAccountConsent.mockResolvedValue({ aiImprovement: false });
    await routes.post({ body: { userId: 'other', aiImprovement: false } }, { json: vi.fn() }, vi.fn());
    expect(mocks.saveAccountConsent.mock.calls[0][0]).toBe('owner');
});
