import { getServiceClient } from '../utils/supabaseAuth.js';

const OUTCOMES = new Set(['pending', 'improving', 'unchanged', 'worsening', 'resolved']);
const SEVERITIES = new Set(['', 'mild', 'moderate', 'severe', 'critical']);

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
    const current = scan.result_json && typeof scan.result_json === 'object' ? scan.result_json : {};
    const revision = Number.isInteger(scan.revision) ? scan.revision : 0;
    const recordedAt = new Date().toISOString();
    const event = {
        id: eventId, user_id: userId, scan_id: scanId, plot_id: input.plotId || null,
        outcome: input.outcome, severity: input.severity || '', note: String(input.note || '').slice(0, 2000),
        photo_path: input.photoPath || null, next_check_date: input.nextCheckDate || null, recorded_at: recordedAt,
    };
    const { data: inserted, error: insertError } = await client.from('scan_followup_events').upsert(event, { onConflict: 'id' }).select('*');
    if (insertError) throw insertError;
    const history = Array.isArray(current.followUp?.history) ? current.followUp.history : [];
    const nextHistory = history.some((item) => item.id === eventId) ? history : [...history, { id: eventId, recordedAt, outcome: event.outcome, severity: event.severity, note: event.note, photoPath: event.photo_path }];
    const nextResult = { ...current, plot_id: event.plot_id, followUp: { nextCheckDate: event.next_check_date || '', history: nextHistory } };
    const { data: updated, error: updateError } = await client.from('scan_history').update({ result_json: nextResult, revision: revision + 1 })
        .eq('id', scanId).eq('user_id', userId).eq('revision', revision).select('id,revision');
    if (updateError) throw updateError;
    if (!updated?.length) {
        await client.from('scan_followup_events').delete().eq('id', eventId).eq('user_id', userId);
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
