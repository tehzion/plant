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
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosis }),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }

    return normalizeProductRecommendationsResponse(await response.json());
};
