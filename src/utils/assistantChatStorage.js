// Keeps the floating assistant's conversation in this browser so a reload
// does not wipe it. Old conversations expire so a shared phone does not show
// yesterday's questions to the next person.
const CHAT_KEY = owner => owner ? `kanb_assistant_chat_v2:${owner}` : null;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 30;

const EMPTY = { messages: [], scan: null };

const isMessage = (message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string';

export const loadSavedChat = (now = Date.now(), owner = 'guest:local') => {
    if (!owner) return EMPTY;
    try {
        const saved = JSON.parse(localStorage.getItem(CHAT_KEY(owner)) || 'null');
        if (!saved || !Array.isArray(saved.messages) || !Number.isFinite(Number(saved.savedAt)) || now < Number(saved.savedAt) || now - Number(saved.savedAt) > MAX_AGE_MS) {
            localStorage.removeItem(CHAT_KEY(owner));
            return EMPTY;
        }
        const messages = saved.messages.filter(isMessage);
        return messages.length ? { messages, scan: saved.scan || null } : EMPTY;
    } catch {
        return EMPTY;
    }
};

export const saveChat = (messages, scan, now = Date.now(), owner = 'guest:local') => {
    if (!owner) return;
    try {
        localStorage.setItem(CHAT_KEY(owner), JSON.stringify({ savedAt: now, scan: scan || null, messages: messages.slice(-MAX_MESSAGES) }));
    } catch {
        // Storage can be full or blocked; the chat still works for this visit.
    }
};

export const clearSavedChat = (owner = 'guest:local') => {
    if (!owner) return;
    try {
        localStorage.removeItem(CHAT_KEY(owner));
    } catch {
        // Nothing to clear when storage is blocked.
    }
};
