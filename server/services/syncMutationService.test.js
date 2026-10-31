// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../utils/neonDatabase.js', () => ({ queryNeon: vi.fn(), withNeonTransaction: fn => fn(db) }));
import { syncMutation } from './syncMutationService.js';
const config = { table: 'mygap_logs', fields: ['id', 'type', 'notes', 'revision'] };
const base = { id: 'log-1', type: 'fertilizer', notes: 'old', revision: 0 };
const op = { collection: 'logbook', type: 'update', recordId: base.id, expectedRecord: base, reason: 'Correct field note' };
beforeEach(() => { db.query.mockReset(); });
it('rejects a stale correction and returns only the owner-scoped server record', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...base, notes: 'other device' }] });
    expect(await syncMutation('owner', op, config, { notes: 'mine' })).toMatchObject({ conflict: true, reason: 'record_changed' });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0]).toEqual([expect.stringContaining('user_id = $2 for update'), ['log-1', 'owner']]);
});
it('records an audit revision for a successful offline correction', async () => {
    db.query.mockResolvedValueOnce({ rows: [base] }).mockResolvedValue({ rows: [{ ...base, notes: 'mine' }] });
    expect(await syncMutation('owner', op, config, { notes: 'mine' })).toMatchObject({ ok: true });
    expect(db.query.mock.calls[2][0]).toContain('activity_revisions');
    expect(db.query.mock.calls[2][1]).toContain(op.reason);
});
it('acknowledges an already-applied correction without another audit revision', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...base, notes: 'mine' }] });
    expect(await syncMutation('owner', op, config, { notes: 'mine' })).toMatchObject({ duplicate: true });
    expect(db.query).toHaveBeenCalledTimes(1);
});
it('never deletes an owner record when its last-seen snapshot has changed', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...base, revision: 1 }] });
    expect(await syncMutation('owner', { ...op, type: 'delete' }, config, {})).toMatchObject({ conflict: true });
    expect(db.query).toHaveBeenCalledTimes(1);
});
