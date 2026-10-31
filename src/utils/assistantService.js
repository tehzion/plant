import { fetchJsonWithTimeout } from './networkRequest.js';

const API_URL = import.meta.env.VITE_API_URL || '';

export { STORE_URL } from './store.js';

/**
 * Ask the floating help assistant.
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages - Conversation so far, newest last
 * @param {string} language - 'en', 'ms' or 'zh'
 * @param {Object|null} scanContext - The scan the farmer is viewing, from buildAssistantScanContext
 * @returns {Promise<{reply: string, encyclopedia: Array, products: Array, suggestScan: boolean, contact: Object|null}>}
 */
export const sendAssistantMessage = (messages, language = 'en', scanContext = null) => fetchJsonWithTimeout(
    `${API_URL}/api/assistant/chat`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language,
            messages: messages.slice(-10).map(({ role, content }) => ({ role, content: content.slice(0, 1500) })),
            ...(scanContext ? { scanContext } : {}),
        }),
    },
    {
        timeoutMs: 30000,
        timeoutMessage: 'The assistant is taking too long. Please try again.',
        networkMessage: 'Could not reach the assistant. Please check your connection.',
        unavailableMessage: 'The assistant is temporarily unavailable.',
    },
);

/**
 * Record whether an assistant answer helped. Failures are the caller's to ignore.
 * @param {{rating: 'up'|'down', question: string, answer: string, language: string, page: string, scanStatus: string|null}} feedback
 */
export const sendAssistantFeedback = (feedback) => fetchJsonWithTimeout(
    `${API_URL}/api/assistant-feedback`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...feedback,
            question: feedback.question.slice(0, 1500),
            answer: feedback.answer.slice(0, 3000),
        }),
    },
    { timeoutMs: 10000 },
);
