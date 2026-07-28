import { fetchJsonWithTimeout } from './networkRequest.js';

const PRODUCT_RECOMMENDATIONS_CACHE_PREFIX = 'kanb.productRecommendations.v1';
const PRODUCT_RECOMMENDATIONS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PRODUCT_CONSULTATION_WHATSAPP = '+60136667810';

export const PRODUCT_RECOMMENDATION_INTENTS = Object.freeze({
    TREATMENT_READY: 'treatment_ready',
    HEALTHY_MAINTENANCE: 'healthy_maintenance',
    SUPPORT_ONLY: 'support_only',
    CONSULTATION_NEEDED: 'consultation_needed',
});

const normalizeLanguage = (value = 'en') => (
    value === 'ms' ? 'ms' : value === 'zh' ? 'zh' : 'en'
);

const getCachedFallbackReason = (language = 'en') => {
    switch (normalizeLanguage(language)) {
        case 'ms':
            return 'Memaparkan padanan produk tersimpan terkini sementara katalog langsung tidak tersedia.';
        case 'zh':
            return '\u5b9e\u65f6\u76ee\u5f55\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u6b63\u5728\u663e\u793a\u6700\u8fd1\u4fdd\u5b58\u7684\u4ea7\u54c1\u5339\u914d\u3002';
        default:
            return 'Showing recent saved product matches while the live catalog is unavailable.';
    }
};

const getProductRequestMessages = (language = 'en') => {
    switch (normalizeLanguage(language)) {
        case 'ms':
            return {
                timeoutMessage: 'Cadangan produk mengambil masa terlalu lama. Sila cuba sebentar lagi.',
                networkMessage: 'Tidak dapat menghubungi perkhidmatan katalog produk. Sila semak sambungan anda.',
                unavailableMessage: 'Cadangan produk tidak tersedia buat masa ini. Sila cuba lagi kemudian.',
            };
        case 'zh':
            return {
                timeoutMessage: '\u4ea7\u54c1\u63a8\u8350\u54cd\u5e94\u65f6\u95f4\u8fc7\u957f\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002',
                networkMessage: '\u65e0\u6cd5\u8fde\u63a5\u4ea7\u54c1\u76ee\u5f55\u670d\u52a1\uff0c\u8bf7\u68c0\u67e5\u60a8\u7684\u7f51\u7edc\u8fde\u63a5\u3002',
                unavailableMessage: '\u4ea7\u54c1\u63a8\u8350\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002',
            };
        default:
            return {
                timeoutMessage: 'Product recommendations are taking too long. Please try again shortly.',
                networkMessage: 'Could not reach the product catalog service. Please check your connection.',
                unavailableMessage: 'Product recommendations are temporarily unavailable. Please try again later.',
            };
    }
};

