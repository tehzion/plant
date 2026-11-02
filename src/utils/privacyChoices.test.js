import { beforeEach, expect, it, vi } from 'vitest';
import { getAnalyticsConsent, setAnalyticsConsent } from './privacyChoices.js';
import { getDataConsent, setDataConsent } from './dataConsent.js';
import { DATA_CONSENT_VERSION } from '../../shared/dataConsent.js';
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
it('never inherits another actor or legacy unscoped consent', () => {
    localStorage.setItem('agropreneur.dataConsent', JSON.stringify({ aiImprovement: true, version: DATA_CONSENT_VERSION }));
    expect(getDataConsent('user:B').aiImprovement).toBe(false);
    setDataConsent(true, 'user:A');
    expect(getDataConsent('user:A').aiImprovement).toBe(true);
    expect(getDataConsent('user:B').aiImprovement).toBe(false);
    expect(getDataConsent(null).aiImprovement).toBe(false);
});
it('keeps analytics off by default and separate from photo sharing', () => {
    expect(getAnalyticsConsent('user:C')).toBe(false);
    setDataConsent(true, 'user:C');
    expect(getAnalyticsConsent('user:C')).toBe(false);
    setAnalyticsConsent(true, 'user:C');
    expect(getAnalyticsConsent('user:C')).toBe(true);
    expect(getAnalyticsConsent('user:D')).toBe(false);
});
it('fails closed for analytics if withdrawing cannot persist', () => {
    setAnalyticsConsent(true, 'user:blocked');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(setAnalyticsConsent(false, 'user:blocked')).toBe(false);
    expect(getAnalyticsConsent('user:blocked')).toBe(false);
});
