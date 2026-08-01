import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductRecommendations from './ProductRecommendations.jsx';

const fetchMock = vi.fn();
const saveConsultationLeadMock = vi.hoisted(() => vi.fn());
const saveProductEventMock = vi.hoisted(() => vi.fn());
const saveFollowUpDraftMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/consultationLeads.js', () => ({
    saveConsultationLead: saveConsultationLeadMock,
}));

vi.mock('../utils/productEvents.js', () => ({
    PRODUCT_EVENT_TYPES: {
        PRODUCT_CLICK: 'product_click',
        CHECKOUT_CLICK: 'checkout_click',
        RECOMMENDED_CHECKOUT_CLICK: 'recommended_checkout_click',
    },
    saveProductEvent: saveProductEventMock,
}));

vi.mock('../utils/scanFollowUpDraft.js', () => ({
    saveFollowUpDraft: saveFollowUpDraftMock,
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
}));

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
            'results.consultationRecommendedTitle': 'Consultation recommended',
            'results.consultationAvailableTitle': 'Need help choosing?',
            'results.contactForConsultation': 'Contact us for consultation',
            'results.productsErrorConsultationDesc': 'Catalog failed. Contact agronomy support.',
            'results.productMatchScore': 'Match',
            'results.labelVerifiedMatch': 'Strong match',
            'results.labelConfirmBeforeUse': 'Confirm before use',
            'results.labelConsultFirst': 'Consult first',
            'results.labelMaintenanceSupport': 'Maintenance support',
            'results.activeIngredientToCheck': 'Active ingredient to check',
            'results.checkoutUnavailable': 'Checkout unavailable',
            'results.recommendedPlanTitle': 'Recommended product plan',
            'results.recommendedPlanDesc': 'Bridge description',
            'results.checkoutRecommended': 'Add recommended to checkout',
            'results.saveProductPlan': 'Save product plan',
            'results.productPlanSaved': 'Product plan prepared in Daily Log.',
            'results.productPlanSaveFailed': 'Could not prepare draft',
            'results.consultationFirstCheckoutHint': 'Consultation first',
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
        vi.restoreAllMocks();
        fetchMock.mockReset();
        saveConsultationLeadMock.mockReset();
        saveConsultationLeadMock.mockResolvedValue({ saved: true });
        saveProductEventMock.mockReset();
        saveProductEventMock.mockResolvedValue({ saved: true });
        saveFollowUpDraftMock.mockReset();
        saveFollowUpDraftMock.mockReturnValue(true);
        navigateMock.mockReset();
        global.fetch = fetchMock;
        vi.spyOn(window, 'open').mockImplementation(() => null);
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
                        matchScore: 88,
                        matchReason: 'Matched fungicide from the scan result.',
                        matchedTerms: ['fungicide'],
                        activeIngredients: ['copper', 'mancozeb'],
                        matchedActiveIngredients: ['copper'],
                        cautionNote: 'Use only crop-registered fungicides.',
                        recommendationRole: 'treatment',
                        cautionLevel: 'standard',
                    },
                ],
                fertilizers: [],
                supplements: [],
                otherPopular: [],
                reasoning: '',
                fallbackMeta: null,
                recommendationIntent: 'treatment_ready',
                consultation: {
                    phone: '+60136667810',
                    url: 'https://wa.me/60136667810?text=scan',
                    message: 'Scan ID: scan-123',
                    label: 'Contact us for consultation',
                    priority: 'secondary',
                    reason: 'Send the scan details to our agronomy team before applying treatment.',
                },
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

    it('shows match metadata and keeps consultation secondary for strong product matches', async () => {
        render(
            <ProductRecommendations
                plantType="Durian"
                disease="Leaf Spot"
                farmScale="tree"
                scanResult={{
                    id: 'scan-123',
                    status: 'confirmed',
                    healthStatus: 'unhealthy',
                    pathogenType: 'fungal',
                    confidence: 92,
                    symptoms: ['Leaf spots'],
                    treatments: ['Apply registered fungicide'],
                    productSearchTags: ['fungicide'],
                }}
            />,
        );

        expect(await screen.findByText('Copper Guard')).toBeInTheDocument();
        expect(screen.getByText('Match 88%')).toBeInTheDocument();
        expect(screen.getByText('Matched fungicide from the scan result.')).toBeInTheDocument();
        expect(screen.getByText(/Active ingredient to check: copper/i)).toBeInTheDocument();
        expect(screen.getByText('Use only crop-registered fungicides.')).toBeInTheDocument();
        expect(screen.getByText('Strong match')).toBeInTheDocument();
        expect(screen.getByText('Need help choosing?')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /contact us for consultation/i })).toHaveAttribute('href', expect.stringContaining('wa.me/60136667810'));
    });

    it('opens WooCommerce checkout for recommended products', async () => {
        render(
            <ProductRecommendations
                plantType="Durian"
                disease="Leaf Spot"
                farmScale="tree"
                scanResult={{
                    id: 'scan-checkout',
                    status: 'confirmed',
                    resultState: 'confident_treatment',
                    healthStatus: 'unhealthy',
                    pathogenType: 'fungal',
                    confidence: 92,
                    symptoms: ['Leaf spots'],
                    productSearchTags: ['fungicide'],
                }}
            />,
        );

        await screen.findByText('Copper Guard');
        fireEvent.click(screen.getByRole('button', { name: /add recommended to checkout/i }));

        expect(window.open).toHaveBeenCalledWith(
            'https://example.com/store/checkout/?add-to-cart=1&quantity=1',
            '_blank',
            'noopener,noreferrer',
        );
        expect(saveProductEventMock).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'recommended_checkout_click',
            recommendationIntent: 'treatment_ready',
            metadata: expect.objectContaining({
                selectedProductIds: [1],
                productCount: 1,
            }),
        }));
    });

    it('tracks product link clicks for admin analytics', async () => {
        render(
            <ProductRecommendations
                plantType="Durian"
                disease="Leaf Spot"
                farmScale="tree"
                scanResult={{
                    id: 'scan-product-click',
                    status: 'confirmed',
                    resultState: 'confident_treatment',
                    healthStatus: 'unhealthy',
                    pathogenType: 'fungal',
                    confidence: 92,
                    symptoms: ['Leaf spots'],
                    productSearchTags: ['fungicide'],
                }}
            />,
        );

        await screen.findByText('Copper Guard');
        const productLink = screen
            .getAllByRole('link', { name: /view product/i })
            .find((link) => link.getAttribute('href') === 'https://example.com/products/copper-guard');
        fireEvent.click(productLink);

        expect(saveProductEventMock).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'product_click',
            recommendationIntent: 'treatment_ready',
            product: expect.objectContaining({
                id: 1,
                name: 'Copper Guard',
            }),
        }));
    });

    it('saves recommended products as a Daily Log draft', async () => {
        render(
            <ProductRecommendations
                plantType="Durian"
                disease="Leaf Spot"
                farmScale="tree"
                scanResult={{
                    id: 'scan-plan',
                    status: 'confirmed',
                    resultState: 'confident_treatment',
                    healthStatus: 'unhealthy',
                    pathogenType: 'fungal',
                    confidence: 92,
                    symptoms: ['Leaf spots'],
                    productSearchTags: ['fungicide'],
                }}
            />,
        );

        await screen.findByText('Copper Guard');
        fireEvent.click(screen.getByRole('button', { name: /save product plan/i }));

        expect(saveFollowUpDraftMock).toHaveBeenCalledWith(expect.objectContaining({
            activity_type: 'spray',
            chemical_name: 'Copper Guard',
            disease_name_observed: 'Leaf Spot',
        }));
        expect(saveFollowUpDraftMock.mock.calls[0][0].note).toContain('scan-plan');
        expect(navigateMock).toHaveBeenCalledWith('/profile?tab=notes&draft=scan-follow-up');
    });

    it('captures a consultation lead before opening WhatsApp', async () => {
        render(
            <ProductRecommendations
                plantType="Durian"
                disease="Leaf Spot"
                farmScale="tree"
                scanResult={{
                    id: 'scan-lead-1',
                    status: 'confirmed',
                    healthStatus: 'unhealthy',
                    pathogenType: 'fungal',
                    confidence: 92,
                    symptoms: ['Leaf spots'],
                    productSearchTags: ['fungicide'],
                }}
            />,
        );

        const consultationLink = await screen.findByRole('link', { name: /contact us for consultation/i });
        fireEvent.click(consultationLink);

        await waitFor(() => {
            expect(saveConsultationLeadMock).toHaveBeenCalledWith(expect.objectContaining({
                diagnosis: expect.objectContaining({
                    scanId: 'scan-lead-1',
                    plantType: 'Durian',
                    disease: 'Leaf Spot',
                    confidence: 92,
                }),
                recommendationIntent: 'treatment_ready',
                source: 'product_recommendations',
            }));
        });
        await waitFor(() => {
            expect(window.open).toHaveBeenCalledWith(
                expect.stringContaining('wa.me/60136667810'),
                '_blank',
                'noopener,noreferrer',
            );
        });
    });

    it('makes consultation primary when no safe disease-specific product match exists', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                diseaseControl: [],
                fertilizers: [],
                supplements: [],
                otherPopular: [],
                reasoning: '',
                fallbackMeta: {
                    used: true,
                    isExploration: false,
                    reason: 'No safe disease-specific product match was found.',
                },
                recommendationIntent: 'consultation_needed',
                consultation: {
                    phone: '+60136667810',
                    url: 'https://wa.me/60136667810?text=scan',
                    message: 'Scan ID: scan-999',
                    label: 'Contact us for consultation',
                    priority: 'primary',
                    reason: 'No safe disease-specific product match was found.',
                },
                storeUrl: 'https://example.com/store',
            }),
        });

        render(
            <ProductRecommendations
                plantType="Coconut"
                disease="Bud Rot"
                farmScale="tree"
                scanResult={{
                    id: 'scan-999',
                    status: 'confirmed',
                    healthStatus: 'unhealthy',
                    pathogenType: 'fungal',
                    confidence: 88,
                    symptoms: ['Spear leaf collapse'],
                    productSearchTags: ['bud-rot'],
                }}
            />,
        );

        expect(await screen.findByText('Consultation recommended')).toBeInTheDocument();
        expect(screen.getAllByText('No safe disease-specific product match was found.').length).toBeGreaterThan(0);
        expect(screen.getByText('No products found')).toBeInTheDocument();
        expect(screen.queryByText('Recommended Fertilizers')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /contact us for consultation/i })).toHaveAttribute('href', expect.stringContaining('wa.me/60136667810'));
    });

    it('offers consultation when the live catalog fails', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Catalog offline'));

        render(
            <ProductRecommendations
                plantType="Papaya"
                disease="Mealybug"
                farmScale="tree"
                scanResult={{
                    id: 'scan-error',
                    healthStatus: 'unhealthy',
                    pathogenType: 'pest',
                    symptoms: ['White patches'],
                    productSearchTags: ['pest-control'],
                }}
            />,
        );

        expect(await screen.findByText('Could not load products')).toBeInTheDocument();
        expect(screen.getByText('Catalog failed. Contact agronomy support.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /contact us for consultation/i })).toHaveAttribute('href', expect.stringContaining('wa.me/60136667810'));
    });
});
