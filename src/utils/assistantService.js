import { fetchJsonWithTimeout } from './networkRequest.js';

const API_URL = import.meta.env.VITE_API_URL || '';

export { STORE_URL } from './store.js';

/**
 * Ask the floating help assistant.
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages - Conversation so far, newest last
 * @param {string} language - 'en', 'ms' or 'zh'
 * @returns {Promise<{reply: string, encyclopedia: Array, products: Array, suggestScan: boolean, contact: Object|null}>}
 */
export const sendAssistantMessage = (messages, language = 'en') => fetchJsonWithTimeout(
    `${API_URL}/api/assistant/chat`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language,
            messages: messages.slice(-10).map(({ role, content }) => ({ role, content: content.slice(0, 1500) })),
        }),
    },
    {
        timeoutMs: 30000,
        timeoutMessage: 'The assistant is taking too long. Please try again.',
        networkMessage: 'Could not reach the assistant. Please check your connection.',
        unavailableMessage: 'The assistant is temporarily unavailable.',
    },
);
