import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

vi.stubEnv('WOOCOMMERCE_URL', 'https://store.example');
vi.stubEnv('WOOCOMMERCE_CONSUMER_KEY', 'consumer-key');
vi.stubEnv('WOOCOMMERCE_CONSUMER_SECRET', 'consumer-secret');
vi.stubGlobal('fetch', fetchMock);

const wooCommerceService = await import('./wooCommerceService.js');

describe('wooCommerceService filtered product queries', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ([{
                id: 701,
                name: 'Copper Guard',
                price: '',
                short_description: '<p>Fungicide for leaf spot</p>',
                permalink: 'https://store.example/product/copper-guard',
                stock_status: 'outofstock',
                purchasable: false,
                categories: [{ id: 20, name: 'Disease Control' }],
                tags: [{ id: 10, name: 'Fungicide' }],
            }]),
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('queries bounded WooCommerce filters instead of loading the full catalog', async () => {
        const products = await wooCommerceService.getProductsByTagIds(
            [10],
            [20],
            { searchTerms: ['fungicide'], },
        );

        expect(fetchMock).toHaveBeenCalledTimes(3);
        fetchMock.mock.calls.forEach(([requestUrl]) => {
            const url = new URL(requestUrl);
            expect(url.pathname).toBe('/wp-json/wc/v3/products');
            expect(url.searchParams.get('per_page')).toBe('50');
            expect(url.searchParams.get('page')).toBeNull();
        });
        expect(products[0]).toMatchObject({
            id: 701,
            availability: 'out_of_stock',
            inStock: false,
            purchasable: false,
            categories: ['Disease Control'],
            tags: ['Fungicide'],
        });
    });
});
