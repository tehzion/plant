import { getNeonPool, queryNeon } from '../utils/neonDatabase.js';

// Keeps the exact product list a farmer was shown on the scan's audit record,
// so expert reviewers judge what was actually recommended.
const MAX_PER_ROLE = 12;

const compactProducts = (products = []) => (Array.isArray(products) ? products : [])
    .slice(0, MAX_PER_ROLE)
    .map((product) => ({
        id: product?.id ?? null,
        name: String(product?.name || '').slice(0, 200),
        ...(product?.eligibility?.status ? { eligibility: product.eligibility.status } : {}),
    }));

export const buildRecommendationSnapshot = (response = {}, language = 'en') => ({
    recordedAt: new Date().toISOString(),
    language,
    recommendationIntent: response.recommendationIntent || null,
    treatment: compactProducts(response.diseaseControl),
    fertilizer: compactProducts(response.fertilizers),
    supplement: compactProducts(response.supplements),
    discovery: compactProducts(response.catalogueDiscovery),
    curatedRules: (response.curatedRules || []).map((rule) => rule?.id || rule).filter(Boolean).slice(0, 10),
});

// Only the scan owner (proved by ownerHash from the scan capability) can
// attach a snapshot; the update is a no-op for anyone else's scan.
export const saveRecommendationSnapshot = async ({ scanId, ownerHash, snapshot }) => {
    if (!scanId || !ownerHash || !snapshot || !getNeonPool()) return false;
    const { rowCount } = await queryNeon(
        `update public.diagnosis_training_logs
         set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{shownRecommendations}', $3::jsonb, true)
         where id = $1 and metadata->>'ownerHash' = $2`,
        [String(scanId), ownerHash, JSON.stringify(snapshot)],
    );
    return rowCount > 0;
};
