import { describe, expect, it, vi } from 'vitest';
import { cloudCacheLastUsedKey, expireIdleCloudCaches } from './cloudCacheExpiry.js';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-11-25T08:00:00Z');
const iso = (msAgo) => new Date(now - msAgo).toISOString();

const setup = (rows) => {
    const deps = {
        listMetadata: vi.fn(async (prefix) => rows.filter((row) => row.key.startsWith(prefix))),
        setMetadata: vi.fn(async () => {}),
        clearCloudReadCache: vi.fn(async () => {}),
    };
    return deps;
};

describe('expireIdleCloudCaches', () => {
    it('clears the cache of an account idle for more than 30 days and keeps recent ones', async () => {
        const deps = setup([
            { key: 'cloud-cache:user:old:scans', value: [{ id: 1 }] },
            { key: cloudCacheLastUsedKey('old'), value: iso(31 * DAY) },
            { key: 'cloud-cache:user:recent:logbook', value: [{ id: 2 }] },
            { key: cloudCacheLastUsedKey('recent'), value: iso(29 * DAY) },
        ]);

        const cleared = await expireIdleCloudCaches({ now, ...deps });

        expect(cleared).toEqual(['old']);
        expect(deps.clearCloudReadCache).toHaveBeenCalledTimes(1);
        expect(deps.clearCloudReadCache).toHaveBeenCalledWith('old');
    });

    it('never clears the signed-in account and marks it as used now', async () => {
        const deps = setup([
            { key: 'cloud-cache:user:me:scans', value: [{ id: 1 }] },
            { key: cloudCacheLastUsedKey('me'), value: iso(90 * DAY) },
        ]);

        const cleared = await expireIdleCloudCaches({ activeUserId: 'me', now, ...deps });

        expect(cleared).toEqual([]);
        expect(deps.clearCloudReadCache).not.toHaveBeenCalled();
        expect(deps.setMetadata).toHaveBeenCalledWith(cloudCacheLastUsedKey('me'), new Date(now).toISOString());
    });

    it('starts the clock for caches saved before this check existed instead of clearing them', async () => {
        const deps = setup([{ key: 'cloud-cache:user:legacy:plots', value: [{ id: 3 }] }]);

        const cleared = await expireIdleCloudCaches({ now, ...deps });

        expect(cleared).toEqual([]);
        expect(deps.setMetadata).toHaveBeenCalledWith(cloudCacheLastUsedKey('legacy'), new Date(now).toISOString());
    });

    it('ignores accounts whose cache is already empty and guest data', async () => {
        const deps = setup([
            { key: 'cloud-cache:user:gone:scans', value: null },
            { key: cloudCacheLastUsedKey('gone'), value: iso(200 * DAY) },
            { key: 'cloud-cache:guest:abc:scans', value: [{ id: 4 }] },
        ]);

        expect(await expireIdleCloudCaches({ now, ...deps })).toEqual([]);
        expect(deps.clearCloudReadCache).not.toHaveBeenCalled();
        expect(deps.listMetadata).toHaveBeenCalledWith('cloud-cache:user:');
    });
});
