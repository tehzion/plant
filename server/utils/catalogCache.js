// A small in-memory cache for the store catalogue (products, tags, categories).
//
// - Fresh entries are returned as they are.
// - Past their time limit, the last copy is still returned at once while a new
//   copy loads in the background, so a farmer never waits on the store for it.
// - Requests that need the same missing entry share one load.
// - If a load fails, the last good copy stays in use.
// - expireAll() marks every entry out of date and reloads it in the background
//   (used when the store reports a product change).
const abortError = (signal) => signal?.reason instanceof Error ? signal.reason : Object.assign(new Error('Request cancelled'), { name: 'AbortError' });

// Lets one caller stop waiting without cancelling a load other callers share.
const waitWithSignal = (promise, signal) => {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(abortError(signal));
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(abortError(signal));
        signal.addEventListener('abort', onAbort, { once: true });
        promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
    });
};

export const createCatalogCache = ({ ttlMs, now = () => Date.now(), onBackgroundError = () => {} }) => {
    const entries = new Map(); // key -> { value, loadedAt, loader }
    const loads = new Map(); // key -> Promise

    const load = (key, loader) => {
        if (!loads.has(key)) {
            const pending = Promise.resolve()
                .then(loader)
                .then((value) => {
                    entries.set(key, { value, loadedAt: now(), loader });
                    return value;
                })
                .finally(() => loads.delete(key));
            loads.set(key, pending);
        }
        return loads.get(key);
    };

    const get = async (key, loader, { signal = null } = {}) => {
        const entry = entries.get(key);
        if (entry && now() - entry.loadedAt < ttlMs) return entry.value;
        if (entry) {
            load(key, loader).catch((error) => onBackgroundError(key, error));
            return entry.value;
        }
        return waitWithSignal(load(key, loader), signal);
    };

    const expireAll = () => {
        for (const [key, entry] of entries) {
            entry.loadedAt = -Infinity;
            load(key, entry.loader).catch((error) => onBackgroundError(key, error));
        }
        return entries.size;
    };

    return { get, expireAll, clear: () => { entries.clear(); loads.clear(); }, size: () => entries.size };
};
