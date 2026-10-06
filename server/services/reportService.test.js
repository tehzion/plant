// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ client: { from: vi.fn() } }));
vi.mock('../utils/supabaseAuth.js', () => ({ getServiceClient: () => mocks.client, getAuthenticatedClient: () => null }));
import { getReportSummary } from './reportService.js';

const query = (rows) => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: rows, error: null }), contains: vi.fn().mockReturnThis() });

describe('report service', () => {
    beforeEach(() => vi.clearAllMocks());
    it('aggregates owner-scoped harvest, expenses, profit and scan states', async () => {
        mocks.client.from.mockImplementation((table) => table === 'daily_notes' ? query([
            { activity_type: 'harvest', kg_harvested: 10, price_per_kg: 4, expense_amount: 3 },
            { activity_type: 'spray', expense_amount: 2 },
        ]) : query([{ created_at: '2026-01-01T00:00:00Z', result_json: { resultState: 'healthy' } }, { created_at: '2026-01-02T00:00:00Z', result_json: { needsMoreEvidence: true } }]));
        const result = await getReportSummary('user-a', { from: '2026-01-01', to: '2026-02-01' });
        expect(result.totals).toEqual({ harvestKg: '10.00', revenue: '40.00', expenses: '5.00', profit: '35.00' });
        expect(result.scanStates).toEqual({ healthy: 1, diseased: 0, uncertain: 1 });
        expect(mocks.client.from).toHaveBeenCalledWith('daily_notes');
        expect(mocks.client.from).toHaveBeenCalledWith('scan_history');
    });
});
