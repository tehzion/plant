import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

let client;

const getConfig = () => ({
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
});

export const getServiceClient = () => {
    const { url, key } = getConfig();
    if (!url || !key) return null;
    if (!client) client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return client;
};

export const getAuthenticatedClient = (accessToken) => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY
        || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
        || process.env.SUPABASE_ANON_KEY
        || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || !accessToken) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
};

export const getBearerToken = (req) => {
    const header = req.get?.('authorization') || req.headers?.authorization || '';
    return String(header).match(/^Bearer\s+(.+)$/i)?.[1] || '';
};

// Each signed-in request used to make its own network call to Supabase Auth,
// and a farm page sends several at once. A verified session is now reused for
// up to SESSION_CACHE_MS (never past the token's own expiry), and requests that
// arrive together with the same token share one check. Trade-off: a session
// revoked on Supabase can keep working here for up to SESSION_CACHE_MS.
// Tokens are kept only as SHA-256 hashes.
const SESSION_CACHE_MS = 60_000;
const SESSION_CACHE_MAX = 500;
const verifiedSessions = new Map(); // hash -> { user, expiresAt }
const pendingVerifications = new Map(); // hash -> Promise<user>

const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');

// The JWT's own expiry, read without trusting it for anything else: the token
// has already been verified by Supabase before it is cached.
const tokenExpiryMs = (token) => {
    try {
        const payload = JSON.parse(Buffer.from(String(token).split('.')[1] || '', 'base64url').toString('utf8'));
        return Number.isFinite(payload?.exp) ? payload.exp * 1000 : Infinity;
    } catch {
        return Infinity;
    }
};

const rememberSession = (hash, token, user, now = Date.now()) => {
    const expiresAt = Math.min(now + SESSION_CACHE_MS, tokenExpiryMs(token));
    if (expiresAt <= now) return;
    if (verifiedSessions.size >= SESSION_CACHE_MAX) verifiedSessions.delete(verifiedSessions.keys().next().value);
    verifiedSessions.set(hash, { user, expiresAt });
};

export const clearVerifiedSessionCache = () => {
    verifiedSessions.clear();
    pendingVerifications.clear();
};

const verifyWithSupabase = async (token) => {
    const supabase = getServiceClient() || getAuthenticatedClient(token);
    if (!supabase) {
        const error = new Error('Sign-in is required.');
        error.status = 401;
        throw error;
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
        const authError = new Error('Your session is invalid or has expired.');
        authError.status = 401;
        throw authError;
    }
    return data.user;
};

export const verifyAuthenticatedUser = async (req) => {
    const token = getBearerToken(req);
    if (!token) {
        const error = new Error('Sign-in is required.');
        error.status = 401;
        throw error;
    }
    const hash = tokenHash(token);
    const cached = verifiedSessions.get(hash);
    if (cached && cached.expiresAt > Date.now()) return cached.user;
    if (cached) verifiedSessions.delete(hash);

    if (!pendingVerifications.has(hash)) {
        const check = verifyWithSupabase(token)
            .then((user) => { rememberSession(hash, token, user); return user; })
            .finally(() => pendingVerifications.delete(hash));
        pendingVerifications.set(hash, check);
    }
    return pendingVerifications.get(hash);
};

export const requireAuthenticatedUser = async (req, res, next) => {
    try {
        req.authUser = await verifyAuthenticatedUser(req);
        next();
    } catch (error) {
        next(error);
    }
};
