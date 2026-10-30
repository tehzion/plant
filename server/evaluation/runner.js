import { createHash } from 'node:crypto';
import { compareCase } from './metrics.js';
import { assessScanDecision } from '../../shared/scanResultPolicy.js';

/** Runs sequentially against an injected assessment adapter and immutable result store.
 * The caller must use an isolated assessment deployment: /api/analyze writes audit logs.
 */
export async function runEvaluation({ cases, assess, store, workflowVersion, aliases = {}, maxImages = 100, signal, estimatePerImage = null, costApproved = false }) {
    if (!Array.isArray(cases) || !Number.isInteger(maxImages) || maxImages < 1 || maxImages > 100 || cases.length > maxImages) throw new Error('Invalid batch size');
    if (costApproved !== true) throw new Error('Explicit cost approval required before running assessments');
    if (!workflowVersion || typeof assess !== 'function' || typeof store?.has !== 'function' || typeof store?.claim !== 'function' || typeof store?.save !== 'function') throw new Error('Version, adapter and result store required');
    if (estimatePerImage !== null && (!Number.isFinite(estimatePerImage) || estimatePerImage < 0)) throw new Error('Invalid estimate');
    const seen = new Set();
    for (const item of cases) {
        if (!item.imageId || !item.checksum || seen.has(item.imageId)) throw new Error('Invalid or duplicate image ID');
        if (item.rightsCleared !== true || item.imageVerified !== true) throw new Error('Each image requires documented rights clearance and image verification');
        seen.add(item.imageId);
    }
    const summary = { requested: cases.length, estimatedCost: estimatePerImage === null ? null : cases.length * estimatePerImage, processed: 0, skipped: 0, cancelled: false };
    for (const item of cases) {
        if (signal?.aborted) { summary.cancelled = true; break; }
        const key = createHash('sha256').update(JSON.stringify([item.imageId, item.checksum, workflowVersion])).digest('hex');
        if (await store.has(key) || !await store.claim(key)) { summary.skipped++; continue; }
        let started = null;
        let result;
        try {
            const image = await item.loadImage();
            if (!Buffer.isBuffer(image) || image.length === 0 || image.length > 5 * 1024 * 1024 || createHash('sha256').update(image).digest('hex') !== item.checksum.toLowerCase()) throw new Error('Image checksum or size invalid');
            const jpeg = image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
            const png = image.length >= 8 && image.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
            if (!jpeg && !png) throw new Error('Only JPEG and PNG images are supported');
            started = Date.now();
            const response = await assess({ image, mime: jpeg ? 'image/jpeg' : 'image/png', item, signal });
            if (!response || typeof response !== 'object' || !response.disease || !response.plantType) throw new Error('Assessment response is incomplete');
            const decision = assessScanDecision(response);
            const uncertain = Boolean(decision.needsReview || decision.requiresRetake || response.needsMoreEvidence || response.abstainReason);
            result = { completed: true, crop: response.plantType || null, label: response.disease || null, alternatives: response.differentialDiagnoses || [], explanation: response.additionalNotes || null, confidence: response.diagnosisConfidence ?? response.confidence ?? null, healthStatus: response.healthStatus || null, uncertain, durationMs: Date.now() - started, provider: response.analysisMetadata?.provider || null, model: response.analysisMetadata?.model || null, policyVersion: response.analysisMetadata?.policyVersion ?? null, usage: response.usage ?? null, cost: null, cached: response.cached === true, raw: Object.fromEntries(Object.entries(response).filter(([key]) => key !== 'feedbackToken')) };
        } catch (error) {
            if (signal?.aborted) { summary.cancelled = true; break; }
            result = { completed: false, error: String(error?.message || 'Assessment failed').slice(0, 500), durationMs: started === null ? null : Date.now() - started };
        }
        const reference = { crop: item.crop, label: item.normalizedLabel, supported: item.supported === true };
        await store.save(key, { key, imageId: item.imageId, source: item.source, originalLabel: item.originalLabel, provenance: { originalId: item.originalId, category: item.category, license: item.license, sourceReference: item.sourceReference, checksum: item.checksum, datasetVersion: item.datasetVersion, samplingSeed: item.samplingSeed, rightsCleared: item.rightsCleared, imageVerified: item.imageVerified }, reference, prediction: result, match: compareCase(reference, result, aliases), workflowVersion, timestamp: new Date().toISOString() });
        summary.processed++;
    }
    return summary;
}

/** Same HTTP endpoint as the farmer UI; intentionally limited to loopback.
 * A separately configured, isolated local server is mandatory; it must not point at production data.
 */
export function createLocalAssessmentAdapter({ baseUrl, category = 'Vegetables', language = 'en', location = 'Malaysia', fetchImpl = fetch }) {
    const url = new URL(baseUrl);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password) throw new Error('Only a local isolated HTTP server is allowed');
    return async ({ image, mime, signal }) => {
        const response = await fetchImpl(new URL('/api/analyze', url), { method: 'POST', headers: { 'Content-Type':'application/json' }, signal, body: JSON.stringify({ treeImage: `data:${mime};base64,${image.toString('base64')}`, category, language, location, dataConsent: { aiImprovement: false } }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || response.status === 202) throw new Error(`Assessment did not complete (HTTP ${response.status})`);
        return result;
    };
}
