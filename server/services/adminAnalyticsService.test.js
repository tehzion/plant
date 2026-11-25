import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, getUserMock, queryNeonMock, dataByTable } = vi.hoisted(() => ({
    createClientMock: vi.fn(),
    getUserMock: vi.fn(),
    queryNeonMock: vi.fn(),
    dataByTable: {
        scan_history: [],
        consultation_leads: [],
        product_events: [],
    },
}));

const makeBuilder = (table) => ({
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: dataByTable[table] || [], error: null }),
});

vi.mock('@supabase/supabase-js', () => ({
    createClient: createClientMock,
}));
vi.mock('../utils/neonDatabase.js', () => ({
    getNeonPool: vi.fn(() => ({ query: queryNeonMock })),
    queryNeon: queryNeonMock,
}));

const adminClient = {
    auth: {
        getUser: getUserMock,
    },
    from: vi.fn((table) => makeBuilder(table)),
};

const {
    getAdminReviewSummary,
    getScanStateFromRow,
    isUncertainScanRow,
    normalizeAdminDays,
    normalizeAdminLimit,
    verifyAdminRequest,
} = await import('./adminAnalyticsService.js');

describe('adminAnalyticsService', () => {
    beforeEach(() => {
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
        process.env.ADMIN_EMAILS = 'admin@example.com';
        createClientMock.mockReset();
        createClientMock.mockReturnValue(adminClient);
        getUserMock.mockReset();
        getUserMock.mockResolvedValue({ data: { user: { email: 'admin@example.com' } }, error: null });
        adminClient.from.mockClear();
        dataByTable.scan_history = [];
        dataByTable.consultation_leads = [];
        dataByTable.product_events = [];
        queryNeonMock.mockImplementation((sql) => ({ rows: dataByTable[sql.match(/public\.(scan_history|consultation_leads|product_events)/)?.[1]] || [] }));
    });

    it('normalizes admin query bounds', () => {
        expect(normalizeAdminDays('0')).toBe(1);
        expect(normalizeAdminDays('999')).toBe(365);
        expect(normalizeAdminDays('bad')).toBe(30);
        expect(normalizeAdminLimit('0')).toBe(1);
        expect(normalizeAdminLimit('99')).toBe(50);
        expect(normalizeAdminLimit('bad')).toBe(20);
    });

    it('classifies retake and weak scans as uncertain', () => {
        expect(getScanStateFromRow({
            result_json: {
                resultState: 'needs_closer_photo',
            },
        })).toBe('needs_closer_photo');

        expect(isUncertainScanRow({
            confidence: 92,
            result_json: {
                requiresRetake: true,
                resultState: 'healthy',
            },
        })).toBe(true);

        expect(isUncertainScanRow({
            confidence: 91,
            result_json: {
                resultState: 'confident_treatment',
            },
        })).toBe(false);
    });

    it('verifies admin requests against the configured email allowlist', async () => {
        const user = await verifyAdminRequest({
            get: () => 'Bearer token-123',
        });

        expect(user.email).toBe('admin@example.com');
        expect(getUserMock).toHaveBeenCalledWith('token-123');
    });

    it('rejects signed-in users outside the admin allowlist', async () => {
        getUserMock.mockResolvedValueOnce({ data: { user: { email: 'farmer@example.com' } }, error: null });

        await expect(verifyAdminRequest({
            get: () => 'Bearer token-456',
        })).rejects.toMatchObject({ status: 403 });
    });

    it('verifies an admin token with a publishable key when the service key is absent', async () => {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
        const user = await verifyAdminRequest({ get: () => 'Bearer token-789' });
        expect(user.email).toBe('admin@example.com');
        expect(createClientMock).toHaveBeenCalledWith('https://project.supabase.co', 'publishable-key', expect.any(Object));
        expect(getUserMock).toHaveBeenCalledWith('token-789');
    });

    it('builds review summary counts, common diseases, and top products', async () => {
        dataByTable.scan_history = [
            {
                id: 'scan-1',
                disease: 'Leaf Spot',
                confidence: 91,
                severity: 'moderate',
                category: 'Durian',
                location_name: 'Johor',
                result_json: { resultState: 'confident_treatment', plantType: 'Durian' },
                created_at: '2026-08-01T00:00:00.000Z',
            },
            {
                id: 'scan-2',
                disease: 'No clear disease detected',
                confidence: 45,
                category: 'Kelapa',
                result_json: { resultState: 'needs_closer_photo', requiresRetake: true },
                created_at: '2026-08-01T01:00:00.000Z',
            },
        ];
        dataByTable.consultation_leads = [
            {
                id: 'lead-1',
                scan_id: 'scan-2',
                disease: 'No clear disease detected',
                crop: 'Kelapa',
                confidence: 45,
                phone: '+60146193328',
                recommendation_intent: 'support_only',
                source: 'product_recommendations',
                created_at: '2026-08-01T01:05:00.000Z',
            },
        ];
        dataByTable.product_events = [
            {
                id: 'event-1',
                scan_id: 'scan-1',
                event_type: 'product_click',
                product_id: '1',
                product_name: 'Copper Guard',
                recommendation_intent: 'treatment_ready',
                recommendation_role: 'treatment',
                crop: 'Durian',
                disease: 'Leaf Spot',
                created_at: '2026-08-01T01:10:00.000Z',
            },
            {
                id: 'event-2',
                scan_id: 'scan-1',
                event_type: 'recommended_checkout_click',
                product_id: '1',
                product_name: 'Copper Guard',
                recommendation_intent: 'treatment_ready',
                recommendation_role: 'treatment',
                crop: 'Durian',
                disease: 'Leaf Spot',
                created_at: '2026-08-01T01:11:00.000Z',
            },
        ];

        const summary = await getAdminReviewSummary({ days: 14, limit: 10 });

        expect(summary.windowDays).toBe(14);
        expect(summary.counts).toMatchObject({
            recentScans: 2,
            uncertainScans: 1,
            consultationLeads: 1,
            productClicks: 1,
            checkoutClicks: 1,
        });
        expect(summary.uncertainScans[0].id).toBe('scan-2');
        expect(summary.commonDiseases[0]).toEqual({ name: 'No clear disease detected', count: 2 });
        expect(summary.topProducts[0]).toEqual({ name: 'Copper Guard', count: 1 });
    });
});

