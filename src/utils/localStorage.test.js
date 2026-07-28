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

    it('maps daily notes to schema-safe Supabase rows', () => {
        const row = localStorageUtils.toDailyNoteRow({
            id: 'note-1',
            note: 'Applied copper',
            activity_type: 'spray',
            chemical_name: 'Copper',
            temperature_am: '27',
            photo_base64: 'data:image/jpeg;base64,abc',
            photo_url: 'https://example.com/note.jpg',
        }, 'user-1');

        expect(row).toMatchObject({
            id: 'note-1',
            user_id: 'user-1',
            note: 'Applied copper',
            activity_type: 'spray',
            chemical_name: 'Copper',
            temperature_am: 27,
            photo_url: 'https://example.com/note.jpg',
        });
        expect(row).not.toHaveProperty('photo_base64');
    });

    it('maps plots to snake_case Supabase rows without cropType drift', () => {
        const row = localStorageUtils.toPlotRow({
            id: 'plot-1',
            name: 'North Block',
            cropType: 'Durian',
            area: '2.5',
            soil_ph: '6.1',
        }, 'user-1');

        expect(row).toMatchObject({
            id: 'plot-1',
            user_id: 'user-1',
            name: 'North Block',
            crop_type: 'Durian',
            area: 2.5,
            soil_ph: 6.1,
        });
        expect(row).not.toHaveProperty('cropType');
    });

    it('normalizes cloud profile rows into dashboard profile info', () => {
        expect(localStorageUtils.normalizeProfileInfo({
            name: 'Ali',
            contact: '+6012',
            crops: 'Durian',
            member_since: 'July 2026',
        })).toEqual({
            name: 'Ali',
            contact: '+6012',
            crops: 'Durian',
            memberSince: 'July 2026',
        });
    });

    it('cleans up the oldest eligible collections in priority order when quota is exceeded', () => {
        const store = new Map();
        const scanItems = makeItems(25, 'scan');
        const logItems = makeItems(25, 'log');
        const currentNotes = makeItems(20, 'note');
        const nextNotes = makeItems(20, 'latest-note');
        const scanPayload = JSON.stringify(scanItems);
        const logPayload = JSON.stringify(logItems);
        const nextNotesPayload = JSON.stringify(nextNotes);
        const trimmedScanPayload = JSON.stringify(scanItems.slice(0, -10));
        const nextTotalSize = scanPayload.length + logPayload.length + nextNotesPayload.length;
        const trimmedTotalSize = trimmedScanPayload.length + logPayload.length + nextNotesPayload.length;
        const limit = Math.floor((nextTotalSize + trimmedTotalSize) / 2);

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

        store.set(STORAGE_KEY, scanPayload);
        store.set(LOGBOOK_KEY, logPayload);
        store.set(NOTES_KEY, JSON.stringify(currentNotes));

        const result = localStorageUtils.writeStorageCollection(
            NOTES_KEY,
            nextNotes,
        );

        const cleanupNotice = localStorageUtils.consumeStorageCleanupNotice();
        const trimmedScans = JSON.parse(store.get(STORAGE_KEY));

        expect(result.ok).toBe(true);
        expect(cleanupNotice.cleanedCollections[0].key).toBe(STORAGE_KEY);
        expect(trimmedScans.length).toBeLessThan(25);
    });
});
