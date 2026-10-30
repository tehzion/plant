import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAIClientOptions, getBaseModelName, getFallbackModel, getPrimaryModel, hasAIApiKey, isOpenRouter } from './aiProvider.js';

describe('aiProvider', () => {
    afterEach(() => vi.unstubAllEnvs());

    const stub = (env) => {
        for (const key of ['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL', 'OPENAI_FALLBACK_MODEL']) {
            vi.stubEnv(key, env[key] ?? '');
        }
    };

    it('talks to OpenAI directly with a plain OpenAI key', () => {
        stub({ OPENAI_API_KEY: 'sk-proj-test' });
        expect(isOpenRouter()).toBe(false);
        expect(getAIClientOptions()).toEqual({ apiKey: 'sk-proj-test' });
        expect(getPrimaryModel()).toBe('gpt-5.4-mini');
    });

    it('routes an sk-or- key stored in OPENAI_API_KEY through OpenRouter', () => {
        stub({ OPENAI_API_KEY: 'sk-or-v1-test' });
        expect(isOpenRouter()).toBe(true);
        expect(getAIClientOptions().baseURL).toBe('https://openrouter.ai/api/v1');
        expect(getPrimaryModel()).toBe('openai/gpt-5.4-mini');
        expect(getFallbackModel()).toBe('openai/gpt-5-mini');
    });

    it('prefers OPENROUTER_API_KEY and keeps vendor-prefixed models as given', () => {
        stub({ OPENROUTER_API_KEY: 'sk-or-v1-test', OPENAI_MODEL: 'google/gemini-2.5-flash' });
        expect(hasAIApiKey()).toBe(true);
        expect(getAIClientOptions().apiKey).toBe('sk-or-v1-test');
        expect(getPrimaryModel()).toBe('google/gemini-2.5-flash');
    });

    it('strips vendor prefixes for capability checks', () => {
        expect(getBaseModelName('openai/gpt-5-mini')).toBe('gpt-5-mini');
        expect(getBaseModelName('gpt-5-mini')).toBe('gpt-5-mini');
    });

    it('reports a missing key', () => {
        stub({});
        expect(hasAIApiKey()).toBe(false);
    });
});
