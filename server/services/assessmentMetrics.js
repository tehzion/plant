import { queryNeon } from '../utils/neonDatabase.js';

// Aggregate, privacy-safe operating figures for a reporting period: how many
// assessments ran, how long they took on the server, and how many farmers
// opted in to photo retention. Durations come from metadata.durationMs, so
// only scans logged after that field was added are counted for timing.

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
    const withConsentAnswer = rows.filter((row) => row.consent != null);
    const optedIn = withConsentAnswer.filter((row) => row.consent === 'true').length;
    return {
        assessments: rows.length,
        cachedAssessments: rows.length - fresh.length,
        timedAssessments: durations.length,
        durationMs: { p50: percentile(durations, 50), p95: percentile(durations, 95) },
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
                coalesce((metadata->>'cached')::boolean, false) as cached
         from public.diagnosis_training_logs
         where created_at >= $1 and created_at < $2`,
        [since.toISOString(), now.toISOString()],
    );
    return { period: { from: since.toISOString(), to: now.toISOString(), days }, ...summarizeAssessmentMetrics(rows) };
};
