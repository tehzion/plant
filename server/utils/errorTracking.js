import * as Sentry from '@sentry/node';

// Error tracking is opt-in: nothing is sent unless SENTRY_DSN is set.
// Request bodies, cookies and headers are stripped because scan requests
// carry farmer photos, locations and bearer tokens.
let enabled = false;

export const scrubEvent = (event) => {
    if (event?.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
    }
    if (event?.user) event.user = event.user.id ? { id: event.user.id } : undefined;
    return event;
};

export const initErrorTracking = () => {
    if (enabled || !process.env.SENTRY_DSN) return false;
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        release: process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || undefined,
        sendDefaultPii: false,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
        beforeSend: scrubEvent,
    });
    enabled = true;
    return true;
};

export const captureError = (error, context = {}) => {
    if (!enabled) return;
    Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
            if (value != null) scope.setTag(key, String(value));
        });
        Sentry.captureException(error);
    });
};

export const flushErrorTracking = (timeoutMs = 2000) => (enabled ? Sentry.flush(timeoutMs) : Promise.resolve(true));
