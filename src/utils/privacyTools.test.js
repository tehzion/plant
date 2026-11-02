import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), clear: vi.fn(), snapshot: vi.fn() }));
vi.mock('./indexedDbStorage.js', () => ({ isIndexedDbAvailable: () => true, exportOwnerDeviceData: mocks.snapshot, clearOwnerDeviceData: mocks.clear }));
vi.mock('./neonApi.js', () => ({ fetchNeonRows: mocks.fetch }));
vi.mock('./localStorage.js', () => ({ getGuestId: () => 'g1' }));
import { buildPrivacyExport, clearPrivacyDeviceData, privacyRequestLink } from './privacyTools.js';
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); mocks.snapshot.mockResolvedValue({ records: [], photos: [], pendingOps: [] }); mocks.clear.mockResolvedValue(); mocks.fetch.mockResolvedValue([]); });
it('uses the approved contact and creates a draft rather than submitting a request', () => {
    const link = privacyRequestLink('Withdraw consent');
    expect(link).toMatch(/^mailto:privacy@infinitas.com.my\?/);
    expect(decodeURIComponent(link)).toContain('Withdraw consent');
    expect(mocks.fetch).not.toHaveBeenCalled();
});
it('exports beyond the first page and states its exclusions', async () => {
    mocks.fetch.mockImplementation(async (table, { offset }) => table === 'scan_history' ? offset === 0 ? Array.from({ length: 500 }, (_, i) => ({ id: i })) : [{ id: 500 }] : []);
    const exported = await buildPrivacyExport({ owner: 'user:A', userId: 'A' });
    expect(exported.cloud.scan_history).toHaveLength(501);
    expect(exported.excluded).toContain('Authentication-provider records');
    expect(exported.fullAccessContact).toBe('privacy@infinitas.com.my');
});
it('does not download a result after the actor changes', async () => {
    const assertOwner = vi.fn(() => { throw new Error('changed'); });
    await expect(buildPrivacyExport({ owner: 'user:A', userId: 'A', assertOwner })).rejects.toThrow('changed');
    expect(mocks.fetch).not.toHaveBeenCalled();
});
it('clears only the selected actor and keeps unrelated account/guest records', async () => {
    localStorage.setItem('kanb_assistant_chat_v2:user:A', 'private-A');
    localStorage.setItem('kanb_assistant_chat_v2:user:B', 'private-B');
    localStorage.setItem('sea_plant_scan_history', 'guest records');
    await clearPrivacyDeviceData('user:A');
    expect(mocks.clear).toHaveBeenCalledWith('user:A');
    expect(localStorage.getItem('kanb_assistant_chat_v2:user:A')).toBeNull();
    expect(localStorage.getItem('kanb_assistant_chat_v2:user:B')).toBe('private-B');
    expect(localStorage.getItem('sea_plant_scan_history')).toBe('guest records');
});
