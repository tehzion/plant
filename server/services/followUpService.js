import { getServiceClient } from '../utils/supabaseAuth.js';

const OUTCOMES = new Set(['pending', 'improving', 'unchanged', 'worsening', 'resolved']);
const SEVERITIES = new Set(['', 'mild', 'moderate', 'severe', 'critical']);

const mapDatabaseError = (error) => {
    if (!error || error.status) return error;
    const mapped = new Error(error.message || 'Follow-up could not be saved.');
    mapped.status = error.code === '40001' ? 409 : error.code === 'P0002' ? 404 : error.code === '42501' ? 403 : 500;
    return mapped;
};

export const createFollowUpEvent = async (userId, input = {}) => {
    const scanId = String(input.scanId || '').trim();
    const eventId = String(input.eventId || '').trim();
    if (!userId || !scanId || !eventId || !OUTCOMES.has(input.outcome) || !SEVERITIES.has(input.severity || '')) {
        const error = new Error('Invalid follow-up event.');
        error.status = 400;
        throw error;
    }
    const client = getServiceClient();
    if (!client) { const error = new Error('Follow-up storage is temporarily unavailable.'); error.status = 503; throw error; }
    const { data: scan, error: scanError } = await client.from('scan_history').select('id,result_json,revision').eq('id', scanId).eq('user_id', userId).maybeSingle();
    if (scanError) throw scanError;
    if (!scan) { const error = new Error('Scan not found.'); error.status = 404; throw error; }
    if (input.plotId) {
        const { data: plot, error: plotError } = await client.from('plots').select('id').eq('id', input.plotId).eq('user_id', userId).maybeSingle();
        if (plotError) throw plotError;
        if (!plot) { const error = new Error('Selected plot is unavailable.'); error.status = 400; throw error; }
    }
    if (input.photoPath && !String(input.photoPath).startsWith(`${userId}/`)) {
        const error = new Error('Follow-up photo ownership could not be verified.');
        error.status = 400;
        throw error;
    }
    const current = scan.result_json && typeof scan.result_json === 'object' ? scan.result_json : {};
    const revision = Number.isInteger(scan.revision) ? scan.revision : 0;
    const recordedAt = new Date().toISOString();
    const event = {
        id: eventId, user_id: userId, scan_id: scanId, plot_id: input.plotId || null,
        outcome: input.outcome, severity: input.severity || '', note: String(input.note || '').slice(0, 2000),
        photo_path: input.photoPath || null, next_check_date: input.nextCheckDate || null, recorded_at: recordedAt,
    };
    const cleanupPhoto = async (path) => {
        if (!path || !path.startsWith(`${userId}/`)) return;
        try { await client.storage.from('scan-images').remove([path]); } catch (error) {
            console.warn('Follow-up photo cleanup failed:', error.message);
        }
    };
    if (typeof client.rpc === 'function') {
        try {
            const { data, error } = await client.rpc('create_followup_event', {
                p_user_id: userId,
                p_scan_id: scanId,
                p_expected_revision: revision,
                p_event: event,
            });
            if (error) throw error;
            if (data?.event) {
                if (data.duplicate && event.photo_path && data.event.photo_path !== event.photo_path) await cleanupPhoto(event.photo_path);
                return { event: data.event, revision: Number(data.revision || revision), followUp: data.followUp || {} };
            }
        } catch (error) {
            await cleanupPhoto(event.photo_path);
            throw mapDatabaseError(error);
        }
    }
    let inserted;
    try {
        const result = await client.from('scan_followup_events').upsert(event, { onConflict: 'id' }).select('*');
        if (result.error) throw result.error;
        inserted = result.data;
    } catch (error) {
        await cleanupPhoto(event.photo_path);
        throw error;
    }
    const history = Array.isArray(current.followUp?.history) ? current.followUp.history : [];
    const nextHistory = history.some((item) => item.id === eventId) ? history : [...history, { id: eventId, recordedAt, outcome: event.outcome, severity: event.severity, note: event.note, photoPath: event.photo_path }];
    const nextResult = { ...current, plot_id: event.plot_id, followUp: { nextCheckDate: event.next_check_date || '', history: nextHistory } };
    const { data: updated, error: updateError } = await client.from('scan_history').update({ result_json: nextResult, revision: revision + 1 })
        .eq('id', scanId).eq('user_id', userId).eq('revision', revision).select('id,revision');
    if (updateError) {
        await client.from('scan_followup_events').delete().eq('id', eventId).eq('user_id', userId);
        await cleanupPhoto(event.photo_path);
        throw updateError;
    }
    if (!updated?.length) {
        await client.from('scan_followup_events').delete().eq('id', eventId).eq('user_id', userId);
        await cleanupPhoto(event.photo_path);
        const error = new Error('The scan changed in another session. Reload and retry.');
        error.status = 409;
        throw error;
    }
    return { event: inserted?.[0] || event, revision: revision + 1, followUp: nextResult.followUp };
};

export const listFollowUpEvents = async (userId, scanId) => {
    const client = getServiceClient();
    if (!client) { const error = new Error('Follow-up storage is temporarily unavailable.'); error.status = 503; throw error; }
    const { data, error } = await client.from('scan_followup_events').select('*').eq('user_id', userId).eq('scan_id', scanId).order('recorded_at', { ascending: true });
    if (error) throw error;
    return data || [];
};
