import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ client: { query: vi.fn() }, queryNeon: vi.fn() }));
vi.mock('../utils/neonDatabase.js', () => ({
    queryNeon: db.queryNeon,
    withNeonTransaction: async (callback) => callback(db.client),
}));

const { cleanCorrection, correctMygapLog, deleteMygapLog, validateReason } = await import('./mygapRecordService.js');

const USER = '11111111-1111-4111-8111-111111111111';
const row = { id: 'log-1', user_id: USER, type: 'pesticide', notes: 'Sprayed', product_used: 'Mancozeb', phi_days: 7, activity_date: new Date('2026-10-01T00:00:00Z') };

describe('myGAP record corrections', () => {
    beforeEach(() => {
        db.client.query.mockReset();
    });

    it('requires a reason and validates fields', () => {
        expect(() => validateReason('')).toThrow(/reason/);
        expect(() => cleanCorrection({ phi_days: '-1' })).toThrow(/PHI/);
        expect(() => cleanCorrection({ type: 'party' })).toThrow(/type/);
        expect(cleanCorrection({ phi_days: '14', product_used: '  Copper  ', user_id: 'someone-else' })).toEqual({ phi_days: 14, product_used: 'Copper' });
        expect(() => cleanCorrection({ amount: '-2' })).toThrow(/Amount/);
        expect(cleanCorrection({ type: 'purchase', amount: '2.5', unit: 'kg', lot_code: ' L-1 ' })).toEqual({ type: 'purchase', amount: 2.5, unit: 'kg', lot_code: 'L-1' });
    });

    it('updates only changed fields and stores the previous values with the reason', async () => {
        db.client.query
            .mockResolvedValueOnce({ rows: [row] })
            .mockResolvedValueOnce({ rows: [{ ...row, phi_days: 14 }] })
            .mockResolvedValueOnce({ rows: [] });
        const updated = await correctMygapLog(USER, 'log-1', { phi_days: '14', product_used: 'Mancozeb' }, 'Read the label again');
        expect(updated.phi_days).toBe(14);
        const [lockSql, lockParams] = db.client.query.mock.calls[0];
        expect(lockSql).toMatch(/for update/);
        expect(lockParams).toEqual(['log-1', USER]);
        const [updateSql, updateParams] = db.client.query.mock.calls[1];
        expect(updateSql).toMatch(/set phi_days = \$3, updated_at = now\(\) where id = \$1 and user_id = \$2/);
        expect(updateParams).toEqual(['log-1', USER, 14]);
        const [, revisionParams] = db.client.query.mock.calls[2];
        expect(JSON.parse(revisionParams[2])).toEqual({ phi_days: 7 });
        expect(JSON.parse(revisionParams[3])).toEqual({ phi_days: 14 });
        expect(revisionParams[4]).toBe('Read the label again');
    });

    it('refuses to touch a record owned by someone else', async () => {
        db.client.query.mockResolvedValueOnce({ rows: [] });
        await expect(correctMygapLog(USER, 'log-1', { notes: 'x' }, 'fix typo')).rejects.toMatchObject({ status: 404 });
        expect(db.client.query).toHaveBeenCalledTimes(1);
    });

    it('keeps the full previous record when deleting', async () => {
        db.client.query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValue({ rows: [] });
        await expect(deleteMygapLog(USER, 'log-1', 'Duplicate entry')).resolves.toEqual({ id: 'log-1', deleted: true });
        const [, revisionParams] = db.client.query.mock.calls[1];
        expect(JSON.parse(revisionParams[2])).toMatchObject({ id: 'log-1', product_used: 'Mancozeb' });
        expect(JSON.parse(revisionParams[2])).not.toHaveProperty('user_id');
        expect(JSON.parse(revisionParams[3])).toEqual({ deleted: true });
        expect(db.client.query.mock.calls[2][0]).toMatch(/^delete from public.mygap_logs where id = \$1 and user_id = \$2/);
    });
});
