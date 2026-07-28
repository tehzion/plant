/**
 * One-time migration: reads existing localStorage data and bulk-inserts it
 * into Supabase on the user's first login. Runs silently in background.
 *
 * Guard: sets localStorage key `plant_migrated_{userId}` after success
 * so it never runs again for that user.
 */

import { supabase } from '../lib/supabase';
import {
    getScanHistory,
    getLogbook,
    getChecklistState,
    getDailyNotes,
    getPlots,
    saveProfileInfo,
    toDailyNoteRow,
    toLogbookRow,
    toPlotRow,
    toScanHistoryRow,
} from './localStorage';

const STORAGE_KEY     = 'sea_plant_scan_history';
const LOGBOOK_KEY     = 'sea_plant_mygap_logbook';
const CHECKLIST_KEY   = 'sea_plant_mygap_checklist';
const DAILY_NOTES_KEY = 'sea_plant_daily_notes';
const PLOTS_KEY       = 'sea_plant_plots';

export const migrateLocalStorageToSupabase = async (userId) => {
    if (!userId || !supabase) return;

    const migrationFlag = `plant_migrated_${userId}`;
    if (localStorage.getItem(migrationFlag)) return; // already done

    console.log('🌱 Running one-time localStorage → Supabase migration...');

    const errors = [];

    const recordError = (label, error) => {
        if (!error) return;
        errors.push({ label, message: error.message || String(error) });
        console.warn(`Migration: ${label} error`, error.message || error);
    };

    try {
        // ── 1. Scan history ───────────────────────────────────────────────────
        const localScans = getScanHistory(); // synchronous, no userId
        if (localScans.length > 0) {
            const rows = localScans.map(scan => toScanHistoryRow(scan, userId, scan.id, null, null));

            // Use upsert so duplicates are silently ignored
            const { error: scanErr } = await supabase
                .from('scan_history')
                .upsert(rows, { onConflict: 'id' });

            recordError('scan_history', scanErr);
        }

        // ── 2. Logbook ────────────────────────────────────────────────────────
        const localLogs = getLogbook(); // synchronous, no userId
        if (localLogs.length > 0) {
            const rows = localLogs.map(log => toLogbookRow(log, userId));

            const { error: logErr } = await supabase
                .from('mygap_logs')
                .upsert(rows, { onConflict: 'id' });

            recordError('mygap_logs', logErr);
        }

        // ── 3. Checklist ──────────────────────────────────────────────────────
        const localChecklist = getChecklistState(); // synchronous, no userId
        if (Object.keys(localChecklist).length > 0) {
            const { error: clErr } = await supabase
                .from('mygap_checklist')
                .upsert({ user_id: userId, state: localChecklist, updated_at: new Date().toISOString() });

            recordError('mygap_checklist', clErr);
        }

        // ── 4. Daily Notes ───────────────────────────────────────────────────
        const localNotes = getDailyNotes();
        if (localNotes.length > 0) {
            const rows = localNotes.map(note => toDailyNoteRow(note, userId));
            const { error: noteErr } = await supabase
                .from('daily_notes')
                .upsert(rows, { onConflict: 'id' });
            recordError('daily_notes', noteErr);
        }

        // ── 5. Farm Plots ─────────────────────────────────────────────────────
        const localPlots = getPlots();
        if (localPlots.length > 0) {
            const rows = localPlots.map(plot => toPlotRow(plot, userId));
            const { error: plotErr } = await supabase
                .from('plots')
                .upsert(rows, { onConflict: 'id' });
            recordError('plots', plotErr);
        }

        // ── 6. Profile info ──────────────────────────────────────────────────
        const localProfileRaw = localStorage.getItem(`profile_info_${userId}`);
        if (localProfileRaw) {
            try {
                const localProfile = JSON.parse(localProfileRaw);
                const profileSaved = await saveProfileInfo(localProfile, userId);
                if (!profileSaved) recordError('profiles', new Error('Profile save failed'));
            } catch (profileErr) {
                recordError('profiles', profileErr);
            }
        }

        if (errors.length > 0) {
            console.warn('Migration kept localStorage because one or more cloud writes failed.', errors);
            return;
        }

        // ── 7. Clear localStorage keys so data is not duplicated ──────────────
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LOGBOOK_KEY);
        localStorage.removeItem(CHECKLIST_KEY);
        localStorage.removeItem(DAILY_NOTES_KEY);
        localStorage.removeItem(PLOTS_KEY);

        // Mark as done
        localStorage.setItem(migrationFlag, '1');
        console.log('✅ Migration complete.');
    } catch (err) {
        // Non-fatal — guest data is still intact if migration fails partway
        console.error('Migration error (non-fatal):', err);
    }
};
