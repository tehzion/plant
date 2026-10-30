// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ queryNeon: vi.fn() }));
vi.mock('../utils/neonDatabase.js', () => ({ queryNeon: mocks.queryNeon }));
vi.mock('../utils/supabaseAuth.js', () => ({ getServiceClient: () => null }));
import { createFollowUpEvent } from './followUpService.js';

it('rejects a follow-up event for a scan owned by another account', async () => {
    mocks.queryNeon.mockResolvedValue({ rows: [] });
    await expect(createFollowUpEvent('user-b', { scanId: 'scan-a', eventId: 'event-1', outcome: 'pending', severity: '' })).rejects.toMatchObject({ status: 404 });
});
