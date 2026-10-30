import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestTimeoutError, withAbortableTimeout } from './requestTimeout.js';

describe('withAbortableTimeout', () => {
    afterEach(() => vi.useRealTimers());

    it('aborts the downstream operation when the deadline expires', async () => {
        vi.useFakeTimers();
        let downstreamSignal;
        const operation = vi.fn((signal) => {
            downstreamSignal = signal;
            return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
        });

        const pending = withAbortableTimeout(operation, 25, { timeoutMessage: 'test deadline' });
        const assertion = expect(pending).rejects.toBeInstanceOf(RequestTimeoutError);
        await vi.advanceTimersByTimeAsync(25);

        await assertion;
        expect(operation).toHaveBeenCalledOnce();
        expect(downstreamSignal.aborted).toBe(true);
    });

    it('propagates caller cancellation immediately', async () => {
        const controller = new AbortController();
        const operation = vi.fn((signal) => new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason));
        }));
        const pending = withAbortableTimeout(operation, 1000, { signal: controller.signal });

        const reason = new Error('client disconnected');
        controller.abort(reason);

        await expect(pending).rejects.toBe(reason);
    });
});

