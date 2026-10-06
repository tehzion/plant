import { getServiceClient } from '../utils/supabaseAuth.js';

const localClaims = new Map();

export const claimAnalysis = async ({ identity, scanId }) => {
    const key = `${identity}:${scanId}`;
    const client = getServiceClient();
    if (client) {
        try {
            const { data, error } = await client.rpc('claim_ai_analysis', {
                p_identity_key: identity,
                p_scan_id: scanId,
            });
            if (!error) return Boolean(data);
            console.warn(JSON.stringify({ event: 'ai_idempotency_fallback', message: error.message }));
        } catch (error) {
            console.warn(JSON.stringify({ event: 'ai_idempotency_fallback', message: error.message }));
        }
    }
    if (localClaims.has(key)) return false;
    localClaims.set(key, true);
    return true;
};

export const releaseAnalysis = async ({ identity, scanId }) => {
    const key = `${identity}:${scanId}`;
    localClaims.delete(key);
    const client = getServiceClient();
    if (!client) return;
    try {
        await client.rpc('release_ai_analysis', { p_identity_key: identity, p_scan_id: scanId });
    } catch (error) {
        console.warn(JSON.stringify({ event: 'ai_idempotency_release_failed', message: error.message }));
    }
};
