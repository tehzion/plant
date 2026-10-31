import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryNeon: vi.fn(), getNeonPool: vi.fn(() => ({})) }));
vi.mock('../utils/neonDatabase.js', () => mocks);

const { buildRecommendationSnapshot, saveRecommendationSnapshot } = await import('./recommendationSnapshotService.js');

describe('recommendation snapshots', () => {
    beforeEach(() => vi.clearAllMocks());

    it('keeps only ids, names and eligibility status per role', () => {
        const snapshot = buildRecommendationSnapshot({
            recommendationIntent: 'treatment_ready',
            diseaseControl: [{ id: 1, name: 'Copper', price: '20', description: 'long', eligibility: { status: 'eligible', checks: {} } }],
            fertilizers: [{ id: 2, name: 'NPK' }],
            supplements: [],
            catalogueDiscovery: [{ id: 3, name: 'Mancozeb' }],
            curatedRules: [{ id: 'fungal_leaf_spot_anthracnose' }],
        }, 'ms');
        expect(snapshot).toMatchObject({
            language: 'ms',
            recommendationIntent: 'treatment_ready',
            treatment: [{ id: 1, name: 'Copper', eligibility: 'eligible' }],
            fertilizer: [{ id: 2, name: 'NPK' }],
            supplement: [],
            discovery: [{ id: 3, name: 'Mancozeb' }],
            curatedRules: ['fungal_leaf_spot_anthracnose'],
        });
        expect(JSON.stringify(snapshot)).not.toContain('description');
    });

    it('updates only the row owned by the verified scan owner', async () => {
        mocks.queryNeon.mockResolvedValue({ rowCount: 1 });
        await expect(saveRecommendationSnapshot({ scanId: 'scan-1', ownerHash: 'a'.repeat(40), snapshot: { treatment: [] } })).resolves.toBe(true);
        const [sql, params] = mocks.queryNeon.mock.calls[0];
        expect(sql).toContain("metadata->>'ownerHash' = $2");
        expect(params.slice(0, 2)).toEqual(['scan-1', 'a'.repeat(40)]);
    });

    it('does nothing without an owner or a database', async () => {
        await expect(saveRecommendationSnapshot({ scanId: 'scan-1', ownerHash: null, snapshot: {} })).resolves.toBe(false);
        mocks.getNeonPool.mockReturnValueOnce(null);
        await expect(saveRecommendationSnapshot({ scanId: 'scan-1', ownerHash: 'a'.repeat(40), snapshot: {} })).resolves.toBe(false);
        expect(mocks.queryNeon).not.toHaveBeenCalled();
    });
});
