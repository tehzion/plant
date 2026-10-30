// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ queryNeon: vi.fn() }));
vi.mock('../utils/neonDatabase.js', () => ({ queryNeon: mocks.queryNeon }));
import { syncOperation } from './syncService.js';

it('rejects a stale scan update as a conflict', async () => {
    mocks.queryNeon.mockResolvedValue({ rows: [] });
    await expect(syncOperation('user-a', { collection: 'scans', type: 'update', recordId: 'scan-1', expectedRevision: 2, payload: { result_json: {} } })).resolves.toEqual({ conflict: true, reason: 'stale_revision_or_missing_record' });
});

describe('offline replay safety', () => {
    const USER = 'user-a';
    beforeEach(() => mocks.queryNeon.mockReset());

    it('creates without overwriting: a replayed create is acknowledged as a duplicate', async () => {
        mocks.queryNeon
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ user_id: USER }] });
        const result = await syncOperation(USER, { collection: 'notes', type: 'create', recordId: 'note-1', payload: { note: 'replayed' } });
        expect(result).toEqual({ ok: true, duplicate: true });
        expect(mocks.queryNeon.mock.calls[0][0]).toMatch(/on conflict \(id\) do nothing/);
        expect(mocks.queryNeon.mock.calls[0][0]).not.toMatch(/do update/);
    });

    it('reports an ID owned by another account as a conflict', async () => {
        mocks.queryNeon
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ user_id: 'user-b' }] });
        await expect(syncOperation(USER, { collection: 'plots', type: 'create', recordId: 'plot-1', payload: { name: 'x' } }))
            .resolves.toEqual({ conflict: true, reason: 'ownership' });
    });

    it('does not let an older offline checklist overwrite a newer one', async () => {
        mocks.queryNeon.mockResolvedValueOnce({ rows: [] });
        const result = await syncOperation(USER, { collection: 'checklist', type: 'update', recordId: 'current', payload: { state: { a: true }, updated_at: '2026-01-01T00:00:00Z' } });
        expect(result).toEqual({ conflict: true, reason: 'newer_record_exists' });
        expect(mocks.queryNeon.mock.calls[0][0]).toMatch(/where mygap_checklist\.updated_at <= excluded\.updated_at/);
    });

    it('keeps structured myGAP details in the notes if migration 0002 is not applied yet', async () => {
        mocks.queryNeon
            .mockRejectedValueOnce(Object.assign(new Error('column "crop" does not exist'), { code: '42703' }))
            .mockResolvedValueOnce({ rows: [{ id: 'log-1', user_id: USER }] });
        const result = await syncOperation(USER, { collection: 'logbook', type: 'create', recordId: 'log-1', payload: { type: 'spray', notes: 'Block A', crop: 'Chilli', quantity: '2 tanks' } });
        expect(result.ok).toBe(true);
        const [sql, values] = mocks.queryNeon.mock.calls[1];
        expect(sql).not.toMatch(/crop/);
        expect(values).toContain('Block A\n[Crop: Chilli | Quantity recorded: 2 tanks]');
    });
});
