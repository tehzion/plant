// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryNeon: vi.fn() }));
vi.mock('../utils/neonDatabase.js', () => ({ queryNeon: mocks.queryNeon }));
import { getReportSummary } from './reportService.js';

describe('report service', () => {
    beforeEach(() => vi.clearAllMocks());
    it('aggregates owner-scoped harvest, expenses, profit and scan states', async () => {
        mocks.queryNeon.mockImplementation((sql) => ({ rows: sql.includes('daily_notes') ? [
            { activity_type: 'harvest', kg_harvested: 10, price_per_kg: 4, expense_amount: 3 },
            { activity_type: 'spray', expense_amount: 2 },
        ] : [{ created_at: '2026-01-01T00:00:00Z', result_json: { resultState: 'healthy' } }, { created_at: '2026-01-02T00:00:00Z', result_json: { needsMoreEvidence: true } }] }));
        const result = await getReportSummary('user-a', { from: '2026-01-01', to: '2026-02-01' });
        expect(result.totals).toEqual({ harvestKg: '10.00', revenue: '40.00', expenses: '5.00', profit: '35.00' });
        expect(result.scanStates).toEqual({ healthy: 1, diseased: 0, uncertain: 1 });
        expect(mocks.queryNeon).toHaveBeenCalledTimes(2);
    });

    it('bounds large reports and marks summaries that are incomplete', async () => {
        vi.stubEnv('REPORT_MAX_ROWS', '100');
        mocks.queryNeon.mockResolvedValue({ rows: Array.from({ length: 100 }, () => ({})) });

        const result = await getReportSummary('user-a', { from: '2026-01-01', to: '2026-02-01' });

        expect(result.truncated).toBe(true);
        vi.unstubAllEnvs();
    });
});
