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

    it('reads public Store API products without credentials and waits for the body', async () => {
        vi.stubEnv('WOOCOMMERCE_CONSUMER_KEY', '');
        vi.stubEnv('WOOCOMMERCE_CONSUMER_SECRET', '');
        try {
            fetchMock.mockImplementation(async (_url, options) => ({
                ok: true, status: 200,
                json: async () => {
                    if (options.signal.aborted) throw Error('body was aborted');
                    return [{ id: 702, name: 'Fertilizer', prices: { price: '11500', currency_minor_unit: 2 }, is_in_stock: true, is_purchasable: true, categories: [], tags: [] }];
                },
            }));
            const products = await wooCommerceService.getProductsByTagIds([], [], { searchTerms: ['unique-fertilizer-test'] });
            expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/wp-json/wc/store/v1/products');
            expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
            expect(products[0]).toMatchObject({ id: 702, price: '115.00', inStock: true, availability: 'in_stock', purchasable: true });
        } finally {
            vi.stubEnv('WOOCOMMERCE_CONSUMER_KEY', 'consumer-key');
            vi.stubEnv('WOOCOMMERCE_CONSUMER_SECRET', 'consumer-secret');
        }
    });
});

describe('store text from WooCommerce', () => {
    it('shows product names and descriptions as plain text', async () => {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ([{
                id: 702,
                name: 'MULTIGREEN (1KG) &#8211; Baja Organik Pokok Bunga, Buah dan Sayuran',
                price: '17.50',
                short_description: '<p>Untuk sayur &amp; buah &#x2014; guna ikut label&hellip;</p>',
                permalink: 'https://store.example/product/multigreen',
                stock_status: 'instock',
                categories: [{ id: 30, name: 'Baja &amp; Nutrien' }],
                tags: [{ id: 31, name: 'Organik &#8217;' }],
            }]),
        });
        const [product] = await wooCommerceService.getProductsByTagIds([31], [], {});
        expect(product.name).toBe('MULTIGREEN (1KG) – Baja Organik Pokok Bunga, Buah dan Sayuran');
        expect(product.description).toBe('Untuk sayur & buah — guna ikut label…');
        expect(product.categories).toEqual(['Baja & Nutrien']);
        expect(product.tags).toEqual(['Organik ’']);
    });

    it('decodes each code once and leaves unknown text alone', () => {
        const { decodeHtmlEntities } = wooCommerceService;
        expect(decodeHtmlEntities('A &amp;#8211; B')).toBe('A &#8211; B');
        expect(decodeHtmlEntities('Fish &chips; 5 &lt; 6')).toBe('Fish &chips; 5 < 6');
        expect(decodeHtmlEntities('bad &#0; &#99999999;')).toBe('bad  ');
        expect(decodeHtmlEntities(null)).toBe('');
    });
});
