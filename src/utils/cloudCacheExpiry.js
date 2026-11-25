// Signed-in farmers' cloud records are cached on the phone so they can be read
// offline. Signing out clears that copy, but on a shared phone a session can
// also just lapse without a sign-out. Copies for an account nobody has used on
// this phone for CLOUD_CACHE_IDLE_DAYS are removed when the app next opens.
// Records still waiting to sync are not touched, so nothing unsent is lost.
export const CLOUD_CACHE_IDLE_DAYS = 30;
const IDLE_MS = CLOUD_CACHE_IDLE_DAYS * 24 * 60 * 60 * 1000;
const PREFIX = 'cloud-cache:user:';
const LAST_USED = 'last-used';
export const cloudCacheLastUsedKey = (userId) => `${PREFIX}${userId}:${LAST_USED}`;

/**
 * Marks the signed-in account as used now and clears the cached copies of
 * every other account idle for longer than the limit. Caches written before
 * this check existed have no "last used" date; their clock starts now.
 * Returns the ids of accounts whose cache was cleared.
 */
export const expireIdleCloudCaches = async ({ activeUserId = null, now = Date.now(), listMetadata, setMetadata, clearCloudReadCache }) => {
    const rows = await listMetadata(PREFIX);
    const accounts = new Map();
    for (const row of rows) {
        const match = /^cloud-cache:user:(.+):([^:]+)$/.exec(row.key);
        if (!match) continue;
        const [, userId, part] = match;
        const account = accounts.get(userId) || { lastUsed: null, hasCache: false };
        if (part === LAST_USED) account.lastUsed = Date.parse(row.value);
        else if (row.value != null) account.hasCache = true;
        accounts.set(userId, account);
    }

    const stamp = new Date(now).toISOString();
    const cleared = [];
    for (const [userId, account] of accounts) {
        if (userId === activeUserId || !account.hasCache) continue;
        if (!Number.isFinite(account.lastUsed)) {
            await setMetadata(cloudCacheLastUsedKey(userId), stamp);
        } else if (now - account.lastUsed > IDLE_MS) {
            await clearCloudReadCache(userId);
            cleared.push(userId);
        }
    }
    if (activeUserId) await setMetadata(cloudCacheLastUsedKey(activeUserId), stamp);
    return cleared;
};
