import { routerDecisionsRequest, parseRouterDecisions, shadowVeto, SHADOW_THRESHOLDS } from '../utils/decisionProtocol.js';
import { assessScanDecision } from '../../shared/scanResultPolicy.js';
import { recordAiUsage } from '../utils/aiUsage.js';

const bounded = (value, fallback, max) => {
    const n = value == null || value === '' ? fallback : Number(value);
    return Number.isFinite(n) && n > 0 && n <= max ? n : null;
};

/** Optional, bounded trial. The result belongs in server audit metadata only. */
export function createDecisionShadowService({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
    const state = { requests: 0, spentUsd: 0, reservedUsd: 0, stopped: false };
    const reserveUsd = 0.01;
    return async function checkDecisionShadow({ prediction, treeImage, leafImage, crop, dataConsent, signal } = {}) {
        const skip = reason => ({ status: 'skipped', reason });
        if (env.DECISIONS_SHADOW_ENABLED !== 'true') return skip('disabled');
        if (dataConsent?.aiImprovement !== true) return skip('improvement_consent_required');
        if (env.AI_PROVIDER !== 'openrouter' || !env.OPENROUTER_API_KEY) return skip('openrouter_unavailable');
        if (!/^(?:openai\/)?gpt-5\.4-mini(?:-|$)/.test(prediction?.analysisMetadata?.model || '')) return skip('unsupported_primary_model');
        if (!prediction?.disease || !prediction?.plantType || signal?.aborted) return skip('incomplete_or_cancelled');
        const maxRequests = bounded(env.DECISIONS_SHADOW_MAX_REQUESTS, 20, 100);
        const maxUsd = bounded(env.DECISIONS_SHADOW_MAX_COST_USD, 0.05, 1);
        const timeoutMs = bounded(env.DECISIONS_SHADOW_TIMEOUT_MS, 3000, 5000);
        if (!Number.isInteger(maxRequests) || !maxUsd || !timeoutMs) return skip('invalid_trial_limits');
        if (state.stopped || state.requests >= maxRequests || state.spentUsd + state.reservedUsd + reserveUsd > maxUsd) return skip('trial_limit');
        const images = [...new Set([treeImage, leafImage].filter(Boolean))];
        if (!images.length || images.some(image => typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(image)
            || image.length > 7*1024*1024)) return skip('invalid_image');
        const body = routerDecisionsRequest(images[0], String(crop || prediction.plantType).slice(0,100), [{ disease: String(prediction.disease).slice(0,200) }]);
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
            const shadow = shadowVeto(prediction, answers, 'support_0');
            const baseline = assessScanDecision(prediction);
            const hypothetical = assessScanDecision(shadow.prediction);
            return { status: 'checked', mode: 'shadow', protocolVersion: 1, thresholds: SHADOW_THRESHOLDS,
                model: 'openai/gpt-6-luna-decisions', durationMs: now()-started, costUsd: chargedUsd,
                baselineState: baseline.resultState, shadowState: hypothetical.resultState,
                wouldRequestReview: shadow.reasons.length > 0, wouldAddReview: !baseline.needsReview && hypothetical.needsReview, reasons: shadow.reasons, answers };
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
