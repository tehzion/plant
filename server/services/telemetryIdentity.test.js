// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ getBearerToken: vi.fn(), verifyAuthenticatedUser: vi.fn() }));
vi.mock('../utils/supabaseAuth.js', () => auth);
import { createOrderSession } from '../utils/orderAccess.js';
import { resolveTelemetryIdentity } from './telemetryIdentity.js';
beforeEach(() => { vi.clearAllMocks(); });
it('ignores forged guest IDs and attributes only the signed session', async () => {
    const session = createOrderSession();
    auth.getBearerToken.mockReturnValue(session.accessToken);
    expect(await resolveTelemetryIdentity({ body: { guest_id: 'another-farmer' } })).toEqual({ userId: null, guestId: session.guestId });
    expect(auth.verifyAuthenticatedUser).not.toHaveBeenCalled();
});
it('uses the verified account rather than either client identity', async () => {
    auth.getBearerToken.mockReturnValue('user-token');
    auth.verifyAuthenticatedUser.mockResolvedValue({ id: 'owner' });
    expect(await resolveTelemetryIdentity({ body: { user_id: 'other', guest_id: 'other' } })).toEqual({ userId: 'owner', guestId: null });
});
it('rejects telemetry without a verified session', async () => {
    auth.getBearerToken.mockReturnValue('');
    await expect(resolveTelemetryIdentity({})).rejects.toMatchObject({ status: 401 });
});
