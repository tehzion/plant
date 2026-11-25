import { isNetworkUnavailableError, isTimeoutError } from './networkRequest.js';

// Picks the translation key for a failed request from its type, code or HTTP
// status. Returns null when nothing is known, so callers keep their own
// context-specific fallback.
export const friendlyErrorKey = (error) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'errors.offline';
    if (isTimeoutError(error) || error?.name === 'AbortError') return 'errors.timeout';
    if (isNetworkUnavailableError(error) || (error instanceof TypeError && /fetch|network/i.test(error.message))) return 'errors.network';
    const status = Number(error?.status);
    if (status === 401 || status === 403) return 'errors.session';
    if (status === 429) return 'errors.tooMany';
    if (status === 413) return 'errors.tooLarge';
    if (status >= 500) return 'errors.server';
    return null;
};

export const friendlyErrorMessage = (error, t, fallbackKey = 'errors.generic') => {
    const key = friendlyErrorKey(error) || fallbackKey;
    const text = t(key);
    return text && text !== key ? text : t('errors.generic');
};
