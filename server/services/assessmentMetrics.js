import { queryNeon } from '../utils/neonDatabase.js';

// Aggregate, privacy-safe operating figures for a reporting period: how many
// assessments ran, how long they took on the server, and how many farmers
// opted in to photo retention. Durations come from metadata.durationMs and AI
// cost from metadata.aiUsage, so only scans logged after those fields were
// added are counted for timing and cost.

const percentile = (sorted, p) => {
    if (!sorted.length) return null;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
};

export const summarizeAssessmentMetrics = (rows = []) => {
    const fresh = rows.filter((row) => !row.cached);
    const durations = fresh
        .map((row) => Number(row.duration_ms))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b);
    const costs = fresh
        .map((row) => (row.cost_usd == null ? NaN : Number(row.cost_usd)))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b);
    const tokens = fresh
        .map((row) => (row.total_tokens == null ? NaN : Number(row.total_tokens)))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b);
    const withConsentAnswer = rows.filter((row) => row.consent != null);
    const optedIn = withConsentAnswer.filter((row) => row.consent === 'true').length;
    return {
        assessments: rows.length,
        cachedAssessments: rows.length - fresh.length,
        timedAssessments: durations.length,
        durationMs: { p50: percentile(durations, 50), p95: percentile(durations, 95) },
        costedAssessments: costs.length,
        aiCostUsd: {
            total: costs.length ? Math.round(costs.reduce((sum, value) => sum + value, 0) * 1e6) / 1e6 : null,
            p50: percentile(costs, 50),
            p95: percentile(costs, 95),
        },
        aiTotalTokens: { p50: percentile(tokens, 50), p95: percentile(tokens, 95) },
        consentAnswered: withConsentAnswer.length,
        consentOptedIn: optedIn,
        consentOptInRate: withConsentAnswer.length ? optedIn / withConsentAnswer.length : null,
    };
};

export const getAssessmentMetrics = async ({ days = 30, now = new Date() } = {}) => {
    if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error('days must be between 1 and 366');
    const since = new Date(now.getTime() - days * 86400000);
    const { rows } = await queryNeon(
        `select metadata->>'durationMs' as duration_ms,
                metadata->'dataConsent'->>'aiImprovement' as consent,
                metadata->'aiUsage'->>'costUsd' as cost_usd,
                metadata->'aiUsage'->>'totalTokens' as total_tokens,
                coalesce((metadata->>'cached')::boolean, false) as cached
         from public.diagnosis_training_logs
         where created_at >= $1 and created_at < $2`,
        [since.toISOString(), now.toISOString()],
    );
    return { period: { from: since.toISOString(), to: now.toISOString(), days }, ...summarizeAssessmentMetrics(rows) };
};
