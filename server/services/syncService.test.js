// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ queryNeon: vi.fn() }));
vi.mock('../utils/neonDatabase.js', () => ({ queryNeon: mocks.queryNeon }));
import { syncOperation } from './syncService.js';

it('rejects a stale scan update as a conflict', async () => {
    mocks.queryNeon.mockResolvedValue({ rows: [] });
    await expect(syncOperation('user-a', { collection: 'scans', type: 'update', recordId: 'scan-1', expectedRevision: 2, payload: { result_json: {} } })).resolves.toEqual({ conflict: true, reason: 'stale_revision_or_missing_record' });
});
