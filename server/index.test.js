// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    getOrdersByIds: vi.fn(), getOrderStatus: vi.fn(), getOrdersByAppId: vi.fn(), createOrder: vi.fn(),
    analyze: vi.fn(), identify: vi.fn(), logTraining: vi.fn(),
    recommendProductTags: vi.fn(), canRecommendTreatmentProducts: vi.fn(), enrichRecommendedProducts: vi.fn(),
    getProductRecommendationIntent: vi.fn(), buildProductConsultation: vi.fn(),
    getAllTags: vi.fn(), getAllCategories: vi.fn(), getProductsByTagIds: vi.fn(), getStoreUrl: vi.fn(),
    isWooCommerceEnabled: vi.fn(), getDiseaseProductRules: vi.fn(),
}));
vi.mock('./services/aiService.js', () => ({
    identifyPlantWithPlantNet: mocks.identify, identifyPlantWithGPTVision: vi.fn(), analyzeWithGPT4Mini: mocks.analyze,
    askAI: vi.fn(), recommendProductTags: mocks.recommendProductTags, generateAgronomistInsights: vi.fn(), generateTreatmentSOP: vi.fn(),
    parseNaturalLanguageLog: vi.fn(), generatePredictiveRisk: vi.fn(), localizeStoredAnalysisResult: vi.fn(),
    canRecommendTreatmentProducts: mocks.canRecommendTreatmentProducts, enrichRecommendedProducts: mocks.enrichRecommendedProducts, getProductRecommendationIntent: mocks.getProductRecommendationIntent,
    buildProductConsultation: mocks.buildProductConsultation, PRODUCT_RECOMMENDATION_INTENTS: {
        SUPPORT_ONLY: 'support_only',
        CONSULTATION_NEEDED: 'consultation_needed',
        TREATMENT_READY: 'treatment_ready',
        HEALTHY_MAINTENANCE: 'healthy_maintenance',
    },
}));
vi.mock('./services/wooCommerceService.js', () => ({
    getAllTags: mocks.getAllTags, getAllCategories: mocks.getAllCategories, getProductsByTagIds: mocks.getProductsByTagIds, getStoreUrl: mocks.getStoreUrl,
    createOrder: mocks.createOrder, getOrdersByAppId: mocks.getOrdersByAppId,
    getOrderStatus: mocks.getOrderStatus, getOrdersByIds: mocks.getOrdersByIds, isWooCommerceEnabled: mocks.isWooCommerceEnabled,
}));
vi.mock('./utils/dataCollector.js', () => ({ logTrainingData: mocks.logTraining, logFeedback: vi.fn() }));
vi.mock('./services/adminAnalyticsService.js', () => ({ getAdminReviewSummary: vi.fn(), verifyAdminRequest: vi.fn() }));
vi.mock('./services/diseaseProductRuleService.js', () => ({ getDiseaseProductRules: mocks.getDiseaseProductRules }));
let app;
let processListeners;
beforeAll(async () => {
    vi.stubEnv('VERCEL', '1'); vi.stubEnv('OPENAI_API_KEY', 'test-only-placeholder');
    processListeners = new Map(['uncaughtException', 'unhandledRejection'].map((event) => [event, process.listeners(event)]));
    app = (await import('./index.js')).default;
});
afterAll(() => {
    for (const [event, previous] of processListeners) {
        for (const listener of process.listeners(event)) if (!previous.includes(listener)) process.removeListener(event, listener);
    }
    vi.unstubAllEnvs();
});
beforeEach(() => {
    vi.clearAllMocks();
    mocks.logTraining.mockResolvedValue(true);
    mocks.identify.mockResolvedValue({ scientificName: 'Durio zibethinus' });
    mocks.analyze.mockResolvedValue({ disease: 'Leaf spot', additionalNotes: 'Notes' });
});
const invoke = async (path, req) => {
    const layer = app._router.stack.find((layer) => layer.route?.path === path);
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();
    await layer.route.stack.at(-1).handle(req, response, next);
    if (next.mock.calls[0]?.[0]) throw next.mock.calls[0][0];
    return response;
};
const order = (id, guestId) => ({ id, status: 'processing', billing: { email: 'private@example.com' },
    meta_data: [{ key: '_antigravity_app_id', value: guestId }] });
describe('order route ownership', () => {
    it('mounts session enforcement for all order lookup routes', () => {
        expect(app._router.stack.some((layer) => layer.handle.name === 'requireOrderSession')).toBe(true);
    });
    it('filters arbitrary IDs by the verified owner before serializing', async () => {
        mocks.getOrdersByIds.mockResolvedValue([order(1, 'owner'), order(2, 'other')]);
        const res = await invoke('/api/orders/user/:appId', { params: { appId: 'owner' }, query: { ids: '1,2' }, orderSession: { guestId: 'owner' } });
        expect(res.json).toHaveBeenCalledWith([expect.objectContaining({ id: 1 })]);
        expect(res.json.mock.calls[0][0][0]).not.toHaveProperty('billing');
    });
    it('denies another guest identity and hides another guest single order', async () => {
        const denied = await invoke('/api/orders/user/:appId', { params: { appId: 'other' }, query: {}, orderSession: { guestId: 'owner' } });
        expect(denied.status).toHaveBeenCalledWith(403);
        expect(mocks.getOrdersByAppId).not.toHaveBeenCalled();
        mocks.getOrderStatus.mockResolvedValue(order(2, 'other'));
        const single = await invoke('/api/orders/:orderId', { params: { orderId: '2' }, orderSession: { guestId: 'owner' } });
        expect(single.status).toHaveBeenCalledWith(404);
    });
    it('uses verified ownership instead of a supplied guest ID when creating orders', async () => {
        mocks.createOrder.mockResolvedValue(order(1, 'owner'));
        await invoke('/api/orders', { body: { items: [{ productId: 1, quantity: 1 }], guestId: 'other' }, orderSession: { guestId: 'owner' } });
        expect(mocks.createOrder).toHaveBeenCalledWith(expect.objectContaining({ guestId: 'owner' }));
    });
});
describe('diagnosis cache and feedback identity', () => {
    it('returns the current scan ID on cache hits and logs matching feedback IDs', async () => {
        const body = { treeImage: 'unique-tree-1', leafImage: 'leaf-a', category: 'Durian', language: 'en', scanId: 'first' };
        await invoke('/api/analyze', { body });
        const cached = await invoke('/api/analyze', { body: { ...body, scanId: 'second' } });
        expect(mocks.analyze).toHaveBeenCalledOnce();
        expect(cached.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'second', cached: true }));
        expect(mocks.logTraining).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'second' }));
        await invoke('/api/analyze', { body: { ...body, leafImage: 'leaf-b', scanId: 'third' } });
        expect(mocks.analyze).toHaveBeenCalledTimes(2);
    });
});