describe('adminAnalyticsService feedback summary', () => {
    beforeEach(() => {
        queryNeonMock.mockReset();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('adds farmer answers and disliked assistant replies to the summary', async () => {
        queryNeonMock.mockImplementation(async (sql) => {
            if (sql.includes('diagnosis_feedback') && sql.includes('count(*)')) return { rows: [{ correct: 7, needs_correction: 2 }] };
            if (sql.includes('diagnosis_feedback')) {
                return { rows: [{ id: 'f1', scan_id: 'scan-9', created_at: '2026-11-20T00:00:00Z', feedback: { wasCorrect: false, issueType: 'wrong_disease', correctDisease: 'Kekurangan kalium', note: 'Daun tua kuning dulu' } }] };
            }
            if (sql.includes('assistant_feedback') && sql.includes('count(*)')) return { rows: [{ up: 4, down: 1 }] };
            if (sql.includes('assistant_feedback')) return { rows: [{ id: 'a1', language: 'ms', question: 'Bila nak sembur?', answer: 'Sembur pagi.', page: '/results', created_at: '2026-11-21T00:00:00Z' }] };
            return { rows: [] };
        });

        const summary = await getAdminReviewSummary({ days: 30, limit: 10 });

        expect(summary.counts).toMatchObject({ diagnosisCorrect: 7, diagnosisNeedsCorrection: 2, assistantUp: 4, assistantDown: 1 });
        expect(summary.recentCorrections[0]).toMatchObject({ scanId: 'scan-9', issueType: 'wrong_disease', correctDisease: 'Kekurangan kalium', note: 'Daun tua kuning dulu' });
        expect(summary.recentAssistantComplaints[0]).toMatchObject({ language: 'ms', question: 'Bila nak sembur?' });
    });

    it('still returns the rest of the dashboard when a feedback table is missing', async () => {
        queryNeonMock.mockImplementation(async (sql) => {
            if (sql.includes('assistant_feedback')) throw Object.assign(new Error('relation does not exist'), { code: '42P01' });
            return { rows: [] };
        });

        const summary = await getAdminReviewSummary({ days: 30, limit: 10 });

        expect(summary.counts.assistantDown).toBe(0);
        expect(summary.recentAssistantComplaints).toEqual([]);
        expect(summary.counts.recentScans).toBe(0);
    });
});
