import { lazy } from 'react';

const RETRY_PREFIX = 'lazy-retry:';

const isRetryableChunkError = (error) => {
    const message = String(error?.message || error || '');
    return [
        'Failed to fetch dynamically imported module',
        'Importing a module script failed',
        'ChunkLoadError',
        'Loading chunk',
        'Unable to preload CSS',
    ].some((pattern) => message.includes(pattern));
};

export const lazyWithRetry = (importer, cacheKey) => lazy(async () => {
    const retryKey = `${RETRY_PREFIX}${cacheKey}`;

    try {
        const module = await importer();
        try {
            sessionStorage.removeItem(retryKey);
        } catch {
            // Ignore sessionStorage issues.
        }
        return module;
    } catch (error) {
        const shouldRetry = isRetryableChunkError(error);

        if (!shouldRetry) {
            throw error;
        }

        try {
            const hasRetried = sessionStorage.getItem(retryKey) === '1';
            if (!hasRetried) {
                sessionStorage.setItem(retryKey, '1');
                window.location.reload();
                return new Promise(() => {});
            }
        } catch {
            window.location.reload();
            return new Promise(() => {});
        }

        throw error;
    }
});

export const isRetryableLazyLoadError = isRetryableChunkError;

