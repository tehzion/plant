// Resolves which OpenAI-compatible endpoint the server talks to.
// OpenRouter is used when OPENROUTER_API_KEY is set, or when OPENAI_API_KEY
// holds an OpenRouter key (sk-or-...). Otherwise requests go to OpenAI directly.

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const DEFAULT_PRIMARY_MODEL = 'gpt-5.4-mini';
const DEFAULT_FALLBACK_MODEL = 'gpt-5-mini';

export const getAIApiKey = () => process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';

export const hasAIApiKey = () => Boolean(getAIApiKey());

export const isOpenRouter = () => {
    if (process.env.OPENROUTER_API_KEY) return true;
    if (/openrouter\.ai/i.test(process.env.OPENAI_BASE_URL || '')) return true;
    return /^sk-or-/i.test(process.env.OPENAI_API_KEY || '');
};

export const getAIBaseURL = () => {
    if (process.env.OPENAI_BASE_URL) return process.env.OPENAI_BASE_URL;
    return isOpenRouter() ? OPENROUTER_BASE_URL : undefined;
};

// OpenRouter model ids are namespaced by vendor ("openai/gpt-5-mini").
const resolveModelId = (model) => {
    if (!isOpenRouter() || model.includes('/')) return model;
    return `openai/${model}`;
};

export const getPrimaryModel = () => resolveModelId(process.env.OPENAI_MODEL || DEFAULT_PRIMARY_MODEL);
export const getFallbackModel = () => resolveModelId(process.env.OPENAI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL);

// Strips the vendor prefix so capability checks match "openai/gpt-5-mini" like "gpt-5-mini".
export const getBaseModelName = (model = '') => String(model).split('/').pop();

export const getAIClientOptions = () => {
    const options = { apiKey: getAIApiKey() };
    const baseURL = getAIBaseURL();
    if (baseURL) options.baseURL = baseURL;
    if (isOpenRouter()) {
        options.defaultHeaders = {
            'HTTP-Referer': process.env.FRONTEND_URL || 'https://kanb-plant.app',
            'X-Title': 'Agropreneur Smart Plant Detector',
        };
    }
    return options;
};
