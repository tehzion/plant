// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { validateApiRequest } from './requestValidation.js';
const validate = (path, body) => {
    const next = vi.fn(); validateApiRequest({ method: 'POST', path, body }, {}, next);
    return next.mock.calls[0]?.[0];
};
describe('API input validation', () => {
    it('rejects malformed images, incorrect image signatures, and excessive images', () => {
        for (const treeImage of [42, 'data:image/jpeg;base64,bm90LWltYWdl', 'data:image/svg+xml;base64,abc', 'x'.repeat(8 * 1024 * 1024 + 1)]) {
            expect(validate('/analyze', { treeImage }).status).toBe(400);
        }
        expect(validate('/analyze', { treeImage: 'data:image/jpeg;base64,/9j/AA==' })).toBeUndefined();
    });
    it('accepts a well-formed consent answer and rejects anything else', () => {
        const treeImage = 'data:image/jpeg;base64,/9j/AA==';
        expect(validate('/analyze', { treeImage, dataConsent: { aiImprovement: true, version: '2026-11-v1' } })).toBeUndefined();
        expect(validate('/analyze', { treeImage, dataConsent: { aiImprovement: 'yes', version: '2026-11-v1' } }).status).toBe(400);
        expect(validate('/analyze', { treeImage, dataConsent: 'true' }).status).toBe(400);
    });
    it('bounds prompts and feedback and rejects unsupported languages', () => {
        expect(validate('/ask', { question: 123 }).status).toBe(400);
        expect(validate('/ask', { question: 'x'.repeat(4001) }).status).toBe(400);
        expect(validate('/ask', { question: 'hello', language: 'unknown' }).status).toBe(400);
        expect(validate('/feedback', { scanId: 'scan', rating: 6 }).status).toBe(400);
        expect(validate('/feedback', { scanId: 'scan', wasCorrect: 'yes' }).status).toBe(400);
    });
    it('accepts only a well-formed vote on an assistant answer', () => {
        expect(validate('/assistant-feedback', { rating: 'up', question: 'Why yellow?', answer: 'Check nitrogen.', page: 'home' })).toBeUndefined();
        expect(validate('/assistant-feedback', { rating: 5, answer: 'Check nitrogen.' }).status).toBe(400);
        expect(validate('/assistant-feedback', { rating: 'down' }).status).toBe(400);
        expect(validate('/assistant-feedback', { rating: 'down', answer: 'x'.repeat(3001) }).status).toBe(400);
        expect(validate('/assistant-feedback', { rating: 'down', answer: 'ok', scanStatus: 'cured' }).status).toBe(400);
    });
    it('rejects invalid order quantities and excessive non-image payloads', () => {
        expect(validate('/orders', { items: [{ productId: 1, quantity: -1 }] }).status).toBe(400);
        expect(validate('/farm/predict', { logs: ['x'.repeat(256 * 1024)] }).status).toBe(413);
    });
});
