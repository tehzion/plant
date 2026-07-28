import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insertMock, getUserMock } = vi.hoisted(() => ({
    insertMock: vi.fn(),
    getUserMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: getUserMock,
        },
        from: vi.fn(() => ({
            insert: insertMock,
        })),
    },
}));

const {
    buildConsultationLeadPayload,
    saveConsultationLead,
} = await import('./consultationLeads.js');

describe('consultation lead capture', () => {
    beforeEach(() => {
        localStorage.clear();
        insertMock.mockReset();
        getUserMock.mockReset();
        getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
        insertMock.mockResolvedValue({ error: null });
    });

    it('builds a compact lead payload from scan and consultation context', () => {
        const payload = buildConsultationLeadPayload({
            diagnosis: {
                scanId: 'scan-123',
                plantType: 'Durian',
                disease: 'Leaf Spot',
                confidence: 88.4,
                severity: 'moderate',
                status: 'confirmed',
                locationName: 'Johor',
                symptoms: ['Brown lesions'],
                productSearchTags: ['fungicide'],
            },
            consultation: {
                phone: '+60136667810',
                priority: 'secondary',
                reason: 'Confirm before use.',
            },
            recommendationIntent: 'treatment_ready',
            userId: 'user-1',
            guestId: 'guest-1',
        });

        expect(payload).toMatchObject({
            scan_id: 'scan-123',
            user_id: 'user-1',
            guest_id: 'guest-1',
            disease: 'Leaf Spot',
            crop: 'Durian',
            confidence: 88.4,
            phone: '+60136667810',
            contact_intent: 'whatsapp_consultation',
            recommendation_intent: 'treatment_ready',
            severity: 'moderate',
            status: 'confirmed',
            location_name: 'Johor',
            source: 'product_recommendations',
        });
        expect(payload.metadata.symptoms).toEqual(['Brown lesions']);
        expect(payload.metadata.productSearchTags).toEqual(['fungicide']);
    });

    it('saves a consultation lead through Supabase without throwing', async () => {
        const result = await saveConsultationLead({
            diagnosis: {
                scanId: 'scan-456',
                plantType: 'Padi',
                disease: 'Rice Blast',
                confidence: 91,
            },
            consultation: {
                phone: '+60136667810',
                priority: 'primary',
                reason: 'No safe product match.',
            },
            recommendationIntent: 'consultation_needed',
        });

        expect(result).toEqual({ saved: true });
        expect(insertMock).toHaveBeenCalledTimes(1);
        expect(insertMock.mock.calls[0][0]).toMatchObject({
            scan_id: 'scan-456',
            user_id: 'user-1',
            disease: 'Rice Blast',
            crop: 'Padi',
            confidence: 91,
            contact_intent: 'whatsapp_consultation',
            recommendation_intent: 'consultation_needed',
        });
        expect(insertMock.mock.calls[0][0].guest_id).toMatch(/^guest_/);
    });
});
