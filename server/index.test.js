// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    getOrdersByIds: vi.fn(), getOrderStatus: vi.fn(), getOrdersByAppId: vi.fn(), createOrder: vi.fn(),
    analyze: vi.fn(), identify: vi.fn(), logTraining: vi.fn(),
}));
vi.mock('./services/aiService.js', () => ({
    identifyPlantWithPlantNet: mocks.identify, identifyPlantWithGPTVision: vi.fn(), analyzeWithGPT4Mini: mocks.analyze,
    askAI: vi.fn(), recommendProductTags: vi.fn(), generateAgronomistInsights: vi.fn(), generateTreatmentSOP: vi.fn(),
    parseNaturalLanguageLog: vi.fn(), generatePredictiveRisk: vi.fn(), localizeStoredAnalysisResult: vi.fn(),
    canRecommendTreatmentProducts: vi.fn(), enrichRecommendedProducts: vi.fn(), getProductRecommendationIntent: vi.fn(),
    buildProductConsultation: vi.fn(), PRODUCT_RECOMMENDATION_INTENTS: {},
}));
vi.mock('./services/wooCommerceService.js', () => ({
    getAllTags: vi.fn(), getAllCategories: vi.fn(), getProductsByTagIds: vi.fn(), getStoreUrl: vi.fn(),
    createOrder: mocks.createOrder, getOrdersByAppId: mocks.getOrdersByAppId,
    getOrderStatus: mocks.getOrderStatus, getOrdersByIds: mocks.getOrdersByIds, isWooCommerceEnabled: vi.fn(),
}));
vi.mock('./utils/dataCollector.js', () => ({ logTrainingData: mocks.logTraining, logFeedback: vi.fn() }));
vi.mock('./services/adminAnalyticsService.js', () => ({ getAdminReviewSummary: vi.fn(), verifyAdminRequest: vi.fn() }));
vi.mock('./services/diseaseProductRuleService.js', () => ({ getDiseaseProductRules: vi.fn() }));
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
