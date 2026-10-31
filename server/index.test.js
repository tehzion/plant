// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    getOrdersByIds: vi.fn(), getOrderStatus: vi.fn(), getOrdersByAppId: vi.fn(), createOrder: vi.fn(),
    analyze: vi.fn(), identify: vi.fn(), identifyGpt: vi.fn(), logTraining: vi.fn(), logFeedback: vi.fn(), withdrawImages: vi.fn(),
    buildKeywordProductRecommendation: vi.fn(), canRecommendTreatmentProducts: vi.fn(), enrichRecommendedProducts: vi.fn(),
    getProductRecommendationIntent: vi.fn(), buildProductConsultation: vi.fn(),
    getAllTags: vi.fn(), getAllCategories: vi.fn(), getProductsByTagIds: vi.fn(), getStoreUrl: vi.fn(),
    isWooCommerceEnabled: vi.fn(), getDiseaseProductRules: vi.fn(), saveSnapshot: vi.fn(async () => true),
}));
vi.mock('./services/aiService.js', () => ({
    identifyPlantWithPlantNet: mocks.identify, identifyPlantWithGPTVision: mocks.identifyGpt, analyzeWithGPT4Mini: mocks.analyze,
    askAI: vi.fn(), buildKeywordProductRecommendation: mocks.buildKeywordProductRecommendation, generateAgronomistInsights: vi.fn(), generateTreatmentSOP: vi.fn(),
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
vi.mock('./utils/dataCollector.js', () => ({ logTrainingData: mocks.logTraining, logFeedback: mocks.logFeedback, withdrawTrainingImages: mocks.withdrawImages }));
vi.mock('./services/adminAnalyticsService.js', () => ({ getAdminReviewSummary: vi.fn(), verifyAdminRequest: vi.fn() }));
vi.mock('./services/recommendationSnapshotService.js', async (importOriginal) => ({ ...(await importOriginal()), saveRecommendationSnapshot: mocks.saveSnapshot }));
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
    mocks.logFeedback.mockResolvedValue(true);
    mocks.identifyGpt.mockResolvedValue(null);
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
    it('passes the farmer consent answer and analysis duration to the audit log', async () => {
        const dataConsent = { aiImprovement: true, version: '2026-11-v1' };
        await invoke('/api/analyze', { body: { treeImage: 'unique-tree-consent', category: 'Durian', language: 'en', scanId: 'consent-1', dataConsent } });
        expect(mocks.logTraining).toHaveBeenLastCalledWith(expect.objectContaining({
            id: 'consent-1', dataConsent, metadata: expect.objectContaining({ durationMs: expect.any(Number) }),
        }));
    });
});

describe('assessment and feedback attribution', () => {
    const scanId = '0b6f2c1e-9d4a-4c1b-8e2f-3a5b6c7d8e9f';
    const analyze = (identity, id = scanId, tree = `tree-${id}`) => invoke('/api/analyze', {
        body: { treeImage: tree, category: 'Durian', language: 'en', scanId: id }, aiIdentity: identity,
    });

    it('binds the audit record to a hashed caller identity and returns a feedback capability', async () => {
        const res = await analyze('guest:farmer-a');
        const payload = res.json.mock.calls[0][0];
        expect(payload.feedbackToken).toMatch(/^v1\.[a-f0-9]{40}\./);
        const logged = mocks.logTraining.mock.calls[0][0];
        expect(logged.ownerHash).toMatch(/^[a-f0-9]{40}$/);
        expect(JSON.stringify(logged)).not.toContain('farmer-a');
    });

    it('accepts feedback carrying the capability for that scan and attributes it server-side', async () => {
        const { feedbackToken } = (await analyze('guest:farmer-a')).json.mock.calls[0][0];
        const res = await invoke('/api/feedback', { body: { scanId, wasCorrect: false, feedbackToken }, headers: {}, get: () => '' });
        expect(res.status).not.toHaveBeenCalledWith(403);
        expect(mocks.logFeedback).toHaveBeenCalledWith(
            expect.objectContaining({ scanId, wasCorrect: false }),
            expect.objectContaining({ source: 'farmer', verifiedBy: 'scan_capability', submitterHash: expect.stringMatching(/^[a-f0-9]{40}$/) }),
        );
        expect(mocks.logFeedback.mock.calls[0][0]).not.toHaveProperty('feedbackToken');
    });

    it('rejects anonymous feedback and capabilities issued for a different scan', async () => {
        const anonymous = await invoke('/api/feedback', { body: { scanId, wasCorrect: true }, headers: {}, get: () => '' });
        expect(anonymous.status).toHaveBeenCalledWith(403);
        const otherScan = '1c7e3d2f-0e5b-4d2c-9f3a-4b6c7d8e9f0a';
        const { feedbackToken } = (await analyze('guest:farmer-b', otherScan, 'tree-b2')).json.mock.calls[0][0];
        const replayed = await invoke('/api/feedback', { body: { scanId, wasCorrect: true, feedbackToken }, headers: {}, get: () => '' });
        expect(replayed.status).toHaveBeenCalledWith(403);
        const forged = await invoke('/api/feedback', { body: { scanId, wasCorrect: true, feedbackToken: `v1.${'a'.repeat(40)}.forged` }, headers: {}, get: () => '' });
        expect(forged.status).toHaveBeenCalledWith(403);
        expect(mocks.logFeedback).not.toHaveBeenCalled();
    });

    it('lets only the device that ran a scan withdraw its photos', async () => {
        mocks.withdrawImages.mockResolvedValue({ removed: 2 });
        const { feedbackToken } = (await analyze('guest:farmer-a')).json.mock.calls[0][0];
        const withdraw = (body) => invoke('/api/scans/:scanId/withdraw-photos', { params: { scanId }, body, headers: {}, get: () => '' });
        const anonymous = await withdraw({});
        expect(anonymous.status).toHaveBeenCalledWith(403);
        const otherScan = '2d8f4e3a-1f6c-4e3d-8a4b-5c7d8e9f0a1b';
        const { feedbackToken: otherToken } = (await analyze('guest:farmer-b', otherScan, 'tree-b3')).json.mock.calls[0][0];
        expect((await withdraw({ feedbackToken: otherToken })).status).toHaveBeenCalledWith(403);
        expect(mocks.withdrawImages).not.toHaveBeenCalled();
        const allowed = await withdraw({ feedbackToken });
        expect(mocks.withdrawImages).toHaveBeenCalledWith(scanId);
        expect(allowed.json).toHaveBeenCalledWith({ withdrawn: true, removedPhotos: 2 });
    });
});

describe('AI provider failure handling', () => {
    it('uses a successful PlantNet match without invoking the identification fallback', async () => {
        mocks.identify.mockResolvedValueOnce({ scientificName: 'Durio zibethinus', confidence: 95, source: 'PlantNet' });
        const res = await invoke('/api/analyze', { body: { treeImage: 'plantnet-success-unique', category: 'Durian', language: 'en' } });
        expect(mocks.identifyGpt).not.toHaveBeenCalled();
        expect(mocks.analyze).toHaveBeenCalledOnce();
        expect(mocks.logTraining).toHaveBeenCalledOnce();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ identificationSource: 'PlantNet' }));
    });

    it('reports a provider outage as an unavailable service, not a timeout, and logs nothing', async () => {
        mocks.analyze.mockRejectedValueOnce(Object.assign(new Error('upstream 500'), { status: 500 }));
        const res = await invoke('/api/analyze', { body: { treeImage: 'provider-down', category: 'Durian', language: 'ms' } });
        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'AI_PROVIDER_UNAVAILABLE', retryable: true }));
        expect(res.json.mock.calls[0][0].message).toMatch(/AI/);
        expect(mocks.logTraining).not.toHaveBeenCalled();
    });

    it('reports an unusable model response as invalid output', async () => {
        mocks.analyze.mockRejectedValueOnce(Object.assign(new Error('schema'), { code: 'AI_RESPONSE_INVALID' }));
        const res = await invoke('/api/analyze', { body: { treeImage: 'bad-json', category: 'Durian', language: 'en' } });
        expect(res.status).toHaveBeenCalledWith(502);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'AI_RESPONSE_INVALID' }));
    });

    it('falls back to the multimodal model when PlantNet fails and still analyses', async () => {
        mocks.identify.mockResolvedValueOnce(null);
        mocks.identifyGpt.mockResolvedValueOnce({ isPlant: true, scientificName: 'Durio zibethinus', confidence: 50 });
        const res = await invoke('/api/analyze', { body: { treeImage: 'plantnet-down', category: 'Durian', language: 'en' } });
        expect(mocks.identifyGpt).toHaveBeenCalledOnce();
        expect(mocks.analyze).toHaveBeenCalledOnce();
        expect(mocks.logTraining).toHaveBeenCalledOnce();
        expect(mocks.analyze.mock.calls[0][0]).toMatchObject({ source: 'GPT-Vision' });
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ identificationSource: 'GPT-Vision' }));
    });

    it('aborts a timed-out PlantNet request and performs one fallback assessment', async () => {
        vi.useFakeTimers();
        try {
            let plantNetSignal;
            mocks.identify.mockImplementationOnce((_image, { signal }) => {
                plantNetSignal = signal;
                return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
            });
            mocks.identifyGpt.mockResolvedValueOnce({ isPlant: true, scientificName: 'Durio zibethinus', confidence: 50 });
            const pending = invoke('/api/analyze', { body: { treeImage: 'plantnet-timeout-unique', category: 'Durian', language: 'en' } });
            await vi.advanceTimersByTimeAsync(12001);
            const res = await pending;
            expect(plantNetSignal.aborted).toBe(true);
            expect(mocks.identifyGpt).toHaveBeenCalledOnce();
            expect(mocks.analyze).toHaveBeenCalledOnce();
            expect(mocks.logTraining).toHaveBeenCalledOnce();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ identificationSource: 'GPT-Vision' }));
        } finally { vi.useRealTimers(); }
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
        mocks.buildKeywordProductRecommendation.mockReturnValue({
            treatmentTagIds: [1],
            treatmentCategoryIds: [10],
            fertilizerTagIds: [2],
            fertilizerCategoryIds: [20],
            supplementTagIds: [3],
            supplementCategoryIds: [30],
            reasoning: 'test grouping',
            keywords: {
                treatment: ['fungicide'],
                fertilizer: ['fertilizer'],
                supplement: ['supplement'],
            },
            searchTerms: {
                treatment: ['fungicide'],
                fertilizer: ['fertilizer'],
                supplement: ['supplement'],
            },
        });
        mocks.getProductsByTagIds.mockImplementation(async (tagIds = []) => {
            if (tagIds.includes(1)) return [
                { id: 101, name: 'Copper Fungicide 50WP', description: 'Copper-based fungicide for leaf spot and anthracnose on various crops. Follow the label.' },
                { id: 104, name: 'Fungicide' },
                { id: 105, name: 'Glyphosate Herbicide', description: 'Systemic herbicide for weed control around plantations.' },
            ];
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
        body.diseaseControl.forEach((product) => {
            expect(product.eligibility.status).toBe('eligible');
            expect(product.recommendationReason).toMatch(/Listed for/);
        });
    });

    it('separates unverified matches into catalogue discovery and drops unsuitable products', async () => {
        const diagnosis = {
            disease: 'Fungal leaf spot', diseaseCategory: 'fungal', pathogenType: 'fungal', plantType: 'Durian',
            status: 'confirmed', resultState: 'confident_treatment', confidence: 92, healthStatus: 'unhealthy',
        };
        const body = (await invoke('/api/products/search', { body: { diagnosis, language: 'en' } })).json.mock.calls[0][0];
        expect(body.diseaseControl.map((product) => product.id)).toEqual([101]);
        expect(body.catalogueDiscovery.map((product) => product.id)).toEqual([104]);
        expect(body.catalogueDiscovery[0]).toMatchObject({ discoveryOnly: true, eligibility: { status: 'needs_verification' } });
        expect(body.eligibilitySummary).toEqual({ eligibleTreatments: 1, discoveryOnly: 1, excludedAsUnsuitable: 1 });
        expect(JSON.stringify(body)).not.toContain('Glyphosate');
    });

    it('records the shown products on the scan only for a valid scan capability', async () => {
        const { createScanCapability } = await import('./utils/scanCapability.js');
        const diagnosis = { disease: 'Healthy Plant', resultState: 'healthy', healthStatus: 'healthy' };
        const feedbackToken = createScanCapability('scan-shown-1', 'guest:abc');

        await invoke('/api/products/search', { body: { diagnosis, language: 'en', scanId: 'scan-shown-1', feedbackToken } });
        expect(mocks.saveSnapshot).toHaveBeenCalledWith(expect.objectContaining({
            scanId: 'scan-shown-1',
            snapshot: expect.objectContaining({ fertilizer: [expect.objectContaining({ id: 102 })] }),
        }));

        mocks.saveSnapshot.mockClear();
        await invoke('/api/products/search', { body: { diagnosis, language: 'en', scanId: 'scan-other', feedbackToken } });
        await invoke('/api/products/search', { body: { diagnosis, language: 'en' } });
        expect(mocks.saveSnapshot).not.toHaveBeenCalled();
    });
});
