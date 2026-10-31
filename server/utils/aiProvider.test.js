import { describe, expect, it } from 'vitest';
import { resolveAiProvider } from './aiProvider.js';

describe('AI provider configuration', () => {
    it('selects OpenRouter with the existing model and fallback', () => {
        const config = resolveAiProvider({ AI_PROVIDER:'openrouter', OPENROUTER_API_KEY:'dummy', OPENAI_API_KEY:'do-not-use' });
        expect(config).toEqual({ provider:'openrouter', apiKey:'dummy', baseURL:'https://openrouter.ai/api/v1', primaryModel:'openai/gpt-5.4-mini', fallbackModel:'openai/gpt-5-mini' });
    });
    it('never silently sends an OpenAI key to OpenRouter', () => {
        expect(resolveAiProvider({ AI_PROVIDER:'openrouter', OPENAI_API_KEY:'dummy' }).apiKey).toBeUndefined();
    });
    it('retains explicitly selected direct OpenAI configuration', () => {
        expect(resolveAiProvider({ AI_PROVIDER:'openai', OPENAI_API_KEY:'dummy' })).toMatchObject({ provider:'openai', apiKey:'dummy', primaryModel:'gpt-5.4-mini', fallbackModel:'gpt-5-mini' });
    });
    it('does not duplicate a provider prefix and rejects invalid providers', () => {
        expect(resolveAiProvider({ AI_PROVIDER:'openrouter', OPENAI_MODEL:'openai/gpt-5.4-mini' }).primaryModel).toBe('openai/gpt-5.4-mini');
        expect(() => resolveAiProvider({ AI_PROVIDER:'other' })).toThrow();
    });
});
