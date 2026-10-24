import { queryNeon } from '../utils/neonDatabase.js';
import { getServiceClient } from '../utils/supabaseAuth.js';

const OUTCOMES = new Set(['pending', 'improving', 'unchanged', 'worsening', 'resolved']);
const SEVERITIES = new Set(['', 'mild', 'moderate', 'severe', 'critical']);

const mapDatabaseError = (error) => {
    if (!error || error.status) return error;
    const mapped = new Error(error.message || 'Follow-up could not be saved.');
    mapped.status = error.code === '40001' ? 409 : error.code === '23503' ? 400 : error.code === '23505' ? 409 : 500;
    return mapped;
};

const cleanupPhoto = async (userId, path) => {
    if (!path || !path.startsWith(`${userId}/`)) return;
    try { await getServiceClient()?.storage.from('scan-images').remove([path]); } catch (error) {
        console.warn('Follow-up photo cleanup failed:', error.message);
    }
};

export const createFollowUpEvent = async (userId, input = {}) => {
    const scanId = String(input.scanId || '').trim();
    const eventId = String(input.eventId || '').trim();
    if (!userId || !scanId || !eventId || !OUTCOMES.has(input.outcome) || !SEVERITIES.has(input.severity || '')) {
        const error = new Error('Invalid follow-up event.');
        error.status = 400;
        throw error;
    }
    try {
        const scanResult = await queryNeon(
            'select id,result_json,revision from public.scan_history where id = $1 and user_id = $2 limit 1',
            [scanId, userId],
        );
        const scan = scanResult.rows[0];
        if (!scan) throw Object.assign(new Error('Scan not found.'), { status: 404 });
        if (input.plotId) {
            const plot = await queryNeon('select id from public.plots where id = $1 and user_id = $2 limit 1', [input.plotId, userId]);
            if (!plot.rows[0]) throw Object.assign(new Error('Selected plot is unavailable.'), { status: 400 });
        }
        if (input.photoPath && !String(input.photoPath).startsWith(`${userId}/`)) {
            throw Object.assign(new Error('Follow-up photo ownership could not be verified.'), { status: 400 });
        }
        const current = scan.result_json && typeof scan.result_json === 'object' ? scan.result_json : {};
        const revision = Number.isInteger(scan.revision) ? scan.revision : 0;
        const recordedAt = new Date().toISOString();
        const event = {
            id: eventId, user_id: userId, scan_id: scanId, plot_id: input.plotId || null,
            outcome: input.outcome, severity: input.severity || '', note: String(input.note || '').slice(0, 2000),
            photo_path: input.photoPath || null, next_check_date: input.nextCheckDate || null, recorded_at: recordedAt,
        };

        const existingResult = await queryNeon('select * from public.scan_followup_events where id = $1 and user_id = $2 limit 1', [eventId, userId]);
        if (existingResult.rows[0]) {
            if (event.photo_path && event.photo_path !== existingResult.rows[0].photo_path) await cleanupPhoto(userId, event.photo_path);
            return {
                event: existingResult.rows[0], revision, followUp: current.followUp || {},
            };
        }

        const insertedResult = await queryNeon(
            `insert into public.scan_followup_events
                (id,user_id,scan_id,plot_id,outcome,severity,note,photo_path,next_check_date,recorded_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             returning *`,
            [event.id, event.user_id, event.scan_id, event.plot_id, event.outcome, event.severity, event.note, event.photo_path, event.next_check_date || null, event.recorded_at],
        );
        const inserted = insertedResult.rows[0] || event;
        const history = Array.isArray(current.followUp?.history) ? current.followUp.history : [];
        const nextHistory = history.some((item) => item.id === eventId)
            ? history
            : [...history, { id: eventId, recordedAt, outcome: event.outcome, severity: event.severity, note: event.note, photoPath: event.photo_path }];
        const nextResult = { ...current, plot_id: event.plot_id, followUp: { nextCheckDate: event.next_check_date || '', history: nextHistory } };
        const updatedResult = await queryNeon(
            `update public.scan_history set result_json = $1, revision = $2
             where id = $3 and user_id = $4 and revision = $5 returning id,revision`,
            [nextResult, revision + 1, scanId, userId, revision],
        );
        if (!updatedResult.rows.length) {
            await queryNeon('delete from public.scan_followup_events where id = $1 and user_id = $2', [eventId, userId]);
            await cleanupPhoto(userId, event.photo_path);
            throw Object.assign(new Error('The scan changed in another session. Reload and retry.'), { status: 409 });
        }
        return { event: inserted, revision: revision + 1, followUp: nextResult.followUp };
    } catch (error) {
        throw mapDatabaseError(error);
    }
};

export const listFollowUpEvents = async (userId, scanId) => {
    try {
        const { rows } = await queryNeon(
            'select * from public.scan_followup_events where user_id = $1 and scan_id = $2 order by recorded_at asc',
            [userId, scanId],
        );
        return rows || [];
    } catch (error) {
        throw mapDatabaseError(error);
    }
};
