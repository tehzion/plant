import { getNeonPool, queryNeon } from '../utils/neonDatabase.js';
import { getAuthenticatedClient, getServiceClient } from '../utils/supabaseAuth.js';

const ADMIN_SUMMARY_DEFAULT_DAYS = 30;
const ADMIN_SUMMARY_MAX_LIMIT = 50;

const parseList = (value = '') => String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeText = (value, fallback = '') => {
    const text = value == null ? fallback : String(value).trim();
    return text;
};

const normalizeList = (value, limit = 5) => (Array.isArray(value) ? value : [])
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, limit);

const getAdminClient = (token) => {
    return getServiceClient() || getAuthenticatedClient(token);
};

const getBearerToken = (req) => {
    const header = req.get?.('authorization') || req.headers?.authorization || '';
    const match = String(header).match(/^Bearer\s+(.+)$/i);
    return match?.[1] || '';
};

export const getAdminEmails = () => (
    new Set(parseList(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase()))
);

export const normalizeAdminLimit = (value, fallback = 20) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(Math.max(Math.trunc(number), 1), ADMIN_SUMMARY_MAX_LIMIT);
};

export const normalizeAdminDays = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return ADMIN_SUMMARY_DEFAULT_DAYS;
    return Math.min(Math.max(Math.trunc(number), 1), 365);
};

export const getScanStateFromRow = (row = {}) => {
    const result = row.result_json && typeof row.result_json === 'object' ? row.result_json : {};
    return normalizeText(result.resultState || result.status || row.status || '').toLowerCase();
};

export const isUncertainScanRow = (row = {}) => {
    const result = row.result_json && typeof row.result_json === 'object' ? row.result_json : {};
    const state = getScanStateFromRow(row);
    return Boolean(
        result.requiresRetake
        || result.needsMoreEvidence
        || result.abstainReason
        || ['needs_closer_photo', 'expert_review_needed', 'possible_pest', 'possible_nutrient_issue', 'uncertain', 'retake_required', 'inconclusive'].includes(state)
        || (Number.isFinite(Number(row.confidence)) && Number(row.confidence) < 70)
    );
};

const normalizeRecentScan = (row = {}) => {
    const result = row.result_json && typeof row.result_json === 'object' ? row.result_json : {};
    return {
        id: row.id,
        crop: normalizeText(result.plantType || result.cropType || row.category || 'Unknown crop'),
        disease: normalizeText(row.disease || result.disease || 'Unknown issue'),
        confidence: row.confidence == null ? null : Number(row.confidence),
        severity: normalizeText(row.severity || result.severity),
        status: getScanStateFromRow(row),
        locationName: normalizeText(row.location_name || result.locationName),
        createdAt: row.created_at,
        needsReview: isUncertainScanRow(row),
    };
};

const normalizeLead = (row = {}) => ({
    id: row.id,
    scanId: row.scan_id,
    crop: row.crop,
    disease: row.disease,
    confidence: row.confidence == null ? null : Number(row.confidence),
    phone: row.phone,
    recommendationIntent: row.recommendation_intent,
    source: row.source,
    createdAt: row.created_at,
});

const normalizeProductEvent = (row = {}) => ({
    id: row.id,
    scanId: row.scan_id,
    eventType: row.event_type,
    productId: row.product_id,
    productName: row.product_name,
    recommendationIntent: row.recommendation_intent,
    recommendationRole: row.recommendation_role,
    crop: row.crop,
    disease: row.disease,
    matchScore: Number.isFinite(Number(row.metadata?.matchScore)) ? Number(row.metadata.matchScore) : null,
    matchedTerms: normalizeList(row.metadata?.matchedTerms),
    matchedFields: row.metadata?.matchedFields && typeof row.metadata.matchedFields === 'object'
        ? row.metadata.matchedFields
        : {},
    createdAt: row.created_at,
});

const topBy = (items, getKey, limit = 8) => {
    const counts = new Map();
    items.forEach((item) => {
        const key = normalizeText(getKey(item));
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
        .slice(0, limit);
};

const runSelect = async (table, select, sinceIso, limit) => {
    const { rows } = await queryNeon(
        `select ${select} from public.${table} where created_at >= $1 order by created_at desc limit $2`,
        [sinceIso, limit],
    );
    return Array.isArray(rows) ? rows : [];
};

export const verifyAdminRequest = async (req) => {
    const token = getBearerToken(req);
    const client = getAdminClient(token);
    const adminEmails = getAdminEmails();
    if (!client || adminEmails.size === 0) {
        const error = new Error('Admin analytics is not configured.');
        error.status = 503;
        throw error;
    }

    if (!token) {
        const error = new Error('Admin sign-in is required.');
        error.status = 401;
        throw error;
    }

    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.email) {
        const authError = new Error('Admin session could not be verified.');
        authError.status = 401;
        throw authError;
    }

    const email = data.user.email.toLowerCase();
    if (!adminEmails.has(email)) {
        const forbidden = new Error('This account is not allowed to view admin analytics.');
        forbidden.status = 403;
        throw forbidden;
    }

    return data.user;
};

export const getAdminReviewSummary = async ({ days = ADMIN_SUMMARY_DEFAULT_DAYS, limit = 20 } = {}) => {
    if (!getNeonPool()) {
        const error = new Error('Neon database is not configured.');
        error.status = 503;
        throw error;
    }

    const windowDays = normalizeAdminDays(days);
    const rowLimit = normalizeAdminLimit(limit);
    const sinceIso = new Date(Date.now() - windowDays * 86400000).toISOString();

    const [scanRows, leadRows, eventRows] = await Promise.all([
        runSelect('scan_history', 'id, disease, confidence, severity, category, location_name, result_json, created_at', sinceIso, rowLimit),
        runSelect('consultation_leads', 'id, scan_id, disease, crop, confidence, phone, recommendation_intent, source, created_at', sinceIso, rowLimit),
        runSelect('product_events', 'id, scan_id, event_type, product_id, product_name, recommendation_intent, recommendation_role, crop, disease, metadata, created_at', sinceIso, rowLimit),
    ]);

    const recentScans = scanRows.map(normalizeRecentScan);
    const uncertainScans = recentScans.filter((scan) => scan.needsReview);
    const recentLeads = leadRows.map(normalizeLead);
    const recentProductEvents = eventRows.map(normalizeProductEvent);
    const productClicks = recentProductEvents.filter((event) => event.eventType === 'product_click');
    const checkoutClicks = recentProductEvents.filter((event) => event.eventType?.includes('checkout'));

    return {
        generatedAt: new Date().toISOString(),
        windowDays,
        counts: {
            recentScans: recentScans.length,
            uncertainScans: uncertainScans.length,
            consultationLeads: recentLeads.length,
            productClicks: productClicks.length,
            checkoutClicks: checkoutClicks.length,
        },
        recentScans,
        uncertainScans,
        recentLeads,
        recentProductEvents,
        commonDiseases: topBy([...recentScans, ...recentLeads], (item) => item.disease),
        topProducts: topBy(productClicks, (item) => item.productName),
    };
};
