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

export const verifyAuthenticatedUser = async (req) => {
    const supabase = getServiceClient();
    const token = getBearerToken(req);
    if (!supabase || !token) {
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

export const requireAuthenticatedUser = async (req, res, next) => {
    try {
        req.authUser = await verifyAuthenticatedUser(req);
        next();
    } catch (error) {
        next(error);
    }
};
