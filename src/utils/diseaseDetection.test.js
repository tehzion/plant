import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    analyzePlantDisease,
    getImageQualityGuidanceFromMetrics,
    warmAnalysisService,
} from './diseaseDetection.js';

const jsonResponse = (body, ok = true, status = ok ? 200 : 503) => ({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('image quality guidance', () => {
    it('accepts images without quality flags', () => {
        expect(getImageQualityGuidanceFromMetrics({
            brightness: 120,
            blurScore: 22,
            greenRatio: 0.18,
            flags: [],
        })).toMatchObject({
            accepted: true,
            blocking: false,
            code: '',
        });
    });

    it('blocks dark, blurry, and distant plant photos before scan', () => {
        expect(getImageQualityGuidanceFromMetrics({ flags: ['too_dark'] })).toMatchObject({
            accepted: false,
            code: 'IMAGE_TOO_DARK',
            messageKey: 'home.errorImageTooDark',
        });

        expect(getImageQualityGuidanceFromMetrics({ flags: ['too_blurry'] })).toMatchObject({
            accepted: false,
            code: 'IMAGE_TOO_BLURRY',
            messageKey: 'home.errorImageTooBlurry',
        });

        expect(getImageQualityGuidanceFromMetrics({ flags: ['too_little_leaf'] })).toMatchObject({
            accepted: false,
            code: 'IMAGE_TOO_LITTLE_LEAF',
            messageKey: 'home.errorImageTooLittleLeaf',
        });
    });
});

describe('analysis service reliability helpers', () => {
    it('retries health warm-up when the first request cannot reach Render', async () => {
        const fetchMock = vi.fn()
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await warmAnalysisService({ attempts: 2, timeoutMs: 1000, delayMs: 0 });

        expect(result.ok).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][0]).toBe('/api/health');
    });

    it('warms the service and retries analysis once after a connection-style failure', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
            .mockResolvedValueOnce(jsonResponse({ disease: 'Leaf spot', status: 'confirmed' }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await analyzePlantDisease('data:image/jpeg;base64,abc', 'Cili');

        expect(result).toMatchObject({ disease: 'Leaf spot' });
        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
            '/api/health',
            '/api/analyze',
            '/api/health',
            '/api/analyze',
        ]);
    });
});
