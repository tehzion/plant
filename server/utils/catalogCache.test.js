import { describe, expect, it, vi } from 'vitest';
import { createCatalogCache } from './catalogCache.js';

const deferred = () => {
    let resolve; let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
};

describe('createCatalogCache', () => {
    it('shares one load between callers that arrive together', async () => {
        const cache = createCatalogCache({ ttlMs: 1000 });
        const pending = deferred();
        const loader = vi.fn(() => pending.promise);

        const calls = [cache.get('p', loader), cache.get('p', loader), cache.get('p', loader)];
        pending.resolve(['a']);

        expect(await Promise.all(calls)).toEqual([['a'], ['a'], ['a']]);
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('returns the old copy at once after the time limit and refreshes it in the background', async () => {
        let time = 0;
        const cache = createCatalogCache({ ttlMs: 1000, now: () => time });
        const loader = vi.fn().mockResolvedValueOnce(['old']).mockResolvedValueOnce(['new']);

        expect(await cache.get('p', loader)).toEqual(['old']);
        time = 1500;
        expect(await cache.get('p', loader)).toEqual(['old']);
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
        expect(await cache.get('p', loader)).toEqual(['new']);
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('keeps the last good copy when a refresh fails', async () => {
        let time = 0;
        const onBackgroundError = vi.fn();
        const cache = createCatalogCache({ ttlMs: 1000, now: () => time, onBackgroundError });
        const loader = vi.fn().mockResolvedValueOnce(['good']).mockRejectedValue(new Error('store down'));

        await cache.get('p', loader);
        time = 5000;
        expect(await cache.get('p', loader)).toEqual(['good']);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(await cache.get('p', loader)).toEqual(['good']);
        expect(onBackgroundError).toHaveBeenCalled();
    });

    it('lets a caller stop waiting without cancelling the shared load', async () => {
        const cache = createCatalogCache({ ttlMs: 1000 });
        const pending = deferred();
        const loader = vi.fn(() => pending.promise);
        const controller = new AbortController();

        const cancelled = cache.get('p', loader, { signal: controller.signal });
        const other = cache.get('p', loader);
        controller.abort(new Error('client left'));
        pending.resolve(['a']);

        await expect(cancelled).rejects.toThrow('client left');
        expect(await other).toEqual(['a']);
    });

    it('expireAll reloads every entry in the background with its own loader', async () => {
        const cache = createCatalogCache({ ttlMs: 60_000 });
        const products = vi.fn().mockResolvedValueOnce(['p1']).mockResolvedValueOnce(['p2']);
        const tags = vi.fn().mockResolvedValue(['t']);

        await cache.get('products', products);
        await cache.get('tags', tags);
        expect(cache.expireAll()).toBe(2);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(await cache.get('products', products)).toEqual(['p2']);
        expect(products).toHaveBeenCalledTimes(2);
        expect(tags).toHaveBeenCalledTimes(2);
    });

    it('passes a first-load failure to the caller', async () => {
        const cache = createCatalogCache({ ttlMs: 1000 });
        await expect(cache.get('p', () => Promise.reject(new Error('down')))).rejects.toThrow('down');
        expect(cache.size()).toBe(0);
    });
});
