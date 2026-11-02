import { describe, expect, it } from 'vitest';
import { classifyAnalysisFailure, getAiProviderStatus, recordAnalysisSuccess } from './analysisErrors.js';

describe('classifyAnalysisFailure', () => {
    it('reports an empty AI account as out of credit, not as a temporary outage', () => {
        const failure = classifyAnalysisFailure({ status: 402, message: 'This request requires more credits' }, 'ms');
        expect(failure).toMatchObject({ code: 'AI_PROVIDER_OUT_OF_CREDIT', status: 402, retryable: false });
        expect(failure.message).toMatch(/Semakan tanaman dihentikan sementara/);
    });

    it('recognises the provider message when no status is attached', () => {
        expect(classifyAnalysisFailure({ message: 'Requests exceed your available credits' }).code).toBe('AI_PROVIDER_OUT_OF_CREDIT');
    });

    it('keeps other failures as before', () => {
        expect(classifyAnalysisFailure({ status: 429 }).code).toBe('AI_PROVIDER_BUSY');
        expect(classifyAnalysisFailure({ status: 401 })).toMatchObject({ code: 'AI_PROVIDER_CONFIG', retryable: false });
        expect(classifyAnalysisFailure({ status: 500 })).toMatchObject({ code: 'AI_PROVIDER_UNAVAILABLE', status: 503, retryable: true });
    });
});

describe('getAiProviderStatus', () => {
    it('shows out of credit after a credit failure until a scan succeeds', () => {
        recordAnalysisSuccess();
        expect(getAiProviderStatus().status).toBe('ok');
        classifyAnalysisFailure({ status: 402 });
        expect(getAiProviderStatus().status).toBe('out_of_credit');
        recordAnalysisSuccess();
        expect(getAiProviderStatus().status).toBe('ok');
    });

    it('clears itself after ten minutes so a topped-up account is not reported as empty forever', () => {
        classifyAnalysisFailure({ status: 402 });
        expect(getAiProviderStatus(Date.now() + 11 * 60 * 1000).status).toBe('ok');
        recordAnalysisSuccess();
    });
});
