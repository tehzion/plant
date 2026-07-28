import { supabase } from '../lib/supabase';
import { getGuestId } from './localStorage';

export const CONSULTATION_LEAD_INTENT = 'whatsapp_consultation';
export const CONSULTATION_LEAD_SOURCE = 'product_recommendations';

const MAX_TEXT_LENGTH = 240;

const normalizeText = (value, fallback = '') => {
    const text = value == null ? fallback : String(value).trim();
    return text.slice(0, MAX_TEXT_LENGTH);
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

export const buildConsultationLeadPayload = ({
    diagnosis = {},
    consultation = {},
    recommendationIntent = '',
    userId = null,
    guestId = '',
    source = CONSULTATION_LEAD_SOURCE,
} = {}) => {
    const confidence = normalizeNumber(diagnosis.diagnosisConfidence ?? diagnosis.confidence);

    return {
        scan_id: normalizeText(diagnosis.scanId || diagnosis.id) || null,
        user_id: userId || null,
        guest_id: normalizeText(guestId) || null,
        disease: normalizeText(diagnosis.disease, 'Unknown issue') || 'Unknown issue',
        crop: normalizeText(diagnosis.plantType || diagnosis.cropType, 'Unknown crop') || 'Unknown crop',
        confidence,
        phone: normalizeText(consultation.phone, '+60136667810') || '+60136667810',
        contact_intent: CONSULTATION_LEAD_INTENT,
        recommendation_intent: normalizeText(recommendationIntent) || null,
        severity: normalizeText(diagnosis.severity || diagnosis.status) || null,
        status: normalizeText(diagnosis.status) || null,
        location_name: normalizeText(diagnosis.locationName || diagnosis.location_name) || null,
        source: normalizeText(source, CONSULTATION_LEAD_SOURCE) || CONSULTATION_LEAD_SOURCE,
        metadata: {
            consultationPriority: normalizeText(consultation.priority) || null,
            consultationReason: normalizeText(consultation.reason) || null,
            symptoms: normalizeList(diagnosis.symptoms),
            productSearchTags: normalizeList(diagnosis.productSearchTags),
        },
    };
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

export const saveConsultationLead = async ({
    diagnosis = {},
    consultation = {},
    recommendationIntent = '',
    source = CONSULTATION_LEAD_SOURCE,
} = {}) => {
    if (!supabase) {
        return { saved: false, skipped: true, reason: 'supabase_not_configured' };
    }

    try {
        const userId = await getSupabaseUserId();
        const payload = buildConsultationLeadPayload({
            diagnosis,
            consultation,
            recommendationIntent,
            userId,
            guestId: getGuestId(),
            source,
        });

        const { error } = await supabase
            .from('consultation_leads')
            .insert(payload);

        if (error) {
            console.warn('Consultation lead capture failed:', error.message);
            return { saved: false, error };
        }

        return { saved: true };
    } catch (error) {
        console.warn('Consultation lead capture exception:', error);
        return { saved: false, error };
    }
};
