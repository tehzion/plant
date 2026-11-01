import { routerDecisionsRequest, parseRouterDecisions, shadowVeto, enforcementVeto, SHADOW_THRESHOLDS } from '../utils/decisionProtocol.js';
import { assessScanDecision } from '../../shared/scanResultPolicy.js';
import { recordAiUsage } from '../utils/aiUsage.js';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';

const bounded = (value, fallback, max) => {
    const n = value == null || value === '' ? fallback : Number(value);
    return Number.isFinite(n) && n > 0 && n <= max ? n : null;
};

/**
 * DECISIONS_CHECK_MODE picks how the second check is used:
 *  - off (default): never called.
 *  - shadow: research only. Needs the farmer's improvement consent; the verdict goes to the audit log.
 *  - enforce: part of the assessment. A confident contrary verdict sends the farmer's result to
 *    review (see enforcementVeto); it can never unlock treatment or a healthy result. If the check
 *    fails, times out or hits its limits, the original result stands.
 * DECISIONS_SHADOW_ENABLED=true is still read as shadow mode.
 */
export const resolveDecisionCheckMode = (env = process.env) => {
    const mode = String(env.DECISIONS_CHECK_MODE || '').trim().toLowerCase();
    if (['off', 'shadow', 'enforce'].includes(mode)) return mode;
    return env.DECISIONS_SHADOW_ENABLED === 'true' ? 'shadow' : 'off';
};

// Per-process ceilings: the research trial stays small; enforce mode serves every scan.
const LIMITS = {
    shadow: { requests: [20, 100], usd: [0.05, 1] },
    enforce: { requests: [2000, 100000], usd: [2, 100] },
};

/** Bounded second check of the primary diagnosis. */
export function createDecisionShadowService({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
    const state = { requests: 0, spentUsd: 0, reservedUsd: 0, stopped: false };
    const reserveUsd = 0.01;
    return async function checkDecisionShadow({ prediction, treeImage, leafImage, crop, dataConsent, signal } = {}) {
        const skip = reason => ({ status: 'skipped', reason });
        const mode = resolveDecisionCheckMode(env);
        if (mode === 'off') return skip('disabled');
        if (mode === 'shadow' && dataConsent?.aiImprovement !== true) return skip('improvement_consent_required');
        if (env.AI_PROVIDER !== 'openrouter' || !env.OPENROUTER_API_KEY) return skip('openrouter_unavailable');
        if (!/^(?:openai\/)?gpt-5\.4-mini(?:-|$)/.test(prediction?.analysisMetadata?.model || '')) return skip('unsupported_primary_model');
        if (!prediction?.disease || !prediction?.plantType || signal?.aborted) return skip('incomplete_or_cancelled');
        const maxRequests = bounded(env.DECISIONS_SHADOW_MAX_REQUESTS, ...LIMITS[mode].requests);
        const maxUsd = bounded(env.DECISIONS_SHADOW_MAX_COST_USD, ...LIMITS[mode].usd);
        const timeoutMs = bounded(env.DECISIONS_SHADOW_TIMEOUT_MS, 3000, 5000);
        if (!Number.isInteger(maxRequests) || !maxUsd || !timeoutMs) return skip('invalid_trial_limits');
        if (state.stopped || state.requests >= maxRequests || state.spentUsd + state.reservedUsd + reserveUsd > maxUsd) return skip('trial_limit');
        const images = [...new Set([treeImage, leafImage].filter(Boolean))];
        if (!images.length || images.some(image => typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(image)
            || image.length > 7*1024*1024)) return skip('invalid_image');
        // The primary diagnosis is support_0; the look-alikes follow, so the check can say when one
        // of them fits the photo better.
        const alternatives = (Array.isArray(prediction.differentialDiagnoses) ? prediction.differentialDiagnoses : [])
            .map(item => String(item?.name || '').trim()).filter(Boolean).slice(0, 3);
        const body = routerDecisionsRequest(images[0], String(crop || prediction.plantType).slice(0,100),
            [prediction.disease, ...alternatives].map(disease => ({ disease: String(disease).slice(0,200) })));
        for (const image of images.slice(1)) body.state.push({ type: 'image_url', image_url: { url: image, detail: 'auto' } });
        state.requests++;
        state.reservedUsd += reserveUsd;
        const controller = new AbortController();
        const abort = () => controller.abort();
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
        const timer = setTimeout(abort, timeoutMs);
        const started = now();
        let chargedUsd = null;
        try {
            const response = await fetchImpl('https://openrouter.ai/api/alpha/decisions', {
                method: 'POST', headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body), signal: controller.signal,
            });
            const data = await response.json();
            const usage = data.usage;
            if (typeof usage?.cost === 'number' && Number.isFinite(usage.cost) && usage.cost >= 0) chargedUsd = usage.cost;
            recordAiUsage({ prompt_tokens: usage?.input_tokens || 0, completion_tokens: usage?.output_tokens || 0,
                total_tokens: usage?.total_tokens ?? (usage?.input_tokens || 0)+(usage?.output_tokens || 0),
                ...(chargedUsd === null ? {} : { cost: chargedUsd }) });
            if (!response.ok) return { status: 'unavailable', reason: `http_${response.status}`, durationMs: now()-started, costUsd: chargedUsd };
            if (chargedUsd === null) return { status: 'unavailable', reason: 'missing_cost', durationMs: now()-started };
            const answers = parseRouterDecisions(data, Object.keys(body.questions));
            const alternativeNames = alternatives.map((name, i) => [`support_${i + 1}`, name]);
            const shadow = mode === 'enforce' ? enforcementVeto(prediction, answers, 'support_0', alternativeNames)
                : shadowVeto(prediction, answers, 'support_0');
            const baseline = assessScanDecision(prediction);
            const hypothetical = assessScanDecision(shadow.prediction);
            const addsReview = !baseline.needsReview && hypothetical.needsReview;
            return { status: 'checked', mode, protocolVersion: 2, thresholds: SHADOW_THRESHOLDS,
                model: 'openai/gpt-6-luna-decisions', durationMs: now()-started, costUsd: chargedUsd,
                baselineState: baseline.resultState, shadowState: hypothetical.resultState,
                wouldRequestReview: shadow.reasons.length > 0, wouldAddReview: addsReview, reasons: shadow.reasons,
                supportedAlternatives: shadow.supportedAlternatives || [], applied: mode === 'enforce' && addsReview, answers };
        } catch {
            return { status: 'unavailable', reason: controller.signal.aborted ? 'cancelled_or_timeout' : 'invalid_or_failed_response', durationMs: now()-started, costUsd: chargedUsd };
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            state.reservedUsd = Math.max(0, state.reservedUsd - reserveUsd);
            state.spentUsd += chargedUsd ?? reserveUsd;
            if (chargedUsd === null || state.spentUsd > maxUsd) state.stopped = true;
        }
    };
}
export const checkDecisionShadow = createDecisionShadowService();

