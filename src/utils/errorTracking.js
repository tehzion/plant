// Browser error tracking is opt-in: the Sentry SDK is only downloaded when
// VITE_SENTRY_DSN is set at build time. Breadcrumb URLs and request data are
// trimmed so scan photos, locations and tokens never leave the device.
export const scrubBrowserEvent = (event) => {
    if (event?.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        if (event.request.url) event.request.url = event.request.url.split('?')[0];
    }
    if (event?.user) event.user = event.user.id ? { id: event.user.id } : undefined;
    return event;
};

export const initBrowserErrorTracking = async (env = import.meta.env) => {
    if (!env.VITE_SENTRY_DSN) return false;
    const Sentry = await import('@sentry/react');
    Sentry.init({
        dsn: env.VITE_SENTRY_DSN,
        environment: env.MODE,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        beforeSend: scrubBrowserEvent,
    });
    return true;
};
