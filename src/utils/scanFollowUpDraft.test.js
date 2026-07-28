import { beforeEach, describe, expect, it } from 'vitest';
import {
    SCAN_FOLLOW_UP_DRAFT_KEY,
    buildFollowUpDraftFromScan,
    consumeFollowUpDraft,
    saveFollowUpDraft,
} from './scanFollowUpDraft.js';

describe('scan follow-up drafts', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('turns a healthy scan into an inspection log draft', () => {
        const draft = buildFollowUpDraftFromScan({
            id: 'scan-healthy',
            healthStatus: 'healthy',
            plantType: 'Durian',
            confidence: 0.94,
            healthyCarePlan: {
                dailyCare: ['Check new leaf growth'],
            },
        });

        expect(draft).toMatchObject({
            activity_type: 'inspect',
            inspection_type: 'Pest/Disease',
            inspection_status: 'Good',
            expense_category: 'Labor',
            scout_severity: 'Low',
        });
        expect(draft.note).toContain('Linked scan: scan-healthy');
        expect(draft.note).toContain('Status: Healthy');
    });

    it('turns an uncertain scan into a scouting log draft', () => {
        const draft = buildFollowUpDraftFromScan({
            id: 'scan-uncertain',
            status: 'uncertain',
            disease: 'Possible leaf spot',
            severity: 'mild',
            plantType: 'Coconut',
            needsMoreEvidence: true,
            retakeReason: 'Leaf image is blurry',
        });

        expect(draft).toMatchObject({
            activity_type: 'scout',
            disease_name_observed: 'Possible leaf spot',
            scout_severity: 'Low',
            inspection_status: 'Action Required',
            expense_category: 'Labor',
        });
        expect(draft.note).toContain('Field scouting');
        expect(draft.note).toContain('Leaf image is blurry');
    });

    it('prioritizes retake-needed scans over healthy inspection drafts', () => {
        const draft = buildFollowUpDraftFromScan({
            id: 'scan-retake',
            healthStatus: 'healthy',
            plantType: 'Durian',
            requiresRetake: true,
            retakeReason: 'Need a closer leaf photo',
        });

        expect(draft.activity_type).toBe('scout');
        expect(draft.note).toContain('Need a closer leaf photo');
    });

    it('turns a disease scan into a treatment log draft', () => {
        const draft = buildFollowUpDraftFromScan({
            id: 'scan-disease',
            healthStatus: 'unhealthy',
            disease: 'Leaf Rust',
            severity: 'severe',
            plantType: 'Chili',
            immediateActions: ['Remove infected leaves'],
            treatments: ['Apply labeled fungicide'],
        });

        expect(draft).toMatchObject({
            activity_type: 'spray',
            chemical_name: '',
            chemical_qty: '',
            disease_name_observed: 'Leaf Rust',
            scout_severity: 'High',
            inspection_status: 'Urgent',
            expense_category: 'Pesticide',
        });
        expect(draft.note).toContain('Linked scan: scan-disease');
        expect(draft.note).toContain('Apply labeled fungicide');
    });

    it('stores and consumes a draft once from sessionStorage', () => {
        const draft = buildFollowUpDraftFromScan({
            id: 'scan-store',
            healthStatus: 'healthy',
            plantType: 'Durian',
        });

        expect(saveFollowUpDraft(draft)).toBe(true);
        expect(sessionStorage.getItem(SCAN_FOLLOW_UP_DRAFT_KEY)).toBeTruthy();
        expect(consumeFollowUpDraft()).toMatchObject({ activity_type: 'inspect' });
        expect(consumeFollowUpDraft()).toBeNull();
    });
});
