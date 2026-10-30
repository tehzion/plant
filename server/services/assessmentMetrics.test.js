// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ queryNeon: vi.fn() }));
vi.mock('../utils/neonDatabase.js', () => ({ queryNeon: mocks.queryNeon }));
import { getAssessmentMetrics, summarizeAssessmentMetrics } from './assessmentMetrics.js';

describe('assessment metrics', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reports median and 95th percentile time for fresh (uncached) assessments only', () => {
        const rows = Array.from({ length: 20 }, (_, i) => ({ duration_ms: String((i + 1) * 1000), consent: null, cached: false }));
        rows.push({ duration_ms: '5', consent: null, cached: true });
        const summary = summarizeAssessmentMetrics(rows);
        expect(summary).toMatchObject({ assessments: 21, cachedAssessments: 1, timedAssessments: 20 });
        expect(summary.durationMs).toEqual({ p50: 10000, p95: 19000 });
    });

    it('computes the opt-in rate only over scans that recorded an answer', () => {
        const summary = summarizeAssessmentMetrics([
            { consent: 'true' }, { consent: 'false' }, { consent: 'false' }, { consent: null }, { duration_ms: 'x', consent: 'true' },
        ]);
        expect(summary).toMatchObject({ consentAnswered: 4, consentOptedIn: 2, consentOptInRate: 0.5, timedAssessments: 0 });
        expect(summary.durationMs).toEqual({ p50: null, p95: null });
    });

    it('queries a bounded period and rejects unreasonable ranges', async () => {
        mocks.queryNeon.mockResolvedValue({ rows: [] });
        const now = new Date('2026-11-01T00:00:00Z');
        const result = await getAssessmentMetrics({ days: 7, now });
        expect(mocks.queryNeon).toHaveBeenCalledWith(expect.stringContaining('diagnosis_training_logs'), ['2026-10-25T00:00:00.000Z', now.toISOString()]);
        expect(result.period.days).toBe(7);
        await expect(getAssessmentMetrics({ days: 0 })).rejects.toThrow('days');
    });
});
