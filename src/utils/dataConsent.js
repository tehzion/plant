import { DATA_CONSENT_VERSION, normalizeDataConsent } from '../../shared/dataConsent.js';
const key = owner => owner ? `agropreneur.dataConsent:${owner}` : null;
const sessionChoices = new Map();
export const getDataConsent = (owner = 'guest:local') => {
    if (!key(owner)) return normalizeDataConsent(null);
    if (sessionChoices.has(owner)) return sessionChoices.get(owner);
    try { return normalizeDataConsent(JSON.parse(localStorage.getItem(key(owner)) || 'null')); }
    catch { return normalizeDataConsent(null); }
};
export const setDataConsent = (aiImprovement, owner = 'guest:local') => {
    const value = { aiImprovement: aiImprovement === true, version: DATA_CONSENT_VERSION, chosenAt: new Date().toISOString() };
    if (!key(owner)) return normalizeDataConsent(null);
    sessionChoices.set(owner, value);
    try { localStorage.setItem(key(owner), JSON.stringify(value)); sessionChoices.delete(owner); }
    catch { /* A blocked-storage choice lasts in this tab for this actor only. */ }
    return value;
};
