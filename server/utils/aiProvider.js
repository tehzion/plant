import dotenv from 'dotenv';
import { fileURLToPath, URL as NodeURL } from 'node:url';

// Load the local overrides before model constants are initialized by imports.
dotenv.config({ path: fileURLToPath(new NodeURL('../../.env.local', import.meta.url)) });
dotenv.config();

const qualify = (model, provider) => provider === 'openrouter' && !model.includes('/') ? `openai/${model}` : model;

/** OpenRouter uses OpenAI-compatible Chat Completions, with provider/model IDs. */
export const resolveAiProvider = (env = process.env) => {
    const provider = String(env.AI_PROVIDER || 'openai').trim().toLowerCase();
    if (!['openrouter', 'openai'].includes(provider)) throw new Error('AI_PROVIDER must be openrouter or openai.');
    const primaryModel = qualify(String(env.OPENAI_MODEL || 'gpt-5.4-mini').trim(), provider);
    const fallbackModel = qualify(String(env.OPENAI_FALLBACK_MODEL || 'gpt-5-mini').trim(), provider);
    return {
        provider,
        apiKey: provider === 'openrouter' ? env.OPENROUTER_API_KEY : env.OPENAI_API_KEY,
        baseURL: provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : undefined,
        primaryModel,
        fallbackModel,
    };
};

export const isAiProviderConfigured = () => Boolean(resolveAiProvider().apiKey);
