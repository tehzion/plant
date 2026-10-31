import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSavedChat, loadSavedChat, saveChat } from './assistantChatStorage.js';

const NOW = Date.parse('2026-10-31T10:00:00Z');
const MESSAGES = [{ role: 'user', content: 'Why yellow?' }, { role: 'assistant', content: 'Check nitrogen.', rating: 'up' }];

beforeEach(() => localStorage.clear());

describe('assistant chat storage', () => {
    it('restores a recent conversation with its scan and votes', () => {
        saveChat(MESSAGES, { crop: 'Durian', status: 'diagnosed' }, NOW);
        expect(loadSavedChat(NOW + 60_000)).toEqual({ messages: MESSAGES, scan: { crop: 'Durian', status: 'diagnosed' } });
    });

    it('forgets a conversation older than a day', () => {
        saveChat(MESSAGES, null, NOW);
        expect(loadSavedChat(NOW + 25 * 60 * 60 * 1000).messages).toEqual([]);
    });

    it('ignores damaged data and keeps only the latest messages', () => {
        localStorage.setItem('kanb_assistant_chat_v1', '{not json');
        expect(loadSavedChat(NOW).messages).toEqual([]);
        saveChat(Array.from({ length: 40 }, (_, i) => ({ role: 'user', content: `q${i}` })), null, NOW);
        const { messages } = loadSavedChat(NOW);
        expect(messages).toHaveLength(30);
        expect(messages[0].content).toBe('q10');
        clearSavedChat();
        expect(localStorage.getItem('kanb_assistant_chat_v1')).toBeNull();
    });

    it('still works when storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(() => saveChat(MESSAGES, null, NOW)).not.toThrow();
        vi.restoreAllMocks();
    });
});
