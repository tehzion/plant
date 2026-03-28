import { fetchJsonWithTimeout } from './networkRequest.js';

const PRODUCT_RECOMMENDATIONS_CACHE_PREFIX = 'kanb.productRecommendations.v1';
const PRODUCT_RECOMMENDATIONS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const createEmptyProductRecommendations = () => ({
    diseaseControl: [],
    fertilizers: [],
    supplements: [],
    otherPopular: [],
    reasoning: '',
    fallbackMeta: null,
    storeUrl: '',
});

const normalizeText = (value, fallback = '') => {
    if (typeof value === 'string') return value.trim();
    if (value == null) return fallback;
    return String(value).trim() || fallback;
};

const normalizeList = (value) => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => normalizeText(item))
        .filter(Boolean);
};

export const buildProductDiagnosisPayload = ({ plantType = '', disease = '', scanResult = {} } = {}) => ({
    plantType: normalizeText(plantType),
    disease: normalizeText(disease, 'None') || 'None',
    healthStatus: normalizeText(scanResult?.healthStatus, 'unknown') || 'unknown',
    pathogenType: normalizeText(scanResult?.pathogenType, 'None') || 'None',
    symptoms: normalizeList(scanResult?.symptoms),
    treatments: normalizeList(scanResult?.treatments),
    productSearchTags: normalizeList(scanResult?.productSearchTags),
});

export const createProductRecommendationsKey = (payload) => JSON.stringify({
    plantType: normalizeText(payload?.plantType),
    disease: normalizeText(payload?.disease, 'None') || 'None',
    healthStatus: normalizeText(payload?.healthStatus, 'unknown') || 'unknown',
    pathogenType: normalizeText(payload?.pathogenType, 'None') || 'None',
    symptoms: normalizeList(payload?.symptoms),
    treatments: normalizeList(payload?.treatments),
    productSearchTags: normalizeList(payload?.productSearchTags),
});

const buildProductRecommendationsCacheKey = (payload) => (
    `${PRODUCT_RECOMMENDATIONS_CACHE_PREFIX}:${createProductRecommendationsKey(payload)}`
);

const readProductRecommendationsCache = (payload) => {
    if (typeof window === 'undefined' || !window.localStorage) return null;

    try {
        const raw = window.localStorage.getItem(buildProductRecommendationsCacheKey(payload));
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        const timestamp = Number(parsed?.timestamp || 0);
        const ageMs = Date.now() - timestamp;
        if (!Number.isFinite(ageMs) || ageMs > PRODUCT_RECOMMENDATIONS_CACHE_MAX_AGE_MS) {
            return null;
        }

        return normalizeProductRecommendationsResponse(parsed?.data);
    } catch {
        return null;
    }
};

const writeProductRecommendationsCache = (payload, data) => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
        window.localStorage.setItem(
            buildProductRecommendationsCacheKey(payload),
            JSON.stringify({
                timestamp: Date.now(),
                data: normalizeProductRecommendationsResponse(data),
            }),
        );
    } catch {
        // Ignore cache-write failures and keep live recommendations working.
    }
};

export const normalizeProductRecommendationsResponse = (data = {}) => ({
    diseaseControl: Array.isArray(data?.diseaseControl) ? data.diseaseControl : [],
    fertilizers: Array.isArray(data?.fertilizers) ? data.fertilizers : [],
    supplements: Array.isArray(data?.supplements) ? data.supplements : [],
    otherPopular: Array.isArray(data?.otherPopular) ? data.otherPopular : [],
    reasoning: normalizeText(data?.reasoning),
    fallbackMeta: data?.fallbackMeta && typeof data.fallbackMeta === 'object' ? data.fallbackMeta : null,
    storeUrl: normalizeText(data?.storeUrl),
});

export const fetchLiveProductRecommendations = async ({ plantType = '', disease = '', scanResult = {} } = {}) => {
    const diagnosis = buildProductDiagnosisPayload({ plantType, disease, scanResult });
    const hasContext = Boolean(diagnosis.plantType || (diagnosis.disease && diagnosis.disease !== 'None'));

    if (!hasContext) {
        return createEmptyProductRecommendations();
    }

    const url = `${import.meta.env.VITE_API_URL || ''}/api/products/search`;
    try {
        const data = await fetchJsonWithTimeout(
            url,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ diagnosis }),
            },
            {
                timeoutMs: 15000,
                timeoutMessage: 'Product recommendations are taking too long. Please try again shortly.',
                networkMessage: 'Could not reach the product catalog service. Please check your connection.',
                unavailableMessage: 'Product recommendations are temporarily unavailable. Please try again later.',
            },
        );

        const normalized = normalizeProductRecommendationsResponse(data);
        writeProductRecommendationsCache(diagnosis, normalized);
        return normalized;
    } catch (error) {
        const cached = readProductRecommendationsCache(diagnosis);
        if (cached) {
            return {
                ...cached,
                fallbackMeta: {
                    ...(cached.fallbackMeta && typeof cached.fallbackMeta === 'object' ? cached.fallbackMeta : {}),
                    used: true,
                    source: 'cache',
                    reason: 'Showing recent saved product matches while the live catalog is unavailable.',
                },
            };
        }
        throw error;
    }
};
