// @vitest-environment node
import { it, expect } from 'vitest';
import { buildAnalysisCacheKey } from './analysisCache.js';

it('varies by every diagnosis input and excludes the per-request scan ID', () => {
    const input = { treeImage: 'tree', leafImage: 'leaf', category: 'Durian', language: 'en', location: 'Johor', imageQuality: { sharpness: 80 } };
    const key = buildAnalysisCacheKey(input);
    for (const field of Object.keys(input)) {
        expect(buildAnalysisCacheKey({ ...input, [field]: field === 'imageQuality' ? { sharpness: 20 } : 'changed' })).not.toBe(key);
    }
    expect(buildAnalysisCacheKey({ ...input, scanId: 'new-scan' })).toBe(key);
    expect(buildAnalysisCacheKey({ ...input, treeImage: null, image: 'tree' })).toBe(key);
});
