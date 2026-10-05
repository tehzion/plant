import { getServiceClient } from '../utils/supabaseAuth.js';

const TABLES = {
    scans: { table: 'scan_history', fields: ['id', 'disease', 'confidence', 'severity', 'category', 'scale', 'location_name', 'result_json', 'image_path', 'leaf_image_path', 'created_at', 'revision'] },
    logbook: { table: 'mygap_logs', fields: ['id', 'type', 'notes', 'created_at'] },
    notes: { table: 'daily_notes', fields: ['id', 'note', 'activity_type', 'plot_id', 'chemical_name', 'chemical_qty', 'application_timing', 'temperature_am', 'humidity', 'growth_stage', 'pest_notes', 'disease_incidence', 'disease_name_observed', 'scout_severity', 'kg_harvested', 'quality_grade', 'price_per_kg', 'buyer_name', 'expense_amount', 'expense_category', 'pruned_count', 'pruning_type', 'inspection_type', 'inspection_status', 'photo_path', 'created_at'] },
    plots: { table: 'plots', fields: ['id', 'name', 'crop_type', 'area', 'unit', 'soil_ph', 'npk_n', 'npk_p', 'npk_k', 'created_at'] },
};

const cleanPayload = (collection, payload = {}) => {
    const config = TABLES[collection];
    if (!config || !payload || typeof payload !== 'object') return null;
    return Object.fromEntries(config.fields.filter((field) => payload[field] !== undefined).map((field) => [field, payload[field]]));
};

export const syncOperation = async (userId, operation = {}) => {
    const config = TABLES[operation.collection];
    if (!userId || !config || !['create', 'update', 'delete'].includes(operation.type) || !operation.recordId) {
        const error = new Error('Invalid sync operation.');
        error.status = 400;
        throw error;
    }
    const client = getServiceClient();
    if (!client) {
        const error = new Error('Sync is temporarily unavailable.');
        error.status = 503;
        throw error;
    }
    const id = String(operation.recordId);
    const expectedRevision = Number.isInteger(operation.expectedRevision) ? operation.expectedRevision : null;
    if (operation.type === 'create') {
        const row = { ...cleanPayload(operation.collection, operation.payload), id, user_id: userId };
        if (operation.collection === 'scans' && row.revision == null) row.revision = 0;
        const { data: existing, error: existingError } = await client.from(config.table).select('id,user_id').eq('id', id).maybeSingle();
        if (existingError) throw existingError;
        if (existing && existing.user_id !== userId) return { conflict: true, reason: 'ownership' };
        const { error } = await client.from(config.table).upsert(row, { onConflict: 'id' });
        if (error) throw error;
        return { ok: true, revision: row.revision ?? null };
    }
    if (operation.type === 'delete') {
        let query = client.from(config.table).delete().eq('id', id).eq('user_id', userId);
        if (operation.collection === 'scans' && expectedRevision != null) query = query.eq('revision', expectedRevision);
        const { data, error } = await query.select('id');
        if (error) throw error;
        if (!data?.length) return { conflict: true, reason: 'stale_revision_or_missing_record' };
        return { ok: true };
    }
    let query = client.from(config.table).update(cleanPayload(operation.collection, operation.payload)).eq('id', id).eq('user_id', userId);
    if (operation.collection === 'scans' && expectedRevision != null) query = query.eq('revision', expectedRevision).select('id,revision');
    else query = query.select('id');
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) return { conflict: true, reason: 'stale_revision_or_missing_record' };
    return { ok: true, revision: data[0].revision ?? null };
};
