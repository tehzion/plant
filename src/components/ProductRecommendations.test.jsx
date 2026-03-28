import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductRecommendations from './ProductRecommendations.jsx';

const fetchMock = vi.fn();

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'results.loadingProducts': 'Loading products',
            'results.productsError': 'Could not load products',
            'results.checkoutUnavailable': 'Checkout unavailable',
            'results.whyTheseProducts': 'Why these products?',
            'results.noProductsFound': 'No products found',
            'results.noProductsDesc': 'No products description',
            'results.diseaseControl': 'Disease Control',
            'results.recommendedFertilizers': 'Recommended Fertilizers',
            'results.recommendedSupplements': 'Recommended Supplements',
            'results.otherPopular': 'Other Popular Products',
            'results.viewProduct': 'View Product',
            'results.addToCart': 'Add to Cart',
            'results.itemsSelected': 'Items Selected',
            'results.buySelected': 'Buy Selected Products',
            'results.ourTrustedSuppliers': 'Our Trusted Suppliers',
            'results.fallbackProductsTitle': 'Fallback Store Suggestions',
            'results.fallbackProductsLabel': 'Fallback products',
            'results.fallbackProductsDesc': 'Fallback description',
            'home.treeScale': 'Per Tree',
            'results.perTreeTitle': 'Per Tree',
            'results.perTreeNote': 'Per-tree guidance',
            'results.guanChongDesc': 'Supplier desc',
            'results.tanAgroDesc': 'Supplier desc',
        }[key] || key),
    }),
}));

vi.mock('./PartnerCarousel', () => ({
    default: () => null,
}));

vi.mock('../utils/toast', () => ({
    showToast: vi.fn(),
}));

vi.mock('../data/productRecommendations.js', () => ({
    suppliers: {
        guanChongAgro: {
            name: 'Guan Chong Agro',
            description: 'results.guanChongDesc',
            address: 'Address 1',
            phone: '123',
        },
        tanAgro: {
            name: 'Tan Agro',
            description: 'results.tanAgroDesc',
            address: 'Address 2',
            phone: '456 / 789',
        },
    },
}));

describe('ProductRecommendations', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                diseaseControl: [
                    {
                        id: 1,
                        name: 'Copper Guard',
                        price: '12.00',
                        description: 'Protective fungicide',
                        permalink: 'https://example.com/products/copper-guard',
                    },
                ],
                fertilizers: [],
                supplements: [],
                otherPopular: [],
                reasoning: '',
                fallbackMeta: null,
                storeUrl: 'https://example.com/store',
            }),
        });
    });

    it('does not refetch or clear selected products when rerendered with an equivalent scan result', async () => {
        const baseScanResult = {
            healthStatus: 'unhealthy',
            pathogenType: 'fungal',
            symptoms: ['Leaf spots'],
            treatments: ['Apply fungicide'],
            productSearchTags: ['fungicide'],
        };

        const { rerender } = render(
            <ProductRecommendations
                plantType="Durian"
                disease="Leaf Spot"
                farmScale="tree"
                scanResult={baseScanResult}
            />,
        );

        await screen.findByText('Copper Guard');
        expect(fetchMock).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText('Copper Guard'));
        expect(await screen.findByText(/1 Items Selected/i)).toBeInTheDocument();

        rerender(
            <ProductRecommendations
                plantType="Durian"
                disease="Leaf Spot"
                farmScale="tree"
                scanResult={{
                    ...baseScanResult,
                    symptoms: [...baseScanResult.symptoms],
                    treatments: [...baseScanResult.treatments],
                    productSearchTags: [...baseScanResult.productSearchTags],
                }}
            />,
        );

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
        expect(screen.getByText(/1 Items Selected/i)).toBeInTheDocument();
    });
});
