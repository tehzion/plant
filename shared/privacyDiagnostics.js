// Keep diagnostic structure, never arbitrary application data or user text.
export const scrubPrivacyDiagnostics = event => {
    for (const field of ['user', 'extra', 'contexts', 'breadcrumbs', 'logentry', 'message', 'request', 'tags', 'transaction', 'fingerprint']) delete event[field];
    if (event.exception?.values) event.exception.values = event.exception.values.map(error => ({
        type: /^[A-Za-z][A-Za-z0-9_.]{0,80}$/.test(error.type || '') ? error.type : 'Error',
        value: 'Application error (details withheld)',
        ...(error.stacktrace ? { stacktrace: { frames: (error.stacktrace.frames || []).map(frame => ({
            filename: typeof frame.filename === 'string' ? frame.filename.split(/[?#]/)[0] : undefined,
            function: frame.function,
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
        })) } } : {}),
    }));
    return event;
};
