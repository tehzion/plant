// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createOrderSession, verifyOrderSession, requireOrderSession, ownsOrder, summarizeOrder } from './orderAccess.js';

afterEach(() => vi.unstubAllEnvs());
describe('guest order access', () => {
    it('accepts signed sessions and rejects forged IDs and altered signatures', () => {
        const session = createOrderSession();
        expect(verifyOrderSession(session.accessToken).guestId).toBe(session.guestId);
        expect(verifyOrderSession(session.accessToken + 'x')).toBeNull();
        const [, signature] = session.accessToken.split('.');
        const payload = Buffer.from(JSON.stringify({ guestId: 'another-user', expiresAt: session.expiresAt })).toString('base64url');
        expect(verifyOrderSession(`${payload}.${signature}`)).toBeNull();
    });
    it('rejects expired sessions', () => {
        const session = createOrderSession();
        vi.spyOn(Date, 'now').mockReturnValue((session.expiresAt + 1) * 1000);
        expect(verifyOrderSession(session.accessToken)).toBeNull();
        vi.restoreAllMocks();
    });
    it('fails closed when production signing is not configured', () => {
        vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('ORDER_ACCESS_SECRET', '');
        expect(() => createOrderSession()).toThrow('not configured');
    });
    it('requires bearer access before allowing order requests', () => {
        const next = vi.fn();
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        requireOrderSession({ headers: {} }, res, next);
        expect(res.status).toHaveBeenCalledWith(401); expect(next).not.toHaveBeenCalled();
        const session = createOrderSession();
        const req = { headers: { authorization: `Bearer ${session.accessToken}` } };
        requireOrderSession(req, res, next);
        expect(req.orderSession.guestId).toBe(session.guestId); expect(next).toHaveBeenCalled();
    });
    it('checks ownership and excludes customer personal data', () => {
        const order = { id: 12, status: 'processing', total: '10', billing: { email: 'private@example.com' },
            shipping: { address_1: 'Private address' }, order_key: 'secret',
            meta_data: [{ key: '_antigravity_app_id', value: 'owner' }],
            line_items: [{ product_id: 1, name: 'Product', quantity: 2, total: '10', meta_data: ['private'] }] };
        expect(ownsOrder(order, 'owner')).toBe(true);
        expect(ownsOrder(order, 'other')).toBe(false);
        const publicOrder = summarizeOrder(order);
        for (const field of ['billing', 'shipping', 'meta_data', 'order_key']) expect(publicOrder).not.toHaveProperty(field);
        expect(publicOrder.line_items[0]).not.toHaveProperty('meta_data');
    });
});
