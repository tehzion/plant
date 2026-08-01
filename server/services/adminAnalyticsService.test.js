import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, getUserMock, dataByTable } = vi.hoisted(() => ({
    createClientMock: vi.fn(),
    getUserMock: vi.fn(),
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
                phone: '+60136667810',
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
