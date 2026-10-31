import {
    activeWaitingPeriods,
    checklistCompletion,
    evaluateChecklistEvidence,
    findPhiConflicts,
    missingPesticideFields,
    NOT_APPLICABLE,
    resolveChecklist,
    safeHarvestDateFor,
} from './mygapCompliance.js';

const completeSpray = {
    id: 's1', type: 'pesticide', activity_date: '2026-10-01', plot_id: 'Blok A', crop: 'Durian',
    product_used: 'Mancozeb 80WP', active_ingredient: 'mancozeb', registration_no: 'LRMP R1/1234',
    quantity: '2 kg / 400 L', target_pest: 'Leaf spot', phi_days: '14',
};
const ymd = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

describe('waiting period (PHI)', () => {
    it('computes the safe harvest date from the spray date and PHI days', () => {
        expect(ymd(safeHarvestDateFor(completeSpray))).toBe('2026-10-15');
        expect(safeHarvestDateFor({ ...completeSpray, phi_days: '' })).toBeNull();
        expect(safeHarvestDateFor({ ...completeSpray, type: 'fertilizer' })).toBeNull();
    });

    it('flags a harvest on the same plot before the safe date, ignoring other plots', () => {
        const logs = [
            completeSpray,
            { id: 'h1', type: 'harvest', activity_date: '2026-10-10', plot_id: 'blok a ' },
            { id: 'h2', type: 'harvest', activity_date: '2026-10-15', plot_id: 'Blok A' },
            { id: 'h3', type: 'harvest', activity_date: '2026-10-10', plot_id: 'Blok B' },
        ];
        const conflicts = findPhiConflicts(logs);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]).toMatchObject({ harvestId: 'h1', sprayId: 's1' });
        expect(ymd(conflicts[0].safeFrom)).toBe('2026-10-15');
    });

    it('lists waiting periods still running for a plot on a given day', () => {
        expect(activeWaitingPeriods([completeSpray], { plot: 'Blok A', date: '2026-10-05' })).toHaveLength(1);
        expect(activeWaitingPeriods([completeSpray], { plot: 'Blok A', date: '2026-10-15' })).toHaveLength(0);
        expect(activeWaitingPeriods([completeSpray], { plot: 'Blok B', date: '2026-10-05' })).toHaveLength(0);
    });
});

describe('pesticide record completeness (myGAP 4-5)', () => {
    it('accepts a complete record and names what is missing otherwise', () => {
        expect(missingPesticideFields(completeSpray)).toEqual([]);
        expect(missingPesticideFields({ ...completeSpray, registration_no: '', phi_days: null })).toEqual(['registration_no', 'phi_days']);
    });
});

describe('checklist evidence', () => {
    const now = new Date('2026-10-20T12:00:00');

    it('does not complete the pesticide item from a single incomplete record', () => {
        const evidence = evaluateChecklistEvidence({ logs: [{ type: 'pesticide', activity_date: '2026-10-01', product_used: 'X' }], now });
        expect(evidence.check1).toMatchObject({ auto: false, reason: 'pesticideRecordsIncomplete', count: 1 });
    });

    it('completes the pesticide item only when every spray record is complete', () => {
        expect(evaluateChecklistEvidence({ logs: [completeSpray], now }).check1).toMatchObject({ auto: true, count: 1 });
    });

    it('never auto-completes water, storage, PPE, disposal or training items', () => {
        const evidence = evaluateChecklistEvidence({ logs: [completeSpray, { type: 'irrigation', activity_date: '2026-10-02', plot_id: 'A', crop: 'Durian' }], now });
        for (const id of ['check2', 'check4', 'check5', 'check6', 'check7']) expect(evidence[id]?.auto).toBeFalsy();
    });

    it('counts recent scans and scouting as pest checks without ticking hygiene', () => {
        const evidence = evaluateChecklistEvidence({ scans: [{ timestamp: '2026-10-18T00:00:00' }, { timestamp: '2026-08-01T00:00:00' }], notes: [{ activity_type: 'scout', created_at: '2026-10-19T00:00:00' }], now });
        expect(evidence.check3).toEqual({ auto: false, reason: 'pestChecksRecorded', count: 2 });
    });

    it('needs date, plot and crop on every record for traceability', () => {
        expect(evaluateChecklistEvidence({ logs: [completeSpray], now }).check8.auto).toBe(true);
        expect(evaluateChecklistEvidence({ logs: [completeSpray, { type: 'harvest', activity_date: '2026-10-16' }], now }).check8).toMatchObject({ auto: false, count: 1 });
    });

    it('lets farmers mark items not applicable and excludes them from the percentage', () => {
        const resolved = resolveChecklist({ check2: true, check4: NOT_APPLICABLE }, { check1: { auto: true }, check4: { auto: true } });
        expect(resolved.check1).toBe(true);
        expect(resolved.check4).toBe(NOT_APPLICABLE);
        expect(checklistCompletion(resolved)).toEqual({ completed: 2, applicable: 7, notApplicable: 1, percent: 29 });
    });
});
