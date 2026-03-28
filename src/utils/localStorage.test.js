import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
    supabase: null,
}));

const localStorageUtils = await import('./localStorage.js');

const makeItems = (count, prefix) =>
    Array.from({ length: count }, (_, index) => ({
        id: `${prefix}-${index}`,
        note: `${prefix} ${index} `.repeat(10),
        created_at: `2026-03-${String((index % 28) + 1).padStart(2, '0')}T08:00:00.000Z`,
    }));

describe('localStorage utilities', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorageUtils.consumeStorageCleanupNotice();
        vi.restoreAllMocks();
    });

    it('fills missing legacy daily-note fields without overwriting populated values', () => {
        const normalized = localStorageUtils.normalizeLegacyDailyNote({
            id: 'note-1',
            note: 'Harvested 20kg',
            kg_harvested: 20,
            buyer_name: 'Ah Chong',
        });

        expect(normalized.kg_harvested).toBe(20);
        expect(normalized.buyer_name).toBe('Ah Chong');
        expect(normalized.pruning_type).toBeNull();
        expect(normalized.inspection_status).toBeNull();
    });

    it('normalizes plot cropType drift idempotently', () => {
        const once = localStorageUtils.normalizeStoredPlot({
            id: 'plot-1',
            name: 'Plot A',
            crop_type: 'Durian',
        });
        const twice = localStorageUtils.normalizeStoredPlot(once);

        expect(once.cropType).toBe('Durian');
        expect(once.crop_type).toBe('Durian');
        expect(twice).toEqual(once);
    });

    it('cleans up the oldest eligible collections in priority order when quota is exceeded', () => {
        const store = new Map();
        const limit = 3500;

        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => (
            store.has(key) ? store.get(key) : null
        ));
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
            store.delete(key);
        });
        vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
            store.clear();
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
            const next = new Map(store);
            next.set(key, String(value));
            const totalSize = [...next.values()].reduce((sum, entry) => sum + entry.length, 0);
            if (totalSize > limit) {
                throw new DOMException('Quota exceeded', 'QuotaExceededError');
            }
            store.set(key, String(value));
        });

        const { STORAGE_KEY, LOGBOOK_KEY, NOTES_KEY } = localStorageUtils.STORAGE_COLLECTION_KEYS;

        store.set(STORAGE_KEY, JSON.stringify(makeItems(25, 'scan')));
        store.set(LOGBOOK_KEY, JSON.stringify(makeItems(25, 'log')));
        store.set(NOTES_KEY, JSON.stringify(makeItems(20, 'note')));

        const result = localStorageUtils.writeStorageCollection(
            NOTES_KEY,
            makeItems(20, 'latest-note'),
        );

        const cleanupNotice = localStorageUtils.consumeStorageCleanupNotice();
        const trimmedScans = JSON.parse(store.get(STORAGE_KEY));

        expect(result.ok).toBe(true);
        expect(cleanupNotice.cleanedCollections[0].key).toBe(STORAGE_KEY);
        expect(trimmedScans.length).toBeLessThan(25);
    });
});
