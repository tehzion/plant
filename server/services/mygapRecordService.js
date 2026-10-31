import { queryNeon, withNeonTransaction } from '../utils/neonDatabase.js';

// Corrections to myGAP logbook entries. Auditors expect records to be
// corrected traceably, so every edit or deletion keeps the previous values and
// the farmer's reason in activity_revisions before the row changes.

export const CORRECTABLE_FIELDS = Object.freeze([
    'type', 'notes', 'activity_date', 'plot_id', 'crop', 'product_used', 'quantity', 'operator',
    'active_ingredient', 'registration_no', 'area_treated', 'target_pest', 'phi_days', 'linked_scan_id',
]);
const LOG_TYPES = ['pesticide', 'fertilizer', 'harvest', 'irrigation'];
const MAX_LENGTH = { notes: 4000, activity_date: 10, plot_id: 200, quantity: 100, operator: 120, registration_no: 60, area_treated: 60 };

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

export const validateReason = (reason) => {
    const value = String(reason ?? '').trim();
    if (value.length < 3) throw fail('Give a short reason for the change.');
    return value.slice(0, 500);
};

const normalizeValue = (field, value) => {
    if (value === undefined) return undefined;
    if (field === 'phi_days') {
        if (value === null || value === '') return null;
        const days = Number(value);
        if (!Number.isInteger(days) || days < 0 || days > 3650) throw fail('PHI must be a whole number of days from 0 to 3650.');
        return days;
    }
    if (field === 'type') {
        if (!LOG_TYPES.includes(value)) throw fail('Unknown record type.');
        return value;
    }
    if (field === 'activity_date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw fail('Activity date must be YYYY-MM-DD.');
    const text = value == null ? '' : String(value).trim();
    if (field === 'notes') return text.slice(0, MAX_LENGTH.notes);
    return text ? text.slice(0, MAX_LENGTH[field] || 200) : null;
};

export const cleanCorrection = (changes = {}) => {
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw fail('Changes must be an object.');
    const cleaned = {};
    for (const field of CORRECTABLE_FIELDS) {
        const value = normalizeValue(field, changes[field]);
        if (value !== undefined) cleaned[field] = value;
    }
    return cleaned;
};

const comparable = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value ?? null);

const lockOwnedRow = async (client, userId, id) => {
    const { rows } = await client.query('select * from public.mygap_logs where id = $1 and user_id = $2 for update', [String(id), userId]);
    if (!rows[0]) throw fail('Record not found.', 404);
    return rows[0];
};

const recordRevision = (client, { userId, id, previous, next, reason }) => client.query(
    `insert into public.activity_revisions (user_id, activity_id, actor_user_id, previous_values, new_values, correction_reason)
     values ($1, $2, $1, $3::jsonb, $4::jsonb, $5)`,
    [userId, String(id), JSON.stringify(previous), JSON.stringify(next), reason],
);

export const correctMygapLog = async (userId, id, changes, reason) => {
    if (!userId) throw fail('Sign-in is required.', 401);
    const correctionReason = validateReason(reason);
    const cleaned = cleanCorrection(changes);
    return withNeonTransaction(async (client) => {
        const current = await lockOwnedRow(client, userId, id);
        const changedFields = Object.keys(cleaned).filter((field) => comparable(current[field]) !== comparable(cleaned[field]));
        if (!changedFields.length) return current;
        const previous = Object.fromEntries(changedFields.map((field) => [field, comparable(current[field])]));
        const next = Object.fromEntries(changedFields.map((field) => [field, cleaned[field]]));
        const assignments = changedFields.map((field, index) => `${field} = $${index + 3}`);
        const { rows } = await client.query(
            `update public.mygap_logs set ${assignments.join(', ')}, updated_at = now() where id = $1 and user_id = $2 returning *`,
            [String(id), userId, ...changedFields.map((field) => cleaned[field])],
        );
        await recordRevision(client, { userId, id, previous, next, reason: correctionReason });
        return rows[0];
    });
};

export const deleteMygapLog = async (userId, id, reason) => {
    if (!userId) throw fail('Sign-in is required.', 401);
    const correctionReason = validateReason(reason);
    return withNeonTransaction(async (client) => {
        const current = await lockOwnedRow(client, userId, id);
        const { user_id: _owner, ...previous } = current;
        await recordRevision(client, { userId, id, previous, next: { deleted: true }, reason: correctionReason });
        await client.query('delete from public.mygap_logs where id = $1 and user_id = $2', [String(id), userId]);
        return { id: String(id), deleted: true };
    });
};

export const listMygapLogRevisions = async (userId, id) => {
    if (!userId) throw fail('Sign-in is required.', 401);
    const { rows } = await queryNeon(
        `select previous_values, new_values, correction_reason, created_at from public.activity_revisions
         where user_id = $1 and activity_id = $2 order by created_at desc limit 50`,
        [userId, String(id)],
    );
    return rows;
};
