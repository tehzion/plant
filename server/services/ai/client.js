// The AI provider client: chat completions, JSON calls and timeouts.
// Split out of aiService.js; aiService.js re-exports everything for existing callers.
import { resolveAiProvider } from '../../utils/aiProvider.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { withAbortableTimeout } from '../../utils/requestTimeout.js';
import { recordAiUsage } from '../../utils/aiUsage.js';
import { cleanJsonString } from './shared.js';

dotenv.config();
let openaiClient = null;
const getOpenAIClient = () => {
    const config = resolveAiProvider();
    if (!config.apiKey) {
        const error = new Error('AI provider API key is missing on the server.');
        error.status = 503;
        throw error;
    }

    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: config.apiKey,
            ...(config.baseURL ? { baseURL: config.baseURL } : {}),
        });
    }

    return openaiClient;
};
export const OPENAI_PRIMARY_MODEL = resolveAiProvider().primaryModel;
export const OPENAI_FALLBACK_MODEL = resolveAiProvider().fallbackModel;
const usesModernCompletionLimit = (model = '') => /^(gpt-5|o\d|o[1-9]|gpt-oss)/i.test(String(model).split('/').pop());
const supportsTemperature = (model = '') => !/^(gpt-5|o\d|o[1-9])/i.test(String(model).split('/').pop());
/**
 * GPT-5 / O-series compatible chat completion wrapper.
 *
 * - Uses `max_completion_tokens` for GPT-5 and O-series models
 *   (these reject the legacy `max_tokens` parameter).
 * - Omits `temperature` for GPT-5 / O-series models, which do not
 *   accept that parameter and will throw a 400 if it is present.
 * - All other options are forwarded unchanged.
 */
export const createChatCompletion = ({ model, messages, maxTokens, temperature, signal, ...options }) => {
    const request = {
        ...options,
        model,
        messages,
        ...(usesModernCompletionLimit(model)
            ? { max_completion_tokens: maxTokens }
            : { max_tokens: maxTokens }),
    };

    if (typeof temperature === 'number' && supportsTemperature(model)) {
        request.temperature = temperature;
    }

    // Ask OpenRouter to include the charged cost in the usage block.
    if (resolveAiProvider().provider === 'openrouter') {
        request.usage = { include: true };
    }

    // The abort signal is a request option, not a body field.
    const client = getOpenAIClient();
    const pending = signal
        ? client.chat.completions.create(request, { signal })
        : client.chat.completions.create(request);
    return Promise.resolve(pending).then((response) => {
        recordAiUsage(response?.usage);
        return response;
    });
};
export const parseOpenAIJson = (content, errorLabel) => {
    const cleanedContent = cleanJsonString(content);
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        console.error(`❌ Failed to extract JSON from ${errorLabel}. Raw content:`, content?.substring?.(0, 200));
        throw new Error(`Failed to parse ${errorLabel}`);
    }

    return JSON.parse(jsonMatch[0]);
};
export const withTimeout = (operation, timeoutMs, timeoutMessage, signal = null) => withAbortableTimeout(
    operation,
    timeoutMs,
    { signal, timeoutMessage },
);
export const callOpenAIJson = async (messages, maxTokens = 2400, options = {}) => {
    let model = OPENAI_PRIMARY_MODEL;

    try {
        return await createChatCompletion({
            model,
            response_format: { type: 'json_object' },
            messages,
            maxTokens,
            temperature: 0.2,
            signal: options.signal,
        });
    } catch (primaryError) {
        if (options.signal?.aborted) throw primaryError;
        console.error(`⚠️ Primary analysis model (${model}) failed:`, primaryError.message, primaryError.status ? `(Status: ${primaryError.status})` : '');
        model = OPENAI_FALLBACK_MODEL;
        return await createChatCompletion({
            model,
            response_format: { type: 'json_object' },
            messages,
            maxTokens,
            temperature: 0.2,
            signal: options.signal,
        });
    }
};
