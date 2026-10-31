// Keeps the floating assistant's conversation in this browser so a reload
// does not wipe it. Old conversations expire so a shared phone does not show
// yesterday's questions to the next person.
const CHAT_KEY = 'kanb_assistant_chat_v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 30;

const EMPTY = { messages: [], scan: null };

const isMessage = (message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string';

export const loadSavedChat = (now = Date.now()) => {
    try {
        const saved = JSON.parse(localStorage.getItem(CHAT_KEY) || 'null');
        if (!saved || !Array.isArray(saved.messages) || now - Number(saved.savedAt) > MAX_AGE_MS) return EMPTY;
        const messages = saved.messages.filter(isMessage);
        return messages.length ? { messages, scan: saved.scan || null } : EMPTY;
    } catch {
        return EMPTY;
    }
};

export const saveChat = (messages, scan, now = Date.now()) => {
    try {
        localStorage.setItem(CHAT_KEY, JSON.stringify({ savedAt: now, scan: scan || null, messages: messages.slice(-MAX_MESSAGES) }));
    } catch {
        // Storage can be full or blocked; the chat still works for this visit.
    }
};

export const clearSavedChat = () => {
    try {
        localStorage.removeItem(CHAT_KEY);
    } catch {
        // Nothing to clear when storage is blocked.
    }
};
