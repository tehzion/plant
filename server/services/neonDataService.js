import crypto from 'node:crypto';
import { queryNeon } from '../utils/neonDatabase.js';

const DATASETS = Object.freeze({
    profiles: {
        table: 'profiles', owner: 'user_id', key: 'user_id',
        fields: ['name', 'contact', 'crops', 'member_since', 'updated_at'],
        order: 'updated_at',
    },
    scan_history: {
        table: 'scan_history', owner: 'user_id', key: 'id',
        fields: ['id', 'disease', 'confidence', 'severity', 'category', 'scale', 'location_name', 'plot_id', 'result_json', 'image_url', 'leaf_image_url', 'image_path', 'leaf_image_path', 'created_at', 'revision'],
        order: 'created_at',
    },
    mygap_logs: {
        table: 'mygap_logs', owner: 'user_id', key: 'id',
        fields: ['id', 'type', 'notes', 'created_at'], order: 'created_at',
    },
    mygap_checklist: {
        table: 'mygap_checklist', owner: 'user_id', key: 'user_id',
        fields: ['state', 'updated_at'], order: 'updated_at',
    },
    daily_notes: {
        table: 'daily_notes', owner: 'user_id', key: 'id',
        fields: ['id', 'note', 'activity_type', 'plot_id', 'chemical_name', 'chemical_qty', 'application_timing', 'temperature_am', 'humidity', 'growth_stage', 'pest_notes', 'disease_incidence', 'disease_name_observed', 'scout_severity', 'kg_harvested', 'quality_grade', 'price_per_kg', 'buyer_name', 'expense_amount', 'expense_category', 'pruned_count', 'pruning_type', 'inspection_type', 'inspection_status', 'photo_url', 'photo_path', 'created_at'],
        order: 'created_at',
    },
    plots: {
        table: 'plots', owner: 'user_id', key: 'id',
        fields: ['id', 'name', 'crop_type', 'area', 'unit', 'soil_ph', 'npk_n', 'npk_p', 'npk_k', 'created_at'], order: 'created_at',
    },
});

const TELEMETRY_DATASETS = Object.freeze({
    product_events: {
        table: 'product_events',
        fields: ['scan_id', 'user_id', 'guest_id', 'event_type', 'product_id', 'product_name', 'product_url', 'recommendation_intent', 'recommendation_role', 'disease', 'crop', 'confidence', 'metadata'],
    },
    consultation_leads: {
        table: 'consultation_leads',
        fields: ['scan_id', 'user_id', 'guest_id', 'disease', 'crop', 'confidence', 'phone', 'contact_intent', 'recommendation_intent', 'severity', 'status', 'location_name', 'source', 'metadata'],
    },
});

const identifier = (value) => {
    if (!/^[a-z_]+$/.test(value)) throw new Error('Unsafe database identifier.');
    return value;
};

const datasetFor = (table) => {
    const config = DATASETS[table];
    if (!config) {
        const error = new Error('Unsupported data collection.');
        error.status = 400;
        throw error;
    }
    return config;
};

const writeFields = (config, payload = {}) => config.fields
    .filter((field) => Object.prototype.hasOwnProperty.call(payload, field) && payload[field] !== undefined)
    .map((field) => ({ field, value: payload[field] }));

const stripCount = (rows) => {
    const count = Number(rows[0]?.__total_count || 0);
    return { rows: rows.map(({ __total_count: _count, ...row }) => row), count };
};

export const listUserRows = async (table, userId, { limit = 500, offset = 0 } = {}) => {
    const config = datasetFor(table);
    const pageSize = Math.min(Math.max(Number(limit) || 500, 1), 500);
    const start = Math.max(Number(offset) || 0, 0);
    const orderColumn = identifier(config.order);
    const keyColumn = identifier(config.key);
    const sql = `select *, count(*) over()::int as __total_count
        from public.${identifier(config.table)}
        where ${identifier(config.owner)} = $1
        order by ${orderColumn} desc nulls last, ${keyColumn} desc
        limit $2 offset $3`;
    const result = await queryNeon(sql, [userId, pageSize, start]);
    return stripCount(result.rows || []);
};

