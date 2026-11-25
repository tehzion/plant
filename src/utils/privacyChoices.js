import { ANALYTICS_CONSENT_VERSION, hasAnalyticsConsent } from '../../shared/privacy.js';
const deniedForSession = new Set();
export const getAnalyticsConsent = owner => {
    if (deniedForSession.has(owner)) return false;
    try { return owner && hasAnalyticsConsent(JSON.parse(localStorage.getItem(`kanb.analytics:${owner}`) || 'null')); }
    catch { return false; }
};
export const setAnalyticsConsent = (enabled, owner) => {
    if (!owner) return false;
    try { localStorage.setItem(`kanb.analytics:${owner}`, JSON.stringify({ enabled: enabled === true, version: ANALYTICS_CONSENT_VERSION })); deniedForSession.delete(owner); return true; }
    catch { deniedForSession.add(owner); return false; }
};
