// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ client: { from: vi.fn() } }));
vi.mock('../utils/supabaseAuth.js', () => ({ getServiceClient: () => mocks.client }));
import { syncOperation } from './syncService.js';

it('rejects a stale scan update as a conflict', async () => {
    const query = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    mocks.client.from.mockReturnValue(query);
    await expect(syncOperation('user-a', { collection: 'scans', type: 'update', recordId: 'scan-1', expectedRevision: 2, payload: { result_json: {} } })).resolves.toEqual({ conflict: true, reason: 'stale_revision_or_missing_record' });
});
