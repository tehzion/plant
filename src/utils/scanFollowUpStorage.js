import { supabase } from '../lib/supabase.js';
import { getScanHistory, getPlots, isCloudUser, STORAGE_COLLECTION_KEYS, writeStorageCollection } from './localStorage.js';
import { uploadPrivateImage } from './privateImageStorage.js';

export const saveScanFollowUp = async (scanId, changes, userId = null) => {
    if (!['pending', 'improving', 'unchanged', 'worsening', 'resolved'].includes(changes.outcome)) throw new Error('Invalid outcome');
    if (changes.nextCheckDate && !/^\d{4}-\d{2}-\d{2}$/.test(changes.nextCheckDate)) throw new Error('Invalid follow-up date');
    if (changes.plotId) {
        const plots = await getPlots(userId);
        if (!plots.some(plot => plot.id === changes.plotId)) throw new Error('Selected plot is unavailable');
    }
    const cloud = isCloudUser(userId);
    let source, localHistory;
    if (cloud) {
        const { data, error } = await supabase.from('scan_history').select('result_json,revision').eq('id', scanId).eq('user_id', userId).single();
        if (error || !data) throw error || new Error('Scan not found');
        source = { ...(data.result_json || {}), __revision: Number.isInteger(data.revision) ? data.revision : 0 };
    } else {
        localHistory = getScanHistory();
        source = localHistory.find(scan => scan.id === scanId);
        if (!source) throw new Error('Scan not found');
    }
    const event = { id: crypto.randomUUID(), recordedAt: new Date().toISOString(), outcome: changes.outcome,
        severity: ['mild', 'moderate', 'severe', 'critical'].includes(changes.severity) ? changes.severity : '',
        note: String(changes.note || '').slice(0, 2000), photo: '', photoPath: '' };
    if (changes.photoBase64) {
        if (cloud) {
            const photo = await uploadPrivateImage({ base64: changes.photoBase64, userId,
                path: `${userId}/${scanId}_followup_${event.id}.jpg` });
            if (!photo.path) throw new Error('Follow-up photo could not be saved');
            event.photoPath = photo.path;
        } else event.photo = changes.photoBase64;
    }
    const revision = Number.isInteger(source.__revision) ? source.__revision : Number.isInteger(source.revision) ? source.revision : 0;
    const metadata = { plot_id: changes.plotId || null, revision: revision + 1,
        followUp: { nextCheckDate: changes.nextCheckDate || '',
            history: [...(source.followUp?.history || []), event] } };
    if (cloud) {
        // Compatibility path for an older embedded client that has no auth
        // session helper yet. RLS and the revision predicate still protect it.
        if (!supabase.auth?.getSession) {
            const { __revision, ...sourceResult } = source;
            const { data, error } = await supabase.from('scan_history').update({
                result_json: { ...sourceResult, ...metadata }, revision: revision + 1,
            }).eq('id', scanId).eq('user_id', userId).eq('revision', revision).select('id,revision');
            if (error) throw error;
            if (!data?.length) throw new Error('The scan changed in another session. Reload and retry.');
            return metadata;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('Your session has expired. Sign in again and retry.');
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/followups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ scanId, eventId: event.id, plotId: changes.plotId || null, nextCheckDate: changes.nextCheckDate || '', outcome: event.outcome, severity: event.severity, note: event.note, photoPath: event.photoPath || null }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(payload.message || payload.error || 'Follow-up could not be saved.');
            error.status = response.status;
            throw error;
        }
        return { plot_id: changes.plotId || null, revision: payload.revision, followUp: payload.followUp };
    } else {
        const result = writeStorageCollection(STORAGE_COLLECTION_KEYS.STORAGE_KEY,
            localHistory.map(scan => scan.id === scanId ? { ...scan, ...metadata } : scan));
        if (!result.ok) throw new Error('Device storage is full or unavailable');
    }
    return metadata;
};
