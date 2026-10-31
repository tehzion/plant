import { queryNeon } from '../utils/neonDatabase.js';
import { getServiceClient, verifyAuthenticatedUser } from '../utils/supabaseAuth.js';
import { assessScanDecision } from '../../shared/scanResultPolicy.js';
import { getAdminEmails } from './adminAnalyticsService.js';

// Lightweight expert review: AI assessment -> expert review -> correction
// record. The original AI record in diagnosis_training_logs is never changed;
// each review is a new attributed row in diagnosis_expert_reviews, kept apart
// from farmer feedback in diagnosis_feedback. Nothing here retrains a model.

export const REVIEW_VERDICTS = Object.freeze(['confirmed', 'corrected', 'uncertain']);
export const PRODUCT_VERDICTS = Object.freeze(['suitable', 'unsuitable', 'needs_more_information']);
const SCAN_ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const text = (value, max) => (value == null ? '' : String(value).trim().slice(0, max));
const emailSet = (value = '') => new Set(String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));

export const getReviewerEmails = () => new Set([...getAdminEmails(), ...emailSet(process.env.EXPERT_REVIEWER_EMAILS)]);

/** Only signed-in accounts on the reviewer or admin allow-list may review. */
export const verifyReviewerRequest = async (req) => {
    const reviewers = getReviewerEmails();
    if (!reviewers.size) throw fail('Expert review is not configured.', 503);
    const user = await verifyAuthenticatedUser(req);
    const email = String(user.email || '').toLowerCase();
    if (!email || !reviewers.has(email)) throw fail('This account is not an approved expert reviewer.', 403);
    return { id: user.id, email };
};

const summarizeAssessment = (result = {}) => {
    const structured = result.structuredAssessment?.assessment || {};
    const decision = assessScanDecision(result);
    return {
        disease: result.disease || null,
        plantType: result.plantType || null,
        confidence: result.confidence ?? null,
        confidenceLevel: structured.confidence_level || result.confidenceLevel || null,
        primaryCondition: structured.primary_condition || null,
        alternatives: (structured.alternative_conditions || result.differentialDiagnoses || [])
            .map((item) => ({ name: item.name, confidence_level: item.confidence_level || item.confidenceLevel || null })),
        needsReview: decision.needsReview,
        treatmentEligible: decision.treatmentEligible,
        productSearchTags: Array.isArray(result.productSearchTags) ? result.productSearchTags.slice(0, 5) : [],
        model: result.analysisMetadata?.model || null,
        policyVersion: result.analysisMetadata?.policyVersion || null,
    };
};

const signedImageUrls = async (images = {}) => {
    const client = getServiceClient();
    if (!client?.storage) return {};
    const entries = await Promise.all(['tree', 'leaf'].map(async (key) => {
        const path = images?.[key];
        if (!path || typeof path !== 'string' || path.includes('..')) return [key, null];
        const { data } = await client.storage.from('scan-images').createSignedUrl(path, 900).catch(() => ({ data: null }));
        return [key, data?.signedUrl || null];
    }));
    return Object.fromEntries(entries);
};

export const listReviewQueue = async ({ status = 'needs_review', days = 30, limit = 30 } = {}) => {
    const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const rowLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();
    const { rows } = await queryNeon(
        `select l.id, l.created_at, l.category, l.raw_result,
                r.verdict as latest_verdict, r.created_at as reviewed_at, r.reviewer_email,
                (select count(*)::int from public.diagnosis_feedback f where f.scan_id = l.id) as farmer_feedback_count
         from public.diagnosis_training_logs l
         left join lateral (
             select verdict, created_at, reviewer_email from public.diagnosis_expert_reviews r
             where r.scan_id = l.id order by created_at desc limit 1
         ) r on true
         where l.created_at >= $1
         order by (r.verdict is null) desc, l.created_at desc
         limit $2`,
        [since, rowLimit * 3],
    );
    const cases = (rows || []).map((row) => ({
        scanId: row.id,
        createdAt: row.created_at,
        category: row.category,
        assessment: summarizeAssessment(row.raw_result || {}),
        latestVerdict: row.latest_verdict || null,
        reviewedAt: row.reviewed_at || null,
        reviewerEmail: row.reviewer_email || null,
        farmerFeedbackCount: Number(row.farmer_feedback_count || 0),
    }));
    const filtered = status === 'reviewed' ? cases.filter((item) => item.latestVerdict)
        : status === 'all' ? cases
            : cases.filter((item) => !item.latestVerdict && (item.assessment.needsReview || item.farmerFeedbackCount > 0));
    return { cases: filtered.slice(0, rowLimit), windowDays };
};

const SHOWN_ROLES = ['treatment', 'fertilizer', 'supplement', 'discovery'];

const shownProductRows = (snapshot) => (snapshot && typeof snapshot === 'object'
    ? SHOWN_ROLES.flatMap((role) => (Array.isArray(snapshot[role]) ? snapshot[role] : [])
        .map((product) => ({ productId: product.id ?? null, productName: product.name || '', role, shown: true })))
    : []);

