const DEFAULT_TIMEOUT_MS = 15000;

export class NetworkRequestError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'NetworkRequestError';
        this.code = options.code || 'REQUEST_FAILED';
        this.status = options.status ?? null;
        this.cause = options.cause;
    }
}

const buildTimeoutError = (message, cause) =>
    new NetworkRequestError(message, {
        code: 'REQUEST_TIMEOUT',
        cause,
    });

const buildNetworkError = (message, cause) =>
    new NetworkRequestError(message, {
        code: 'NETWORK_UNAVAILABLE',
        cause,
    });

const buildHttpError = (message, status, cause) =>
    new NetworkRequestError(message, {
        code: 'HTTP_ERROR',
        status,
        cause,
    });

const normalizeResponseMessage = async (response, fallbackMessage) => {
    try {
        const errorData = await response.json();
        return errorData?.message || errorData?.error || fallbackMessage;
    } catch {
        return fallbackMessage;
    }
};

export const fetchWithTimeout = async (url, options = {}, config = {}) => {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        timeoutMessage = 'The request timed out. Please try again.',
        networkMessage = 'Unable to reach the service. Please check your connection.',
    } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new DOMException(timeoutMessage, 'AbortError')), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw buildTimeoutError(timeoutMessage, error);
        }
        if (error instanceof TypeError) {
            throw buildNetworkError(networkMessage, error);
        }
        if (error instanceof NetworkRequestError) {
            throw error;
        }
        throw new NetworkRequestError(networkMessage, {
            code: 'REQUEST_FAILED',
            cause: error,
        });
    } finally {
        clearTimeout(timeoutId);
    }
};

export const fetchJsonWithTimeout = async (url, options = {}, config = {}) => {
    const {
        timeoutMs,
        timeoutMessage,
        networkMessage,
        unavailableMessage = 'The service is temporarily unavailable. Please try again.',
    } = config;

    const response = await fetchWithTimeout(
        url,
        options,
        {
            timeoutMs,
            timeoutMessage,
            networkMessage,
        },
    );

    if (!response.ok) {
        const fallbackMessage = response.status >= 500
            ? unavailableMessage
            : `Request failed with status ${response.status}`;
        const errorMessage = await normalizeResponseMessage(response, fallbackMessage);
        throw buildHttpError(errorMessage, response.status, response);
    }

    try {
        return await response.json();
    } catch (error) {
        throw new NetworkRequestError('Received an invalid response from the service.', {
            code: 'INVALID_RESPONSE',
            cause: error,
        });
    }
};

export const isTimeoutError = (error) => error instanceof NetworkRequestError && error.code === 'REQUEST_TIMEOUT';
export const isNetworkUnavailableError = (error) => error instanceof NetworkRequestError && error.code === 'NETWORK_UNAVAILABLE';
