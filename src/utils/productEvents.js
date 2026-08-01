import { supabase } from '../lib/supabase';
import { getGuestId } from './localStorage';

export const PRODUCT_EVENT_TYPES = Object.freeze({
    PRODUCT_CLICK: 'product_click',
    CHECKOUT_CLICK: 'checkout_click',
    RECOMMENDED_CHECKOUT_CLICK: 'recommended_checkout_click',
});

const MAX_TEXT_LENGTH = 240;
const MAX_URL_LENGTH = 600;

const normalizeText = (value, fallback = '', maxLength = MAX_TEXT_LENGTH) => {
    const text = value == null ? fallback : String(value).trim();
    return text.slice(0, maxLength);
};

const normalizeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const normalizeList = (value) => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .slice(0, 5);
};

const getSupabaseUserId = async () => {
    if (!supabase?.auth?.getUser) return null;

    try {
        const { data } = await supabase.auth.getUser();
        return data?.user?.id || null;
    } catch {
        return null;
    }
};

export const buildProductEventPayload = ({
    diagnosis = {},
    product = {},
    eventType = PRODUCT_EVENT_TYPES.PRODUCT_CLICK,
    recommendationIntent = '',
    userId = null,
    guestId = '',
    metadata = {},
} = {}) => ({
    scan_id: normalizeText(diagnosis.scanId || diagnosis.id) || null,
    user_id: userId || null,
    guest_id: normalizeText(guestId) || null,
    event_type: normalizeText(eventType, PRODUCT_EVENT_TYPES.PRODUCT_CLICK, 80) || PRODUCT_EVENT_TYPES.PRODUCT_CLICK,
    product_id: normalizeText(product.id, '', 120) || null,
    product_name: normalizeText(product.name, 'Unknown product') || 'Unknown product',
    product_url: normalizeText(product.cartUrl || product.permalink || product.url, '', MAX_URL_LENGTH) || null,
    recommendation_intent: normalizeText(recommendationIntent, '', 80) || null,
    recommendation_role: normalizeText(product.recommendationRole, '', 80) || null,
    disease: normalizeText(diagnosis.disease, 'Unknown issue') || 'Unknown issue',
    crop: normalizeText(diagnosis.plantType || diagnosis.cropType, 'Unknown crop') || 'Unknown crop',
    confidence: normalizeNumber(diagnosis.diagnosisConfidence ?? diagnosis.confidence),
    metadata: {
        matchScore: normalizeNumber(product.matchScore),
        cautionLevel: normalizeText(product.cautionLevel) || null,
        matchedTerms: normalizeList(product.matchedTerms),
        selectedProductIds: normalizeList(metadata.selectedProductIds),
        productCount: normalizeNumber(metadata.productCount),
    },
});

export const saveProductEvent = async ({
    diagnosis = {},
    product = {},
    eventType = PRODUCT_EVENT_TYPES.PRODUCT_CLICK,
    recommendationIntent = '',
    metadata = {},
} = {}) => {
    if (!supabase) {
        return { saved: false, skipped: true, reason: 'supabase_not_configured' };
    }

    try {
        const userId = await getSupabaseUserId();
        const payload = buildProductEventPayload({
            diagnosis,
            product,
            eventType,
            recommendationIntent,
            userId,
            guestId: getGuestId(),
            metadata,
        });

        const { error } = await supabase
            .from('product_events')
            .insert(payload);

        if (error) {
            console.warn('Product event capture failed:', error.message);
            return { saved: false, error };
        }

        return { saved: true };
    } catch (error) {
        console.warn('Product event capture exception:', error);
        return { saved: false, error };
    }
};