export const getReviewCase = async (scanId) => {
    if (!SCAN_ID_PATTERN.test(String(scanId || ''))) throw fail('Invalid scan ID.');
    const { rows } = await queryNeon(
        "select id, created_at, category, images, raw_result, metadata->'shownRecommendations' as shown_recommendations from public.diagnosis_training_logs where id = $1",
        [scanId],
    );
    const log = rows?.[0];
    if (!log) throw fail('Assessment not found.', 404);
    const [reviews, feedback, productEvents, imageUrls] = await Promise.all([
        queryNeon('select id, reviewer_email, verdict, corrected_crop, corrected_diagnosis, corrected_category, notes, flagged_uncertain, product_reviews, created_at from public.diagnosis_expert_reviews where scan_id = $1 order by created_at desc', [scanId]),
        queryNeon('select created_at, feedback from public.diagnosis_feedback where scan_id = $1 order by created_at desc limit 20', [scanId]),
        queryNeon('select product_id, product_name, recommendation_role, event_type, created_at from public.product_events where scan_id = $1 order by created_at desc limit 30', [scanId]),
        signedImageUrls(log.images),
    ]);
    const result = log.raw_result || {};
    return {
        scanId: log.id,
        createdAt: log.created_at,
        category: log.category,
        imageUrls,
        // The original AI output, shown read-only.
        aiAssessment: {
            ...summarizeAssessment(result),
            structuredAssessment: result.structuredAssessment || null,
            symptoms: Array.isArray(result.symptoms) ? result.symptoms : [],
            additionalNotes: result.additionalNotes || '',
        },
        expertReviews: reviews.rows || [],
        // Farmer feedback stays labelled as such and never mixes with reviews.
        farmerFeedback: (feedback.rows || []).map((row) => {
            const { attribution = null, wasCorrect = null, correctCrop = null, correctDisease = null, issueType = null, note = null } = row.feedback || {};
            return { createdAt: row.created_at, source: 'farmer', verified: Boolean(attribution), wasCorrect, correctCrop, correctDisease, issueType, note };
        }),
        // The product list the farmer was shown, when it was recorded.
        shownRecommendations: log.shown_recommendations || null,
        // Everything shown to the farmer first, then anything else they clicked.
        products: [
            ...shownProductRows(log.shown_recommendations),
            ...(productEvents.rows || []).map((row) => ({ productId: row.product_id, productName: row.product_name, role: row.recommendation_role })),
        ].reduce((unique, product) => {
            const key = String(product.productId ?? product.productName);
            if (!unique.seen.has(key)) { unique.seen.add(key); unique.list.push(product); }
            return unique;
        }, { seen: new Set(), list: [] }).list,
    };
};

export const validateReviewInput = (body = {}) => {
    const verdict = text(body.verdict, 20).toLowerCase();
    if (!REVIEW_VERDICTS.includes(verdict)) throw fail('Choose confirmed, corrected or uncertain.');
    const correctedDiagnosis = text(body.correctedDiagnosis, 200);
    const correctedCrop = text(body.correctedCrop, 120);
    if (verdict === 'corrected' && !correctedDiagnosis && !correctedCrop) throw fail('A correction needs the correct diagnosis or crop.');
    if (body.productReviews != null && (!Array.isArray(body.productReviews) || body.productReviews.length > 20)) {
        throw fail('Product reviews must be a list of at most 20 items.');
    }
    const productReviews = (body.productReviews || []).map((item) => {
        const productVerdict = text(item?.verdict, 40).toLowerCase();
        if (!PRODUCT_VERDICTS.includes(productVerdict)) throw fail('Each product needs suitable, unsuitable or needs_more_information.');
        const productName = text(item?.productName, 200);
        const productId = item?.productId == null ? null : text(item.productId, 40);
        if (!productName && !productId) throw fail('Each product review needs a product name or ID.');
        return { productId, productName, verdict: productVerdict, note: text(item?.note, 500) };
    });
    return {
        verdict,
        correctedDiagnosis: correctedDiagnosis || null,
        correctedCrop: correctedCrop || null,
        correctedCategory: text(body.correctedCategory, 60) || null,
        notes: text(body.notes, 2000),
        flaggedUncertain: verdict === 'uncertain' || body.flaggedUncertain === true,
        productReviews,
    };
};

export const submitExpertReview = async (reviewer, scanId, body) => {
    if (!reviewer?.id || !reviewer?.email) throw fail('Reviewer identity is required.', 401);
    if (!SCAN_ID_PATTERN.test(String(scanId || ''))) throw fail('Invalid scan ID.');
    const input = validateReviewInput(body);
    const { rows } = await queryNeon('select raw_result from public.diagnosis_training_logs where id = $1', [scanId]);
    if (!rows?.length) throw fail('Assessment not found.', 404);
    const inserted = await queryNeon(
        `insert into public.diagnosis_expert_reviews
            (scan_id, reviewer_user_id, reviewer_email, verdict, corrected_crop, corrected_diagnosis, corrected_category,
             notes, flagged_uncertain, product_reviews, ai_snapshot)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id, scan_id, reviewer_email, verdict, corrected_crop, corrected_diagnosis, corrected_category, notes, flagged_uncertain, product_reviews, created_at`,
        [scanId, reviewer.id, reviewer.email, input.verdict, input.correctedCrop, input.correctedDiagnosis, input.correctedCategory,
            input.notes, input.flaggedUncertain, JSON.stringify(input.productReviews), summarizeAssessment(rows[0].raw_result || {})],
    );
    return inserted.rows[0];
};

/**
 * Farmer-facing summary of the latest expert review. Reviewer identity and
 * internal notes are not exposed; only the verdict and any correction.
 */
export const getFarmerReviewSummary = async (scanId) => {
    if (!SCAN_ID_PATTERN.test(String(scanId || ''))) throw fail('Invalid scan ID.');
    const { rows } = await queryNeon(
        `select verdict, corrected_diagnosis, corrected_crop, created_at
         from public.diagnosis_expert_reviews where scan_id = $1 order by created_at desc limit 1`,
        [scanId],
    );
    const row = rows?.[0];
    if (!row) return null;
    return {
        verdict: row.verdict,
        correctedDiagnosis: row.corrected_diagnosis || null,
        correctedCrop: row.corrected_crop || null,
        reviewedAt: row.created_at,
    };
};
