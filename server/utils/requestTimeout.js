/**
 * Run an async operation with a hard deadline and a caller-controlled abort
 * signal. The operation receives the derived signal and should pass it to
 * every downstream request it starts.
 */
export class RequestTimeoutError extends Error {
    constructor(message = 'Request timed out') {
        super(message);
        this.name = 'RequestTimeoutError';
        this.code = 'REQUEST_TIMEOUT';
        this.status = 504;
    }
}

const normalizeAbortReason = (reason, fallbackMessage) => {
    if (reason instanceof Error) return reason;
    return new Error(reason ? String(reason) : fallbackMessage);
};

export const withAbortableTimeout = async (
    operation,
    timeoutMs,
    { signal = null, timeoutMessage = 'Request timed out' } = {},
) => {
    if (typeof operation !== 'function') {
        throw new TypeError('withAbortableTimeout requires an operation function');
    }

    if (signal?.aborted) {
        throw normalizeAbortReason(signal.reason, 'Request cancelled');
    }

    const controller = new AbortController();
    let timeoutId = null;
    let removeParentListener = () => {};
    let rejectCancellation;

    const cancellation = new Promise((_, reject) => {
        rejectCancellation = reject;
    });

    const abortFromParent = () => {
        const reason = normalizeAbortReason(signal.reason, 'Request cancelled');
        controller.abort(reason);
        rejectCancellation(reason);
    };

    if (signal) {
        signal.addEventListener('abort', abortFromParent, { once: true });
        removeParentListener = () => signal.removeEventListener('abort', abortFromParent);
    }

    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            const error = new RequestTimeoutError(timeoutMessage);
            controller.abort(error);
            reject(error);
        }, Math.max(1, Number(timeoutMs) || 1));
    });

    try {
        const work = Promise.resolve().then(() => operation(controller.signal));
        return await Promise.race([work, timeout, cancellation]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
        removeParentListener();
        controller.abort();
    }
};

