import { createHash } from 'node:crypto';
import { SHADOW_THRESHOLDS } from '../utils/decisionProtocol.js';
export { SIGN_QUESTIONS, SHADOW_THRESHOLDS, decisionsRequest, parseDecisions, shadowVeto, routerDecisionsRequest, parseRouterDecisions } from '../utils/decisionProtocol.js';
import { referenceTerms } from './datasetLabels.js';

const hash = value => createHash('sha256').update(value).digest('hex');
export const LUNA_STUDY_VARIANTS = Object.freeze([
    { id: 'gpt-5.4-mini:none', model: 'gpt-5.4-mini', effort: 'none' },
    { id: 'gpt-6-luna:none', model: 'gpt-6-luna', effort: 'none' },
    { id: 'gpt-6-luna:low', model: 'gpt-6-luna', effort: 'low' },
]);
export function planLunaStudy(split, index, { sample = 20 } = {}) {
    if (!split.freezeId || index.freezeId !== split.freezeId || !Number.isInteger(sample) || sample < 1 || sample > 20) throw Error('Invalid study configuration');
    const allowed = new Set(split.development.map(r => r.checksum));
    const reserved = new Set(split.selected.map(r => r.checksum));
    const seen = new Set(), groups = new Map();
    for (const item of [...index.images].sort((a,b) => hash(a.checksum).localeCompare(hash(b.checksum)))) {
        if (!allowed.has(item.checksum) || reserved.has(item.checksum) || seen.has(item.checksum)) throw Error('Duplicate or non-development study image');
        seen.add(item.checksum);
        if (item.excluded) continue;
        const stratum = `${item.source}|${item.crop}|${item.originalLabel}`;
        if (!groups.has(stratum)) groups.set(stratum, []);
        groups.get(stratum).push(item);
    }
    const keys = [...groups.keys()].sort((a,b) => hash(a).localeCompare(hash(b)));
    const cases = [];
    while (cases.length < sample && keys.some(k => groups.get(k).length)) {
        for (const key of keys) {
            const item = groups.get(key).shift();
            if (item && cases.length < sample) cases.push(item);
        }
    }
    if (cases.length !== sample) throw Error('Insufficient development images');
    const identity = { freezeId: split.freezeId, variants: LUNA_STUDY_VARIANTS, checksums: cases.map(r => r.checksum),
        thresholds: SHADOW_THRESHOLDS, decisions: 'image triage, observable signs and per-candidate visual support; shadow only', maxCompletionTokens: 6000 };
    return { ...identity, planId: hash(JSON.stringify(identity)), cases };
}

export function diagnosisRequest(variant, messages) {
    if (!LUNA_STUDY_VARIANTS.some(v => v.id === variant.id && v.model === variant.model && v.effort === variant.effort)) throw Error('Unknown study variant');
    return { model: variant.model, messages, reasoning_effort: variant.effort, max_completion_tokens: 6000,
        response_format: { type: 'json_object' } };
}

const RATES = Object.freeze({
    'gpt-5.4-mini': { input: 0.75, cached: 0.075, write: 0.75, output: 4.5 },
    'gpt-6-luna': { input: 0.1, cached: 0.01, write: 0.125, output: 0.5 },
});
/** Standard global short-context API rate estimate, not an invoice or provider-reported charge. */
export function estimateStudyCost(model, endpoint, usage) {
    const rates = RATES[model];
    if (!rates || !['chat/completions','decisions'].includes(endpoint)) throw Error('Unsupported study pricing');
    const input = endpoint === 'decisions' ? usage?.input_tokens : usage?.prompt_tokens;
    const output = endpoint === 'decisions' ? usage?.output_tokens : usage?.completion_tokens;
    const details = endpoint === 'decisions' ? usage?.input_tokens_details : usage?.prompt_tokens_details;
    const cached = details?.cached_tokens ?? 0, writes = details?.cache_write_tokens ?? 0;
    if (![input,output,cached,writes].every(n => Number.isSafeInteger(n) && n >= 0) || cached + writes > input || input > 272000) throw Error('Unusable or long-context usage: stop budgeted study');
    const estimate = ((input-cached-writes)*rates.input+cached*rates.cached+writes*rates.write+(endpoint === 'decisions' ? 0 : output*rates.output))/1e6;
    const upperBound = (input*Math.max(rates.input,rates.write)+(endpoint === 'decisions' ? 0 : output*rates.output))/1e6;
    return { estimatedUsd: estimate, conservativeUsd: upperBound, basis: 'API token usage × published Standard short-context rates; not invoiced cost' };
}

export function summarizeDecisionStudy(rows) {
    const out = { attempted: rows.length, completed: 0, failed: 0, healthyReferences: 0, diseasedReferences: 0,
        healthyCorrect: 0, abnormalCorrect: 0, diseasedCalledHealthy: 0, review: 0, estimatedUsd: 0, costUsd: 0, durationMs: 0, rows: [] };
    for (const row of rows) {
        if (!row.completed) { out.failed++; continue; }
        out.completed++;
        const healthy = referenceTerms(row.originalLabel).healthy;
        out[healthy ? 'healthyReferences' : 'diseasedReferences']++;
        const triage = row.answers.health_triage;
        const decisive = triage?.type === 'choice' && triage.confidence >= SHADOW_THRESHOLDS.triageConfidence;
        out.healthyCorrect += Number(healthy && decisive && triage.choice === 'healthy');
        out.abnormalCorrect += Number(!healthy && decisive && triage.choice === 'abnormal');
        out.diseasedCalledHealthy += Number(!healthy && decisive && triage.choice === 'healthy');
        out.review += Number(!decisive || triage.choice === 'unclear');
        out.estimatedUsd += row.estimatedUsd || 0;
        out.costUsd += row.costUsd || 0;
        out.durationMs += row.durationMs;
        out.rows.push({ checksum: row.checksum, crop: row.crop, originalLabel: row.originalLabel, triage: triage?.choice || 'refusal', confidence: triage?.confidence ?? null });
    }
    return { ...out, meanDurationMs: out.completed ? out.durationMs/out.completed : null,
        note: 'Health triage only, not disease identification. Thresholds are predeclared exploratory values, not calibrated clinical confidence.' };
}