describe('product search section grouping', () => {
    beforeEach(() => {
        mocks.isWooCommerceEnabled.mockReturnValue(true);
        mocks.getAllTags.mockResolvedValue([
            { id: 1, name: 'Fungicide' },
            { id: 2, name: 'NPK fertilizer' },
            { id: 3, name: 'Trace element supplement' },
        ]);
        mocks.getAllCategories.mockResolvedValue([
            { id: 10, name: 'Disease Control' },
            { id: 20, name: 'Fertilizer' },
            { id: 30, name: 'Supplements' },
        ]);
        mocks.getDiseaseProductRules.mockResolvedValue([]);
        mocks.recommendProductTags.mockResolvedValue({
            treatmentTagIds: [1],
            treatmentCategoryIds: [10],
            fertilizerTagIds: [2],
            fertilizerCategoryIds: [20],
            supplementTagIds: [3],
            supplementCategoryIds: [30],
            reasoning: 'test grouping',
        });
        mocks.getProductsByTagIds.mockImplementation(async (tagIds = []) => {
            if (tagIds.includes(1)) return [{ id: 101, name: 'Fungicide' }];
            if (tagIds.includes(2)) return [{ id: 102, name: 'NPK fertilizer' }];
            if (tagIds.includes(3)) return [{ id: 103, name: 'Trace supplement' }];
            return [];
        });
        mocks.canRecommendTreatmentProducts.mockReturnValue(true);
        mocks.enrichRecommendedProducts.mockImplementation((products, _diagnosis, role) => (
            products.map((product) => ({ ...product, recommendationRole: role }))
        ));
        mocks.getProductRecommendationIntent.mockImplementation((_diagnosis, counts) => (
            counts.treatmentCount > 0 ? 'treatment_ready' : 'healthy_maintenance'
        ));
        mocks.buildProductConsultation.mockReturnValue(null);
        mocks.getStoreUrl.mockReturnValue('https://example.com/store');
    });

    it.each([
        {
            name: 'disease-only',
            diagnosis: {
                disease: 'Fungal leaf spot', diseaseCategory: 'fungal', pathogenType: 'fungal',
                status: 'confirmed', resultState: 'confident_treatment', confidence: 92, healthStatus: 'unhealthy',
            },
            expected: { diseaseControl: 1, fertilizers: 0, supplements: 0 },
        },
        {
            name: 'nutrition-only',
            diagnosis: {
                disease: 'Potassium deficiency', diseaseCategory: 'nutrient', resultState: 'possible_nutrient_issue',
                nutritionalIssues: { status: 'confirmed', deficientNutrients: ['Potassium'] }, healthStatus: 'unhealthy',
            },
            expected: { diseaseControl: 0, fertilizers: 1, supplements: 1 },
        },
        {
            name: 'healthy',
            diagnosis: { disease: 'Healthy Plant', resultState: 'healthy', healthStatus: 'healthy' },
            expected: { diseaseControl: 0, fertilizers: 1, supplements: 1 },
        },
        {
            name: 'review',
            diagnosis: { disease: 'Unknown', resultState: 'needs_closer_photo', requiresRetake: true, healthStatus: 'unhealthy' },
            expected: { diseaseControl: 0, fertilizers: 0, supplements: 0 },
        },
        {
            name: 'mixed',
            diagnosis: {
                disease: 'Fungal leaf spot', diseaseCategory: 'fungal', pathogenType: 'fungal',
                status: 'confirmed', resultState: 'confident_treatment', confidence: 92, healthStatus: 'unhealthy',
                nutritionalIssues: { status: 'possible', possibleNutrients: ['Magnesium'] },
            },
            expected: { diseaseControl: 1, fertilizers: 1, supplements: 1 },
        },
    ])('returns correctly grouped products for $name scans', async ({ diagnosis, expected }) => {
        const response = await invoke('/api/products/search', { body: { diagnosis, language: 'en' } });
        const body = response.json.mock.calls[0][0];

        expect(body.diseaseControl).toHaveLength(expected.diseaseControl);
        expect(body.fertilizers).toHaveLength(expected.fertilizers);
        expect(body.supplements).toHaveLength(expected.supplements);
        body.diseaseControl.forEach((product) => expect(product.recommendationRole).toBe('treatment'));
        body.fertilizers.forEach((product) => expect(product.recommendationRole).toBe('fertilizer'));
        body.supplements.forEach((product) => expect(product.recommendationRole).toBe('supplement'));
    });
});
