// @vitest-environment node
import { expect, it } from 'vitest';
import { findRegisteredUse, enforceRegisteredTreatments } from './registrationEligibility.js';
const now = new Date('2026-10-31');
const record = { productId: 1, registrationNumber: 'TEST-FIXTURE', reviewedBy: 'test-reviewer', labelUrl: 'https://example.test/label', crops: ['Chilli'], targets: ['Anthracnose'], verifiedAt: '2026-10-01', reviewUntil: '2026-12-01' };
it('requires reviewed, current, exact crop and target evidence', () => {
    expect(findRegisteredUse({ id: 1 }, { plantType: 'Chilli', disease: 'Anthracnose' }, [record], now)).toEqual(record);
    expect(findRegisteredUse({ id: 1 }, { plantType: 'Tomato', disease: 'Anthracnose' }, [record], now)).toBeNull();
    expect(findRegisteredUse({ id: 1 }, { plantType: 'Chilli', disease: 'Anthracnose' }, [{ ...record, reviewUntil: '2026-10-01' }], now)).toBeNull();
});
it('moves unverified chemical products into discovery even when listing heuristics passed', () => {
    const result = enforceRegisteredTreatments({ eligible: [{ id: 99, eligibility: { status: 'eligible', reasons: [] } }], discovery: [], excluded: 0 }, { plantType: 'Chilli', disease: 'Anthracnose' });
    expect(result.eligible).toEqual([]);
    expect(result.discovery[0]).toMatchObject({ discoveryOnly: true, eligibility: { status: 'needs_verification', reasons: ['registration_not_verified'] } });
});
