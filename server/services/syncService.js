import { queryNeon } from '../utils/neonDatabase.js';
import { foldOptionalColumns, isUndefinedColumnError, OPTIONAL_COLUMNS } from '../utils/optionalColumns.js';

const TABLES = {
    scans: { table: 'scan_history', fields: ['id', 'disease', 'confidence', 'severity', 'category', 'scale', 'location_name', 'plot_id', 'result_json', 'image_path', 'leaf_image_path', 'created_at', 'revision'] },
    logbook: { table: 'mygap_logs', fields: ['id', 'type', 'notes', 'activity_date', 'plot_id', 'crop', 'product_used', 'quantity', 'operator', 'active_ingredient', 'registration_no', 'area_treated', 'target_pest', 'phi_days', 'linked_scan_id', 'amount', 'unit', 'supplier', 'price', 'buyer', 'lot_code', 'topic', 'attendees', 'created_at'] },
    notes: { table: 'daily_notes', fields: ['id', 'note', 'activity_type', 'plot_id', 'chemical_name', 'chemical_qty', 'application_timing', 'temperature_am', 'humidity', 'growth_stage', 'pest_notes', 'disease_incidence', 'disease_name_observed', 'scout_severity', 'kg_harvested', 'quality_grade', 'price_per_kg', 'buyer_name', 'expense_amount', 'expense_category', 'pruned_count', 'pruning_type', 'inspection_type', 'inspection_status', 'photo_path', 'created_at'] },
    plots: { table: 'plots', fields: ['id', 'name', 'crop_type', 'area', 'unit', 'soil_ph', 'npk_n', 'npk_p', 'npk_k', 'created_at'] },
    checklist: { table: 'mygap_checklist', fields: ['state', 'updated_at'], singleton: true },
};

const identifier = (value) => {
    if (!/^[a-z_]+$/.test(value)) throw new Error('Unsafe database identifier.');
    return value;
};

const cleanPayload = (collection, payload = {}) => {
    const config = TABLES[collection];
    if (!config || !payload || typeof payload !== 'object') return null;
    return Object.fromEntries(config.fields.filter((field) => payload[field] !== undefined).map((field) => [field, payload[field]]));
};

const mapDatabaseError = (error) => {
    if (!error || error.status) return error;
    const mapped = new Error(error.message || 'Sync failed.');
    mapped.status = error.code === '23505' ? 409 : error.code === '23503' ? 400 : 500;
    return mapped;
};

// Checklist state is one row per user. A queued offline change only replaces
// the stored state when it is at least as new, so an older device cannot
// silently overwrite a newer checklist.
const syncSingleton = async (userId, config, operation) => {
    if (operation.type !== 'update' || !operation.payload || typeof operation.payload !== 'object') {
        const error = new Error('Invalid sync operation.');
        error.status = 400;
        throw error;
    }
    const state = operation.payload.state ?? operation.payload;
    const updatedAt = Number.isFinite(Date.parse(operation.payload.updated_at)) ? operation.payload.updated_at : new Date().toISOString();
    const result = await queryNeon(
        `insert into public.${identifier(config.table)} (user_id, state, updated_at) values ($1, $2, $3)
         on conflict (user_id) do update set state = excluded.state, updated_at = excluded.updated_at
         where ${identifier(config.table)}.updated_at <= excluded.updated_at
         returning user_id`,
        [userId, state, updatedAt],
    );
    if (!result.rows.length) return { conflict: true, reason: 'newer_record_exists' };
    return { ok: true };
};

export const syncOperation = async (userId, operation = {}) => {
    const config = TABLES[operation.collection];
    if (!userId || !config || !['create', 'update', 'delete'].includes(operation.type) || !operation.recordId) {
        const error = new Error('Invalid sync operation.');
        error.status = 400;
        throw error;
    }
    const table = identifier(config.table);
    const id = String(operation.recordId);
    if (id.length > 200) {
        const error = new Error('Invalid sync operation.');
        error.status = 400;
        throw error;
    }
    if (config.singleton) return syncSingleton(userId, config, operation).catch((error) => { throw mapDatabaseError(error); });
    const expectedRevision = Number.isInteger(operation.expectedRevision) ? operation.expectedRevision : null;
    try {
        if (operation.type === 'create') {
            // Creates are idempotent: replaying an operation after an
            // interrupted sync must not overwrite a record that has since been
            // edited elsewhere, and must never touch another account's row.
            const payload = { ...cleanPayload(operation.collection, operation.payload), id };
            if (operation.collection === 'scans' && payload.revision == null) payload.revision = 0;
            const fields = ['user_id', ...Object.keys(payload).filter((field) => config.fields.includes(field))];
            const values = [userId, ...fields.slice(1).map((field) => payload[field])];
            const placeholders = values.map((_, index) => `$${index + 1}`);
            const returning = operation.collection === 'scans' ? 'id, user_id, revision' : 'id, user_id';
            const result = await queryNeon(
                `insert into public.${table} (${fields.map(identifier).join(', ')}) values (${placeholders.join(', ')})
                 on conflict (id) do nothing
                 returning ${returning}`,
                values,
            );
            if (result.rows.length) return { ok: true, revision: result.rows[0].revision ?? null };
            const existing = await queryNeon(`select user_id from public.${table} where id = $1`, [id]);
            if (existing.rows[0]?.user_id === userId) return { ok: true, duplicate: true };
            return { conflict: true, reason: 'ownership' };
        }

        const payload = cleanPayload(operation.collection, operation.payload) || {};
        if (operation.type === 'delete') {
            const values = [id, userId];
            let sql = `delete from public.${table} where id = $1 and user_id = $2`;
            if (operation.collection === 'scans' && expectedRevision != null) {
                values.push(expectedRevision);
                sql += ' and revision = $3';
            }
            const result = await queryNeon(`${sql} returning id`, values);
            if (!result.rows.length) return { conflict: true, reason: 'stale_revision_or_missing_record' };
            return { ok: true };
        }

        const fields = Object.keys(payload).filter((field) => config.fields.includes(field) && field !== 'id');
        if (!fields.length) return { conflict: true, reason: 'stale_revision_or_missing_record' };
        const values = fields.map((field) => payload[field]);
        values.push(id, userId);
        let sql = `update public.${table} set ${fields.map((field, index) => `${identifier(field)} = $${index + 1}`).join(', ')} where id = $${values.length - 1} and user_id = $${values.length}`;
        if (operation.collection === 'scans' && expectedRevision != null) {
            values.push(expectedRevision);
            sql += ` and revision = $${values.length}`;
        }
        const result = await queryNeon(`${sql} returning ${operation.collection === 'scans' ? 'id, revision' : 'id'}`, values);
        if (!result.rows.length) return { conflict: true, reason: 'stale_revision_or_missing_record' };
        return { ok: true, revision: result.rows[0].revision ?? null };
    } catch (error) {
        const optional = OPTIONAL_COLUMNS[config.table] || [];
        if (isUndefinedColumnError(error) && operation.payload && optional.some((field) => operation.payload[field] != null)) {
            return syncOperation(userId, { ...operation, payload: foldOptionalColumns(config.table, operation.payload) });
        }
        throw mapDatabaseError(error);
    }
};
