// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ client: { from: vi.fn() } }));
vi.mock('../utils/supabaseAuth.js', () => ({ getServiceClient: () => mocks.client }));
import { createFollowUpEvent } from './followUpService.js';

it('rejects a follow-up event for a scan owned by another account', async () => {
    const scanQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    mocks.client.from.mockReturnValue(scanQuery);
    await expect(createFollowUpEvent('user-b', { scanId: 'scan-a', eventId: 'event-1', outcome: 'pending', severity: '' })).rejects.toMatchObject({ status: 404 });
});
