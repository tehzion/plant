import { DATA_CONSENT_VERSION, normalizeDataConsent } from '../../shared/dataConsent.js';
import { neonApiRequest } from './neonApi.js';

const STORAGE_KEY = 'agropreneur.dataConsent';
export const CONSENT_CHANGED = 'plant-consent-changed';
let accountId = null;
let accountConsent = normalizeDataConsent(null);
let generation = 0;
const notify = () => window.dispatchEvent(new Event(CONSENT_CHANGED));

export const setConsentAccount = async (userId) => {
    const requestGeneration = ++generation;
    accountId = userId && userId !== 'demo-user-123' ? userId : null;
    accountConsent = normalizeDataConsent(null);
    notify();
    const expectedAccount = accountId;
    if (!expectedAccount) return;
    try {
        const result = await neonApiRequest('/api/privacy/consent', { method: 'GET' });
        if (accountId === expectedAccount && generation === requestGeneration) { accountConsent = normalizeDataConsent(result.consent); notify(); }
    } catch { /* Fail closed when offline or before migration. */ }
};

// The answer is a per-device preference; it travels with each scan request so
// the server records exactly what the farmer chose at the time of the scan.
export const getDataConsent = () => {
    if (accountId) return accountConsent;
    try {
        return normalizeDataConsent(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch {
        return normalizeDataConsent(null);
    }
};

export const setDataConsent = (aiImprovement) => {
    const value = { aiImprovement: aiImprovement === true, version: DATA_CONSENT_VERSION };
    if (accountId) { accountConsent = value; notify(); return value; }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
        // Storage can be blocked; the choice then applies to this session only.
    }
    return value;
};

export const saveDataConsent = async (aiImprovement) => {
    generation++;
    if (!accountId) { const value = setDataConsent(aiImprovement); notify(); return value; }
    const expectedAccount = accountId;
    // Revocation takes effect on this device immediately, even if the save fails.
    if (!aiImprovement) setDataConsent(false);
    const result = await neonApiRequest('/api/privacy/consent', { method: 'POST', body: JSON.stringify({ aiImprovement, version: DATA_CONSENT_VERSION }) });
    if (accountId !== expectedAccount) return normalizeDataConsent(null);
    accountConsent = normalizeDataConsent(result.consent);
    notify();
    return accountConsent;
};
