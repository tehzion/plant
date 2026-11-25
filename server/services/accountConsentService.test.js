// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const query = vi.hoisted(() => vi.fn());
vi.mock('../utils/neonDatabase.js', () => ({ queryNeon: query }));
import { getAccountConsent, saveAccountConsent, resolveAccountScanConsent } from './accountConsentService.js';
import { DATA_CONSENT_VERSION } from '../../shared/dataConsent.js';
beforeEach(() => { query.mockReset(); });
it('keeps missing and obsolete account preferences opted out', async () => {
    query.mockResolvedValue({ rows: [{ data_consent: { aiImprovement: true, version: 'old' } }] });
    expect((await getAccountConsent('owner')).aiImprovement).toBe(false);
    expect(query.mock.calls[0][1]).toEqual(['owner']);
});
it('saves consent without overwriting profile details or accepting a client owner', async () => {
    query.mockResolvedValue({ rows: [] });
    await saveAccountConsent('owner', { user_id: 'other', aiImprovement: true, version: DATA_CONSENT_VERSION });
    expect(query.mock.calls[0][1][0]).toBe('owner');
    expect(query.mock.calls[0][0]).not.toContain('name =');
});
it('blocks retention after revocation on another device and when the database is unavailable', async () => {
    const submitted = { aiImprovement: true, version: DATA_CONSENT_VERSION };
    query.mockResolvedValue({ rows: [{ data_consent: { aiImprovement: false } }] });
    expect((await resolveAccountScanConsent('owner', submitted)).aiImprovement).toBe(false);
    query.mockImplementation(async () => { throw new Error('missing migration'); });
    const result = await resolveAccountScanConsent('owner', submitted);
    expect(result.aiImprovement).toBe(false);
});