export const getUserRow = async (table, userId, id) => {
    const config = datasetFor(table);
    const keyColumn = identifier(config.key);
    const result = await queryNeon(
        `select * from public.${identifier(config.table)} where ${identifier(config.owner)} = $1 and ${keyColumn} = $2 limit 1`,
        [userId, id],
    );
    return result.rows[0] || null;
};

export const insertUserRow = async (table, userId, payload = {}, { upsert = false } = {}) => {
    const config = datasetFor(table);
    const fields = writeFields(config, payload);
    if (config.owner !== config.key && !fields.some(({ field }) => field === config.key)) {
        fields.unshift({ field: config.key, value: payload[config.key] || crypto.randomUUID() });
    }
    fields.unshift({ field: config.owner, value: userId });
    const uniqueFields = [...new Map(fields.map((entry) => [entry.field, entry])).values()];
    if (!uniqueFields.length) throw Object.assign(new Error('No data to save.'), { status: 400 });
    const columns = uniqueFields.map(({ field }) => identifier(field));
    const values = uniqueFields.map(({ value }) => value);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const conflict = upsert
        ? ` on conflict (${identifier(config.key)}) do update set ${uniqueFields
            .filter(({ field }) => field !== config.key && field !== config.owner)
            .map(({ field }) => `${identifier(field)} = excluded.${identifier(field)}`).join(', ') || `${identifier(config.owner)} = excluded.${identifier(config.owner)}`}`
        : '';
    const result = await queryNeon(
        `insert into public.${identifier(config.table)} (${columns.join(', ')}) values (${placeholders.join(', ')})${conflict} returning *`,
        values,
    );
    return result.rows[0] || null;
};

export const bulkInsertUserRows = async (table, userId, rows = [], { upsert = false } = {}) => {
    if (!Array.isArray(rows) || rows.length > 500) throw Object.assign(new Error('Bulk write is limited to 500 records.'), { status: 400 });
    const saved = [];
    for (const row of rows) saved.push(await insertUserRow(table, userId, row, { upsert }));
    return saved;
};

export const updateUserRow = async (table, userId, id, payload = {}) => {
    const config = datasetFor(table);
    const fields = writeFields(config, payload).filter(({ field }) => field !== config.owner && field !== config.key);
    if (!fields.length) return getUserRow(table, userId, id);
    const values = fields.map(({ value }) => value);
    values.push(userId, id);
    const assignments = fields.map(({ field }, index) => `${identifier(field)} = $${index + 1}`);
    const result = await queryNeon(
        `update public.${identifier(config.table)} set ${assignments.join(', ')} where ${identifier(config.owner)} = $${values.length - 1} and ${identifier(config.key)} = $${values.length} returning *`,
        values,
    );
    return result.rows[0] || null;
};

export const deleteUserRow = async (table, userId, id) => {
    const config = datasetFor(table);
    const result = await queryNeon(
        `delete from public.${identifier(config.table)} where ${identifier(config.owner)} = $1 and ${identifier(config.key)} = $2 returning *`,
        [userId, id],
    );
    return result.rows[0] || null;
};

export const insertTelemetryRow = async (table, payload = {}, { userId = null, guestId = null } = {}) => {
    const config = TELEMETRY_DATASETS[table];
    if (!config) throw Object.assign(new Error('Unsupported telemetry collection.'), { status: 400 });
    const fields = writeFields(config, { ...payload, user_id: userId, guest_id: guestId });
    const values = fields.map(({ value }) => value);
    const result = await queryNeon(
        `insert into public.${identifier(config.table)} (${fields.map(({ field }) => identifier(field)).join(', ')}) values (${values.map((_, index) => `$${index + 1}`).join(', ')}) returning *`,
        values,
    );
    return result.rows[0] || null;
};

export const getDatasetNames = () => Object.keys(DATASETS);
export const getTelemetryDatasetNames = () => Object.keys(TELEMETRY_DATASETS);