const SECOND_CHECK_COPY = {
    en: { unsupported: 'A second check of the photo could not confirm this. Ask an agricultural expert before buying or spraying any chemical.',
        alternative: (names) => `A second check found the photo also fits ${names}. Ask an agricultural expert before buying or spraying any chemical.`,
        healthy: 'A second check saw possible signs of a problem. Look closely at the leaves, including the undersides, and send a close-up.' },
    ms: { unsupported: 'Semakan kedua foto tidak dapat mengesahkan perkara ini. Tanya pakar pertanian sebelum membeli atau menyembur sebarang racun.',
        alternative: (names) => `Semakan kedua mendapati foto juga sepadan dengan ${names}. Tanya pakar pertanian sebelum membeli atau menyembur sebarang racun.`,
        healthy: 'Semakan kedua nampak kemungkinan tanda masalah. Periksa daun dengan teliti, termasuk bahagian bawah, dan hantar foto dekat.' },
    zh: { unsupported: '对照片的第二次检查无法确认此结果。购买或喷洒任何农药前，请先咨询农业专家。',
        alternative: (names) => `第二次检查发现照片也符合${names}。购买或喷洒任何农药前，请先咨询农业专家。`,
        healthy: '第二次检查发现可能有问题的迹象。请仔细检查叶片（包括叶背），并发送近照。' },
};

/** Applies an enforce-mode verdict to the farmer's result: review, no treatment, and why. */
export function applyDecisionCheck(result, check, language = 'en') {
    if (!check?.applied) return result;
    const copy = SECOND_CHECK_COPY[language] || SECOND_CHECK_COPY.en;
    const quality = getScanQualityCopy(language);
    const wasHealthy = check.baselineState === 'healthy';
    Object.assign(result, { needsReview: true, expertReviewRequired: true, treatments: [], prevention: [],
        immediateActions: [quality.nextScout] });
    if (wasHealthy) Object.assign(result, { disease: quality.inconclusive, healthStatus: 'unknown' });
    result.abstainReason = wasHealthy ? copy.healthy
        : check.supportedAlternatives?.length ? copy.alternative(check.supportedAlternatives.join(', ')) : copy.unsupported;
    const decision = assessScanDecision(result);
    result.resultState = decision.resultState;
    result.treatmentEligible = decision.treatmentEligible;
    if (result.structuredAssessment?.assessment) result.structuredAssessment.assessment.needs_expert_review = true;
    if (result.structuredAssessment?.recommendations) Object.assign(result.structuredAssessment.recommendations,
        { product_matching_eligible: false, chemical_treatment_withheld: true });
    result.secondCheck = { applied: true, reasons: check.reasons || [], supportedAlternatives: check.supportedAlternatives || [] };
    if (result.decisionSnapshot) result.decisionSnapshot = { ...result.decisionSnapshot, resultState: decision.resultState,
        treatmentEligible: decision.treatmentEligible, needsReview: decision.needsReview, secondCheck: true };
    return result;
}
