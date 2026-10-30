import { DATA_CONSENT_VERSION, normalizeDataConsent } from '../../shared/dataConsent.js';

const STORAGE_KEY = 'agropreneur.dataConsent';

// The answer is a per-device preference; it travels with each scan request so
// the server records exactly what the farmer chose at the time of the scan.
export const getDataConsent = () => {
    try {
        return normalizeDataConsent(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch {
        return normalizeDataConsent(null);
    }
};

export const setDataConsent = (aiImprovement) => {
    const value = { aiImprovement: aiImprovement === true, version: DATA_CONSENT_VERSION };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
        // Storage can be blocked; the choice then applies to this session only.
    }
    return value;
};