export const createEmptyProductRecommendations = () => ({
    diseaseControl: [],
    fertilizers: [],
    supplements: [],
    otherPopular: [],
    reasoning: '',
    fallbackMeta: null,
    recommendationIntent: '',
    consultation: null,
    curatedRules: [],
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

const normalizeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const normalizeDiagnosticEvidence = (value) => {
    if (!value || typeof value !== 'object') return null;

    return {
        leafAgeAffected: normalizeText(value.leafAgeAffected),
        lesionShape: normalizeText(value.lesionShape),
        lesionBorderHalo: normalizeText(value.lesionBorderHalo),
        distributionPattern: normalizeText(value.distributionPattern),
        colorPattern: normalizeText(value.colorPattern),
        likelyCauseCategory: normalizeText(value.likelyCauseCategory),
        evidenceFor: normalizeList(value.evidenceFor),
        evidenceAgainst: normalizeList(value.evidenceAgainst),
    };
};

export const buildProductDiagnosisPayload = ({ plantType = '', disease = '', scanResult = {} } = {}) => ({
    scanId: normalizeText(scanResult?.id || scanResult?.scanId),
    plantType: normalizeText(plantType),
    disease: normalizeText(disease, 'None') || 'None',
    status: normalizeText(scanResult?.status),
    resultState: normalizeText(scanResult?.resultState),
    confidence: normalizeNumber(scanResult?.confidence),
    diagnosisConfidence: normalizeNumber(scanResult?.confidenceBreakdown?.diagnosisConfidence ?? scanResult?.diagnosisConfidence),
    needsMoreEvidence: Boolean(scanResult?.needsMoreEvidence || scanResult?.abstainReason || scanResult?.requiresRetake),
    requiresRetake: Boolean(scanResult?.requiresRetake),
    healthStatus: normalizeText(scanResult?.healthStatus, 'unknown') || 'unknown',
    pathogenType: normalizeText(scanResult?.pathogenType, 'None') || 'None',
    diseaseCategory: normalizeText(scanResult?.diseaseCategory),
    severity: normalizeText(scanResult?.severity),
    locationName: normalizeText(scanResult?.locationName || scanResult?.location_name),
    symptoms: normalizeList(scanResult?.symptoms),
    treatments: normalizeList(scanResult?.treatments),
    immediateActions: normalizeList(scanResult?.immediateActions),
    prevention: normalizeList(scanResult?.prevention),
    productSearchTags: normalizeList(scanResult?.productSearchTags),
    diagnosticEvidence: normalizeDiagnosticEvidence(scanResult?.diagnosticEvidence),
    nutritionalStatus: normalizeText(scanResult?.nutritionalIssues?.status),
});

export const createProductRecommendationsKey = (payload, language = 'en') => JSON.stringify({
    language: normalizeLanguage(language),
    plantType: normalizeText(payload?.plantType),
    disease: normalizeText(payload?.disease, 'None') || 'None',
    status: normalizeText(payload?.status),
    resultState: normalizeText(payload?.resultState),
    confidence: normalizeNumber(payload?.confidence),
    diagnosisConfidence: normalizeNumber(payload?.diagnosisConfidence),
    needsMoreEvidence: Boolean(payload?.needsMoreEvidence),
    requiresRetake: Boolean(payload?.requiresRetake),
    healthStatus: normalizeText(payload?.healthStatus, 'unknown') || 'unknown',
    pathogenType: normalizeText(payload?.pathogenType, 'None') || 'None',
    diseaseCategory: normalizeText(payload?.diseaseCategory),
    scanId: normalizeText(payload?.scanId),
    severity: normalizeText(payload?.severity),
    locationName: normalizeText(payload?.locationName),
    symptoms: normalizeList(payload?.symptoms),
    treatments: normalizeList(payload?.treatments),
    immediateActions: normalizeList(payload?.immediateActions),
    prevention: normalizeList(payload?.prevention),
    productSearchTags: normalizeList(payload?.productSearchTags),
    diagnosticEvidence: normalizeDiagnosticEvidence(payload?.diagnosticEvidence),
    nutritionalStatus: normalizeText(payload?.nutritionalStatus),
});

const buildProductRecommendationsCacheKey = (payload, language = 'en') => (
    `${PRODUCT_RECOMMENDATIONS_CACHE_PREFIX}:${createProductRecommendationsKey(payload, language)}`
);

const readProductRecommendationsCache = (payload, language = 'en') => {
    if (typeof window === 'undefined' || !window.localStorage) return null;

    try {
        const raw = window.localStorage.getItem(buildProductRecommendationsCacheKey(payload, language));
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

const writeProductRecommendationsCache = (payload, data, language = 'en') => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
        window.localStorage.setItem(
            buildProductRecommendationsCacheKey(payload, language),
            JSON.stringify({
                timestamp: Date.now(),
                data: normalizeProductRecommendationsResponse(data),
            }),
        );
    } catch {
        // Ignore cache-write failures and keep live recommendations working.
    }
};

const normalizeProductItem = (product = {}) => {
    if (!product || typeof product !== 'object') return null;
    return {
        ...product,
        matchScore: normalizeNumber(product.matchScore) ?? 0,
        matchReason: normalizeText(product.matchReason),
        matchedTerms: normalizeList(product.matchedTerms),
        curatedRuleId: normalizeText(product.curatedRuleId),
        curatedRuleName: normalizeText(product.curatedRuleName),
        activeIngredients: normalizeList(product.activeIngredients),
        matchedActiveIngredients: normalizeList(product.matchedActiveIngredients),
        cautionNote: normalizeText(product.cautionNote),
        recommendationRole: normalizeText(product.recommendationRole),
        cautionLevel: normalizeText(product.cautionLevel),
    };
};

const normalizeProductList = (value) => (
    Array.isArray(value) ? value.map(normalizeProductItem).filter(Boolean) : []
);

const normalizeConsultation = (value) => {
    if (!value || typeof value !== 'object') return null;
    return {
        phone: normalizeText(value.phone),
        url: normalizeText(value.url),
        message: normalizeText(value.message),
        label: normalizeText(value.label),
        priority: normalizeText(value.priority),
        reason: normalizeText(value.reason),
    };
};

export const createProductConsultationFromDiagnosis = (diagnosis = {}, recommendationIntent = PRODUCT_RECOMMENDATION_INTENTS.CONSULTATION_NEEDED, language = 'en') => {
    const phoneDigits = PRODUCT_CONSULTATION_WHATSAPP.replace(/\D/g, '');
    const confidence = normalizeNumber(diagnosis?.diagnosisConfidence ?? diagnosis?.confidence);
    const lines = [
        'Hi MojoSense team, I need consultation for this plant scan.',
        `Scan ID: ${normalizeText(diagnosis?.scanId, 'not recorded') || 'not recorded'}`,
        `Crop/plant: ${normalizeText(diagnosis?.plantType, 'Unknown crop') || 'Unknown crop'}`,
        `Disease/issue: ${normalizeText(diagnosis?.disease, 'Unknown issue') || 'Unknown issue'}`,
        confidence !== null ? `Confidence: ${Math.round(confidence)}%` : '',
        `Severity/status: ${normalizeText(diagnosis?.severity || diagnosis?.status, 'not recorded') || 'not recorded'}`,
        normalizeText(diagnosis?.locationName) ? `Location: ${normalizeText(diagnosis.locationName)}` : '',
        normalizeList(diagnosis?.symptoms).length ? `Symptoms: ${normalizeList(diagnosis.symptoms).slice(0, 3).join(', ')}` : '',
    ].filter(Boolean);
    const message = lines.join('\n');
    const primary = [
        PRODUCT_RECOMMENDATION_INTENTS.SUPPORT_ONLY,
        PRODUCT_RECOMMENDATION_INTENTS.CONSULTATION_NEEDED,
    ].includes(recommendationIntent);

    const label = normalizeLanguage(language) === 'ms'
        ? 'Hubungi kami untuk konsultasi'
        : normalizeLanguage(language) === 'zh'
            ? '\u8054\u7cfb\u6211\u4eec\u54a8\u8be2'
            : 'Contact us for consultation';
    const reason = normalizeLanguage(language) === 'ms'
        ? 'Hantar butiran imbasan kepada pasukan agronomi kami untuk semakan lanjut.'
        : normalizeLanguage(language) === 'zh'
            ? '\u5c06\u626b\u63cf\u8be6\u60c5\u53d1\u9001\u7ed9\u6211\u4eec\u7684\u519c\u827a\u56e2\u961f\u8fdb\u4e00\u6b65\u6838\u5bf9\u3002'
            : 'Send the scan details to our agronomy team for review.';

    return {
        phone: PRODUCT_CONSULTATION_WHATSAPP,
        url: `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`,
        message,
        label,
        priority: primary ? 'primary' : 'secondary',
        reason,
    };
};

export const normalizeProductRecommendationsResponse = (data = {}) => ({
    diseaseControl: normalizeProductList(data?.diseaseControl),
    fertilizers: normalizeProductList(data?.fertilizers),
    supplements: normalizeProductList(data?.supplements),
    otherPopular: normalizeProductList(data?.otherPopular),
    reasoning: normalizeText(data?.reasoning),
    fallbackMeta: data?.fallbackMeta && typeof data.fallbackMeta === 'object' ? data.fallbackMeta : null,
    recommendationIntent: normalizeText(data?.recommendationIntent),
    consultation: normalizeConsultation(data?.consultation),
    curatedRules: Array.isArray(data?.curatedRules) ? data.curatedRules : [],
    storeUrl: normalizeText(data?.storeUrl),
});

export const fetchLiveProductRecommendations = async ({ plantType = '', disease = '', scanResult = {}, language = 'en' } = {}) => {
    const diagnosis = buildProductDiagnosisPayload({ plantType, disease, scanResult });
    const targetLanguage = normalizeLanguage(language);
    const requestMessages = getProductRequestMessages(targetLanguage);
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
                body: JSON.stringify({ diagnosis, language: targetLanguage }),
            },
            {
                timeoutMs: 15000,
                ...requestMessages,
            },
        );

        const normalized = normalizeProductRecommendationsResponse(data);
        writeProductRecommendationsCache(diagnosis, normalized, targetLanguage);
        return normalized;
    } catch (error) {
        const cached = readProductRecommendationsCache(diagnosis, targetLanguage);
        if (cached) {
            return {
                ...cached,
                fallbackMeta: {
                    ...(cached.fallbackMeta && typeof cached.fallbackMeta === 'object' ? cached.fallbackMeta : {}),
                    used: true,
                    source: 'cache',
                    reason: getCachedFallbackReason(targetLanguage),
                },
            };
        }
        throw error;
    }
};
