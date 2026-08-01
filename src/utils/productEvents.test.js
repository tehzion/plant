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
    PRODUCT_EVENT_TYPES,
    buildProductEventPayload,
    saveProductEvent,
} = await import('./productEvents.js');

describe('product event capture', () => {
    beforeEach(() => {
        localStorage.clear();
        insertMock.mockReset();
        getUserMock.mockReset();
        getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
        insertMock.mockResolvedValue({ error: null });
    });

    it('builds a compact product click payload from scan and product context', () => {
        const payload = buildProductEventPayload({
            diagnosis: {
                scanId: 'scan-123',
                plantType: 'Durian',
                disease: 'Leaf Spot',
                confidence: 88,
            },
            product: {
                id: 42,
                name: 'Copper Guard',
                permalink: 'https://example.com/products/copper-guard',
                recommendationRole: 'treatment',
                matchScore: 91,
                cautionLevel: 'standard',
                matchedTerms: ['copper'],
            },
            recommendationIntent: 'treatment_ready',
            userId: 'user-1',
            guestId: 'guest-1',
        });

        expect(payload).toMatchObject({
            scan_id: 'scan-123',
            user_id: 'user-1',
            guest_id: 'guest-1',
            event_type: 'product_click',
            product_id: '42',
            product_name: 'Copper Guard',
            product_url: 'https://example.com/products/copper-guard',
            recommendation_intent: 'treatment_ready',
            recommendation_role: 'treatment',
            disease: 'Leaf Spot',
            crop: 'Durian',
            confidence: 88,
        });
        expect(payload.metadata.matchScore).toBe(91);
        expect(payload.metadata.matchedTerms).toEqual(['copper']);
    });

    it('saves product events through Supabase without blocking callers', async () => {
        const result = await saveProductEvent({
            diagnosis: {
                scanId: 'scan-456',
                plantType: 'Padi',
                disease: 'Rice Blast',
                confidence: 91,
            },
            product: {
                id: 12,
                name: 'Blast Control',
                cartUrl: 'https://example.com/cart/?add-to-cart=12',
                recommendationRole: 'treatment',
            },
            eventType: PRODUCT_EVENT_TYPES.RECOMMENDED_CHECKOUT_CLICK,
            recommendationIntent: 'treatment_ready',
            metadata: {
                selectedProductIds: [12, 18],
                productCount: 2,
            },
        });

        expect(result).toEqual({ saved: true });
        expect(insertMock).toHaveBeenCalledTimes(1);
        expect(insertMock.mock.calls[0][0]).toMatchObject({
            scan_id: 'scan-456',
            user_id: 'user-1',
            event_type: 'recommended_checkout_click',
            product_id: '12',
            product_name: 'Blast Control',
            product_url: 'https://example.com/cart/?add-to-cart=12',
            recommendation_intent: 'treatment_ready',
            crop: 'Padi',
            disease: 'Rice Blast',
        });
        expect(insertMock.mock.calls[0][0].guest_id).toMatch(/^guest_/);
        expect(insertMock.mock.calls[0][0].metadata.selectedProductIds).toEqual(['12', '18']);
    });
});
