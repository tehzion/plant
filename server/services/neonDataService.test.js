// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A tiny in-memory stand-in for the Neon tables. It honours the parts of the
// SQL that matter for ownership: the conflict key, the owner predicate on
// upsert, primary-key violations, and owner-filtered reads.
const db = vi.hoisted(() => ({ tables: new Map(), calls: [] }));
const KEYS = { scan_history: 'id', mygap_logs: 'id', daily_notes: 'id', plots: 'id', profiles: 'user_id', mygap_checklist: 'user_id' };

vi.mock('../utils/neonDatabase.js', () => ({
    queryNeon: vi.fn(async (sql, params) => {
        db.calls.push(sql);
        const text = sql.replace(/\s+/g, ' ');
        const foreign = text.match(/^select (\w+) as id from public\.(\w+) where \w+ = any\(\$1::text\[\]\) and (\w+) <> \$2/);
        if (foreign) {
            const [, key, table, owner] = foreign;
            const rows = [...(db.tables.get(table)?.values() || [])].filter((row) => params[0].includes(String(row[key])) && row[owner] !== params[1]);
            return { rows: rows.map((row) => ({ id: row[key] })) };
        }
        const select = text.match(/^select \* from public\.(\w+) where (\w+) = \$1 and (\w+) = \$2/);
        if (select) {
            const [, table, owner, key] = select;
            const row = db.tables.get(table)?.get(String(params[1]));
            return { rows: row && row[owner] === params[0] && String(row[key]) === String(params[1]) ? [{ ...row }] : [] };
        }
        const insert = text.match(/^insert into public\.(\w+) \(([^)]+)\) values/);
        if (insert) {
            const [, table, columnList] = insert;
            const columns = columnList.split(',').map((column) => column.trim());
            const row = Object.fromEntries(columns.map((column, index) => [column, params[index]]));
            const key = KEYS[table];
            const store = db.tables.get(table) || new Map();
            db.tables.set(table, store);
            const existing = store.get(String(row[key]));
            if (!existing) { store.set(String(row[key]), row); return { rows: [{ ...row }] }; }
            if (!/on conflict/.test(text)) throw Object.assign(new Error('duplicate key'), { code: '23505' });
            const ownerGuard = text.match(/where (\w+)\.(\w+) = excluded\.(\w+)/);
            if (!ownerGuard || existing[ownerGuard[2]] !== row[ownerGuard[2]]) {
                // Without a guard this is exactly the cross-user overwrite the
                // audit described; record it so the test can detect it.
                if (!ownerGuard) { store.set(String(row[key]), { ...existing, ...row, user_id: existing.user_id }); return { rows: [{ ...store.get(String(row[key])) }] }; }
                return { rows: [] };
            }
            const updated = { ...existing, ...row };
            store.set(String(row[key]), updated);
            return { rows: [{ ...updated }] };
        }
        throw new Error(`Unhandled SQL in test: ${text.slice(0, 80)}`);
    }),
}));

import { bulkInsertUserRows, getUserRow, insertUserRow } from './neonDataService.js';

const FARMER_A = '11111111-1111-4111-8111-111111111111';
const FARMER_B = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
    db.tables.clear();
    db.calls.length = 0;
});

describe('cross-user data protection', () => {
    it('refuses to upsert over another farmer\'s record and leaves it unchanged', async () => {
        await insertUserRow('scan_history', FARMER_A, { id: 'scan-a', disease: 'Leaf spot' });
        await expect(insertUserRow('scan_history', FARMER_B, { id: 'scan-a', disease: 'Tampered' }, { upsert: true }))
            .rejects.toMatchObject({ status: 409, code: 'RECORD_ID_CONFLICT' });
        expect(db.tables.get('scan_history').get('scan-a')).toMatchObject({ user_id: FARMER_A, disease: 'Leaf spot' });
    });

    it('does not reveal another farmer\'s row through the upsert response', async () => {
        await insertUserRow('daily_notes', FARMER_A, { id: 'note-a', note: 'private note' });
        const attempt = insertUserRow('daily_notes', FARMER_B, { id: 'note-a' }, { upsert: true });
        await expect(attempt).rejects.toThrow('This record ID is already in use.');
        await expect(attempt).rejects.not.toHaveProperty('row');
    });

    it('still lets a farmer upsert their own record', async () => {
        await insertUserRow('plots', FARMER_A, { id: 'plot-1', name: 'Block A' });
        const row = await insertUserRow('plots', FARMER_A, { id: 'plot-1', name: 'Block A2' }, { upsert: true });
        expect(row).toMatchObject({ id: 'plot-1', name: 'Block A2', user_id: FARMER_A });
    });

    it('ignores a client-supplied owner ID and writes to the verified account', async () => {
        const row = await insertUserRow('mygap_logs', FARMER_B, { id: 'log-1', user_id: FARMER_A, type: 'spray' });
        expect(row.user_id).toBe(FARMER_B);
        expect(await getUserRow('mygap_logs', FARMER_A, 'log-1')).toBeNull();
    });

    it('maps a plain insert collision to a generic conflict instead of a database error', async () => {
        await insertUserRow('plots', FARMER_A, { id: 'plot-x', name: 'A' });
        await expect(insertUserRow('plots', FARMER_B, { id: 'plot-x', name: 'B' })).rejects.toMatchObject({ status: 409 });
    });

    it('rejects a whole bulk batch containing a foreign ID before writing anything', async () => {
        await insertUserRow('scan_history', FARMER_A, { id: 'shared-id', disease: 'Original' });
        await expect(bulkInsertUserRows('scan_history', FARMER_B, [
            { id: 'b-1', disease: 'Mine' },
            { id: 'shared-id', disease: 'Overwrite attempt' },
        ], { upsert: true })).rejects.toMatchObject({ status: 409 });
        expect(db.tables.get('scan_history').has('b-1')).toBe(false);
        expect(db.tables.get('scan_history').get('shared-id')).toMatchObject({ user_id: FARMER_A, disease: 'Original' });
    });

    it('accepts a bulk batch of the farmer\'s own records', async () => {
        const rows = await bulkInsertUserRows('mygap_logs', FARMER_A, [{ id: 'l1' }, { id: 'l2' }], { upsert: true });
        expect(rows.map((row) => row.user_id)).toEqual([FARMER_A, FARMER_A]);
    });

    it('scopes single-owner tables such as profiles to the session user', async () => {
        await insertUserRow('profiles', FARMER_A, { user_id: FARMER_A, name: 'A' }, { upsert: true });
        const row = await insertUserRow('profiles', FARMER_B, { user_id: FARMER_A, name: 'B' }, { upsert: true });
        expect(row.user_id).toBe(FARMER_B);
        expect(db.tables.get('profiles').get(FARMER_A)).toMatchObject({ name: 'A' });
    });

    it('validates record payloads and IDs', async () => {
        await expect(insertUserRow('plots', FARMER_A, null)).rejects.toMatchObject({ status: 400 });
        await expect(insertUserRow('plots', FARMER_A, { id: { $ne: 1 } })).rejects.toMatchObject({ status: 400 });
        await expect(bulkInsertUserRows('plots', FARMER_A, [1, 2])).rejects.toMatchObject({ status: 400 });
        await expect(insertUserRow('unknown_table', FARMER_A, {})).rejects.toMatchObject({ status: 400 });
    });
});
