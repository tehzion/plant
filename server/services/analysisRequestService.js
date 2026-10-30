import { getNeonPool, queryNeon } from '../utils/neonDatabase.js';

const localClaims = new Map();

export const claimAnalysis = async ({ identity, scanId }) => {
    const key = `${identity}:${scanId}`;
    if (getNeonPool()) {
        const { rows } = await queryNeon(
            `insert into public.ai_analysis_requests(identity_key, scan_id, status, created_at, updated_at)
             values ($1, $2, 'processing', now(), now())
             on conflict (identity_key, scan_id) do nothing
             returning identity_key`,
            [identity, scanId],
        );
        return rows.length > 0;
    }
    if (localClaims.has(key)) return false;
    localClaims.set(key, true);
    return true;
};

export const releaseAnalysis = async ({ identity, scanId }) => {
    const key = `${identity}:${scanId}`;
    localClaims.delete(key);
    if (!getNeonPool()) return;
    try {
        await queryNeon('delete from public.ai_analysis_requests where identity_key = $1 and scan_id = $2', [identity, scanId]);
    } catch (error) {
        console.warn(JSON.stringify({ event: 'ai_idempotency_release_failed', message: error.message }));
    }
};
