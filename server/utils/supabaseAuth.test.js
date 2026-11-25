import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ auth: { getUser: mocks.getUser } }),
}));

const { verifyAuthenticatedUser, clearVerifiedSessionCache } = await import('./supabaseAuth.js');

const jwt = (expSeconds) => `h.${Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url')}.s`;
const reqWith = (token) => ({ headers: { authorization: `Bearer ${token}` } });

describe('verifyAuthenticatedUser session cache', () => {
    beforeEach(() => {
        process.env.SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
        mocks.getUser.mockReset();
        clearVerifiedSessionCache();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-25T08:00:00Z'));
    });
    afterEach(() => vi.useRealTimers());

    it('checks a session once and reuses it for up to 60 seconds', async () => {
        const token = jwt(Date.now() / 1000 + 3600);
        mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

        expect((await verifyAuthenticatedUser(reqWith(token))).id).toBe('u1');
        vi.advanceTimersByTime(59_000);
        expect((await verifyAuthenticatedUser(reqWith(token))).id).toBe('u1');
        expect(mocks.getUser).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(2_000);
        await verifyAuthenticatedUser(reqWith(token));
        expect(mocks.getUser).toHaveBeenCalledTimes(2);
    });

    it('shares one check between requests that arrive together', async () => {
        const token = jwt(Date.now() / 1000 + 3600);
        let resolve;
        mocks.getUser.mockReturnValue(new Promise((r) => { resolve = r; }));

        const all = Promise.all([1, 2, 3, 4, 5, 6].map(() => verifyAuthenticatedUser(reqWith(token))));
        resolve({ data: { user: { id: 'u1' } }, error: null });

        expect((await all).map((user) => user.id)).toEqual(['u1', 'u1', 'u1', 'u1', 'u1', 'u1']);
        expect(mocks.getUser).toHaveBeenCalledTimes(1);
    });

    it('never keeps a session past the token expiry', async () => {
        const token = jwt(Date.now() / 1000 + 10);
        mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

        await verifyAuthenticatedUser(reqWith(token));
        vi.advanceTimersByTime(11_000);
        await verifyAuthenticatedUser(reqWith(token));
        expect(mocks.getUser).toHaveBeenCalledTimes(2);
    });

    it('does not cache a rejected session and keeps tokens apart', async () => {
        const bad = jwt(Date.now() / 1000 + 3600);
        const good = jwt(Date.now() / 1000 + 3601);
        mocks.getUser.mockImplementation(async (token) => (token === bad
            ? { data: null, error: new Error('invalid') }
            : { data: { user: { id: 'u2' } }, error: null }));

        await expect(verifyAuthenticatedUser(reqWith(bad))).rejects.toMatchObject({ status: 401 });
        await expect(verifyAuthenticatedUser(reqWith(bad))).rejects.toMatchObject({ status: 401 });
        expect((await verifyAuthenticatedUser(reqWith(good))).id).toBe('u2');
        expect(mocks.getUser).toHaveBeenCalledTimes(3);
    });

    it('rejects a request with no token without calling Supabase', async () => {
        await expect(verifyAuthenticatedUser({ headers: {} })).rejects.toMatchObject({ status: 401 });
        expect(mocks.getUser).not.toHaveBeenCalled();
    });
});
