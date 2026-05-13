import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductRecommendations from './ProductRecommendations.jsx';

const fetchMock = vi.fn();

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        language: 'en',
        t: (key) => ({
            'results.loadingProducts': 'Loading products',
            'results.productsError': 'Could not load products',
            'results.productsUnavailableTitle': 'Live product catalog is temporarily unavailable',
            'results.productsUnavailableHint': 'Catalog unavailable hint',
            'results.confirmBeforeUseTitle': 'Confirm before use',
            'results.confirmBeforeUseDesc': 'Confirm field signs before applying treatment.',
            'results.checkoutUnavailable': 'Checkout unavailable',
            'results.whyTheseProducts': 'Selection note',
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
        window.localStorage.clear();

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

    it('uses recent cached recommendations when the live catalog is unavailable', async () => {
        const scanResult = {
            healthStatus: 'unhealthy',
            pathogenType: 'fungal',
            symptoms: ['Leaf spots'],
            treatments: ['Apply fungicide'],
            productSearchTags: ['fungicide'],
        };

        const { unmount } = render(
            <ProductRecommendations
                plantType="Durian"
                disease="Leaf Spot"
                farmScale="tree"
                scanResult={scanResult}
            />,
        );

        await screen.findByText('Copper Guard');
        unmount();

        fetchMock.mockRejectedValueOnce(new Error('Catalog offline'));

        render(
            <ProductRecommendations
                plantType="Durian"
                disease="Leaf Spot"
                farmScale="tree"
                scanResult={scanResult}
            />,
        );

        expect(await screen.findByText('Copper Guard')).toBeInTheDocument();
        expect(await screen.findByText(/Showing recent saved product matches/i)).toBeInTheDocument();
    });

    it('does not expose backend configuration messages in the product error state', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            json: async () => ({
                error: 'PRODUCT_CATALOG_UNAVAILABLE',
                message: 'Live product catalog is not configured right now.',
            }),
        });

        render(
            <ProductRecommendations
                plantType="Papaya"
                disease="Potential Pest Infestation"
                farmScale="tree"
                scanResult={{
                    healthStatus: 'unhealthy',
                    pathogenType: 'pest',
                    symptoms: ['White patches'],
                    treatments: ['Inspect fruit clusters'],
                    productSearchTags: ['pest-control'],
                }}
            />,
        );

        expect(await screen.findByText('Live product catalog is temporarily unavailable')).toBeInTheDocument();
        expect(screen.queryByText('Live product catalog is not configured right now.')).not.toBeInTheDocument();
    });

    it('shows a confirmation notice for suspected disease-control matches', async () => {
        render(
            <ProductRecommendations
                plantType="Papaya"
                disease="Suspected Papaya Mealybug / Scale Infestation"
                farmScale="tree"
                scanResult={{
                    status: 'likely',
                    healthStatus: 'unhealthy',
                    pathogenType: 'pest',
                    symptoms: ['White cottony patches'],
                    treatments: ['Use registered pest product after field confirmation'],
                    productSearchTags: ['pest-control'],
                }}
            />,
        );

        await screen.findByText('Copper Guard');
        expect(screen.getByText('Confirm before use')).toBeInTheDocument();
        expect(screen.getByText('Confirm field signs before applying treatment.')).toBeInTheDocument();
    });
});
