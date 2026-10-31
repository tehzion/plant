import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkRequestError } from './networkRequest.js';
import { friendlyErrorKey, friendlyErrorMessage } from './friendlyError.js';

const httpError = (status) => Object.assign(new Error(`Request failed with status ${status}`), { status });

describe('friendlyErrorKey', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('maps statuses and network failures to plain messages', () => {
        expect(friendlyErrorKey(httpError(401))).toBe('errors.session');
        expect(friendlyErrorKey(httpError(429))).toBe('errors.tooMany');
        expect(friendlyErrorKey(httpError(413))).toBe('errors.tooLarge');
        expect(friendlyErrorKey(httpError(503))).toBe('errors.server');
        expect(friendlyErrorKey(new TypeError('Failed to fetch'))).toBe('errors.network');
        expect(friendlyErrorKey(new NetworkRequestError('t', { code: 'REQUEST_TIMEOUT' }))).toBe('errors.timeout');
    });

    it('reports offline before anything else', () => {
        vi.stubGlobal('navigator', { onLine: false });
        expect(friendlyErrorKey(httpError(500))).toBe('errors.offline');
    });

    it('leaves unknown errors to the caller', () => {
        expect(friendlyErrorKey(httpError(400))).toBeNull();
    });
});

describe('friendlyErrorMessage', () => {
    const t = (key) => ({ 'errors.generic': 'Generic', 'errors.server': 'Server' }[key] || key);

    it('never returns the raw error text', () => {
        expect(friendlyErrorMessage(httpError(500), t)).toBe('Server');
        expect(friendlyErrorMessage(new Error('pg: relation missing'), t)).toBe('Generic');
        expect(friendlyErrorMessage(httpError(400), t, 'errors.missing')).toBe('Generic');
    });
});
