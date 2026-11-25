import { withNeonTransaction } from '../utils/neonDatabase.js';
import { cleanCorrection, validateReason } from './mygapRecordService.js';

const canonical = value => value instanceof Date ? value.toISOString()
    : Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value ?? null;
const stable = value => JSON.stringify(canonical(value));
const equal = (a, b) => stable(a) === stable(b);

// Lock and compare the exact last-seen values, including fields edited on
// another device. Never offer a force-write that skips ownership or comparison.
export const syncMutation = async (userId, operation, config, payload) => {
    const id = String(operation.recordId);
    const expected = operation.expectedRecord;
    if (!expected || typeof expected !== 'object' || Array.isArray(expected) || String(expected.id) !== id) {
        return { conflict: true, reason: 'missing_baseline' };
    }
    const reason = operation.collection === 'logbook' ? validateReason(operation.reason) : null;
    const cleaned = operation.collection === 'logbook' ? cleanCorrection(payload) : payload;
    const fields = Object.keys(cleaned).filter(field => config.fields.includes(field) && !['id', 'revision', 'created_at'].includes(field));
    return withNeonTransaction(async client => {
        const { rows } = await client.query(`select * from public.${config.table} where id = $1 and user_id = $2 for update`, [id, userId]);
        const current = rows[0];
        if (!current) return operation.type === 'delete' ? { ok: true, duplicate: true } : { conflict: true, reason: 'record_missing' };
        const serverRecord = Object.fromEntries(config.fields.filter(field => field in current).map(field => [field, current[field]]));
        if (operation.type === 'update' && fields.length && fields.every(field => equal(current[field], cleaned[field]))) return { ok: true, duplicate: true, serverRecord };
        if (Object.keys(serverRecord).some(field => !Object.hasOwn(expected, field) || !equal(current[field], expected[field]))) {
            return { conflict: true, reason: 'record_changed', serverRecord };
        }
        if (operation.type === 'delete') {
            if (reason) await client.query(`insert into public.activity_revisions (user_id, activity_id, actor_user_id, previous_values, new_values, correction_reason)
                values ($1, $2, $1, $3::jsonb, $4::jsonb, $5)`, [userId, id, JSON.stringify(serverRecord), JSON.stringify({ deleted: true }), reason]);
            await client.query(`delete from public.${config.table} where id = $1 and user_id = $2`, [id, userId]);
            return { ok: true };
        }
        if (!fields.length) throw Object.assign(new Error('No changes supplied.'), { status: 400 });
        const assignments = fields.map((field, index) => `${field} = $${index + 3}`);
        if (operation.collection === 'logbook') assignments.push('updated_at = now()');
        if (operation.collection === 'scans') assignments.push('revision = revision + 1');
        const updated = await client.query(`update public.${config.table} set ${assignments.join(', ')} where id = $1 and user_id = $2 returning *`, [id, userId, ...fields.map(field => cleaned[field])]);
        if (reason) await client.query(`insert into public.activity_revisions (user_id, activity_id, actor_user_id, previous_values, new_values, correction_reason)
            values ($1, $2, $1, $3::jsonb, $4::jsonb, $5)`, [userId, id, JSON.stringify(serverRecord), JSON.stringify(cleaned), reason]);
        return { ok: true, revision: updated.rows[0]?.revision ?? null };
    });
};
