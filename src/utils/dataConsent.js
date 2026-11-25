import { DATA_CONSENT_VERSION, normalizeDataConsent } from '../../shared/dataConsent.js';
import { neonApiRequest } from './neonApi.js';

// Consent is kept per data owner ('user:<id>' or 'guest:<id>'), so one person's
// answer never applies to another person on a shared phone. Guests keep their
// answer on the device. A signed-in farmer's answer lives on their account and
// fails closed (not consented) until the server has answered.
export const CONSENT_CHANGED = 'plant-consent-changed';
const key = owner => owner ? `agropreneur.dataConsent:${owner}` : null;
const sessionChoices = new Map();
let accountId = null;
let accountConsent = normalizeDataConsent(null);
let generation = 0;
const notify = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONSENT_CHANGED)); };
const isAccountOwner = owner => Boolean(accountId) && owner === `user:${accountId}`;

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

export const getDataConsent = (owner = 'guest:local') => {
    if (!key(owner)) return normalizeDataConsent(null);
    if (isAccountOwner(owner)) return accountConsent;
    if (sessionChoices.has(owner)) return sessionChoices.get(owner);
    try { return normalizeDataConsent(JSON.parse(localStorage.getItem(key(owner)) || 'null')); }
    catch { return normalizeDataConsent(null); }
};

export const setDataConsent = (aiImprovement, owner = 'guest:local') => {
    const value = { aiImprovement: aiImprovement === true, version: DATA_CONSENT_VERSION, chosenAt: new Date().toISOString() };
    if (!key(owner)) return normalizeDataConsent(null);
    if (isAccountOwner(owner)) { accountConsent = value; notify(); return value; }
    sessionChoices.set(owner, value);
    try { localStorage.setItem(key(owner), JSON.stringify(value)); sessionChoices.delete(owner); }
    catch { /* A blocked-storage choice lasts in this tab for this actor only. */ }
    notify();
    return value;
};

// Saves the answer where it belongs: on the account for a signed-in farmer,
// on the device for a guest.
export const saveDataConsent = async (aiImprovement, owner = 'guest:local') => {
    generation++;
    if (!isAccountOwner(owner)) return setDataConsent(aiImprovement, owner);
    const expectedAccount = accountId;
    // Revocation takes effect on this device immediately, even if the save fails.
    if (!aiImprovement) setDataConsent(false, owner);
    const result = await neonApiRequest('/api/privacy/consent', { method: 'POST', body: JSON.stringify({ aiImprovement, version: DATA_CONSENT_VERSION }) });
    if (accountId !== expectedAccount) return normalizeDataConsent(null);
    accountConsent = normalizeDataConsent(result.consent);
    notify();
    return accountConsent;
};
