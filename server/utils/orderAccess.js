import crypto from 'node:crypto';

const SESSION_SECONDS = 30 * 24 * 60 * 60;
const developmentSecret = crypto.randomBytes(32).toString('hex');

const getSecret = () => {
    const secret = process.env.ORDER_ACCESS_SECRET;
    if (secret && secret.length >= 32) return secret;
    if (process.env.NODE_ENV !== 'production') return developmentSecret;
    const error = new Error('Guest order access is not configured');
    error.status = 503;
    throw error;
};

const sign = (payload) => crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');

export const createOrderSession = (existingGuestId) => {
    const guestId = existingGuestId || crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const payload = Buffer.from(JSON.stringify({ guestId, expiresAt })).toString('base64url');
    return { guestId, expiresAt, accessToken: `${payload}.${sign(payload)}` };
};

export const verifyOrderSession = (token = '') => {
    if (typeof token !== 'string' || token.length > 1024) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    try {
        const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!/^[a-f0-9-]{36}$/i.test(session.guestId) || !Number.isFinite(session.expiresAt)
            || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
        return session;
    } catch {
        return null;
    }
};

export const requireOrderSession = (req, res, next) => {
    try {
        const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const session = verifyOrderSession(token);
        if (!session) return res.status(401).json({ error: 'Valid guest order access is required' });
        req.orderSession = session;
        next();
    } catch (error) {
        next(error);
    }
};

export const ownsOrder = (order, guestId) => Boolean(order?.meta_data?.some(
    (entry) => entry.key === '_antigravity_app_id' && entry.value === guestId,
));

export const summarizeOrder = (order) => ({
    id: order.id,
    status: order.status,
    date_created: order.date_created,
    total: order.total,
    currency: order.currency,
    line_items: (order.line_items || []).map(({ product_id, name, quantity, total }) => ({
        product_id, name, quantity, total,
    })),
});
