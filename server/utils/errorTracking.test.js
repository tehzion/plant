import { afterEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn(), withScope: vi.fn((fn) => fn({ setTag: vi.fn() })), flush: vi.fn(async () => true) }));
vi.mock('@sentry/node', () => sentry);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });

describe('server error tracking', () => {
    it('stays off and sends nothing without SENTRY_DSN', async () => {
        vi.stubEnv('SENTRY_DSN', '');
        const tracking = await import('./errorTracking.js');
        expect(tracking.initErrorTracking()).toBe(false);
        tracking.captureError(new Error('boom'));
        expect(sentry.init).not.toHaveBeenCalled();
        expect(sentry.captureException).not.toHaveBeenCalled();
    });

    it('initialises without PII and captures errors once a DSN is set', async () => {
        vi.stubEnv('SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
        const tracking = await import('./errorTracking.js');
        expect(tracking.initErrorTracking()).toBe(true);
        expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false }));
        tracking.captureError(new Error('boom'), { path: '/api/analyze' });
        expect(sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it('strips request bodies, headers and user details from events', async () => {
        const { scrubEvent } = await import('./errorTracking.js');
        const event = scrubEvent({
            request: { url: '/api/analyze', data: { image: 'data:image/jpeg;base64,...' }, headers: { authorization: 'Bearer x' }, cookies: 'a=b' },
            user: { id: 'u1', email: 'farmer@example.com', ip_address: '1.2.3.4' },
        });
        expect(event.request).toEqual({ url: '/api/analyze' });
        expect(event.user).toEqual({ id: 'u1' });
    });
});
