import { expect, it } from 'vitest';
import { scrubPrivacyDiagnostics } from './privacyDiagnostics.js';
it('does not send contact text, request data, breadcrumbs or local variables to diagnostics', () => {
    const marker = 'PRIVATE_DUMMY_CONTACT';
    const result = scrubPrivacyDiagnostics({
        user: { id: marker }, request: { url: `https://app/?token=${marker}` },
        extra: { marker }, contexts: { marker }, breadcrumbs: [{ message: marker }], message: marker,
        exception: { values: [{ type: 'Error', value: marker, stacktrace: { frames: [{ filename: `app.js?token=${marker}`, function: 'save', lineno: 3, vars: { marker } }] } }] },
    });
    expect(JSON.stringify(result)).not.toContain(marker);
    expect(result.exception.values[0].stacktrace.frames[0]).toMatchObject({ filename: 'app.js', function: 'save', lineno: 3 });
});
