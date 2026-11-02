import { checkServerHealth } from './diseaseDetection';

// The header remounts on every route change, so share one health check across
// mounts: reuse a request that is still running, and trust a recent success.
const HEALTH_FRESH_MS = 60000;
let lastHealthyAt = 0;
let pendingHealthCheck = null;

export const hasRecentHealth = (now = Date.now()) => now - lastHealthyAt < HEALTH_FRESH_MS;

export const checkHealthOnce = () => {
    if (!pendingHealthCheck) {
        pendingHealthCheck = checkServerHealth()
            .then(() => { lastHealthyAt = Date.now(); })
            .finally(() => { pendingHealthCheck = null; });
    }
    return pendingHealthCheck;
};

export const resetHealthCheckCache = () => {
    lastHealthyAt = 0;
    pendingHealthCheck = null;
};
