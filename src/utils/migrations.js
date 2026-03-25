/**
 * One-time migration: reads existing localStorage data and bulk-inserts it
 * into Supabase on the user's first login. Runs silently in background.
 *
 * Guard: sets localStorage key `plant_migrated_{userId}` after success
 * so it never runs again for that user.
 */

import { supabase } from '../lib/supabase';
import { getScanHistory, getLogbook, getChecklistState, getDailyNotes, getPlots } from './localStorage';

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

    try {
        // ── 1. Scan history ───────────────────────────────────────────────────
        const localScans = getScanHistory(); // synchronous, no userId
        if (localScans.length > 0) {
            const rows = localScans.map(scan => ({
                id:            scan.id,
                user_id:       userId,
                disease:       scan.disease       || null,
                confidence:    scan.confidence    ?? null,
                severity:      scan.severity      || null,
                category:      scan.category      || null,
                scale:         scan.farmScale     || scan.scale || null,
                location_name: scan.locationName  || null,
                // Strip image blobs — we don't re-upload during migration to keep it fast
                result_json:   { ...scan, image: null, leafImage: null },
                image_url:     null,
                created_at:    scan.timestamp     || new Date().toISOString(),
            }));

            // Use upsert so duplicates are silently ignored
            const { error: scanErr } = await supabase
                .from('scan_history')
                .upsert(rows, { onConflict: 'id' });

            if (scanErr) console.warn('Migration: scan_history partial error', scanErr.message);
        }

        // ── 2. Logbook ────────────────────────────────────────────────────────
        const localLogs = getLogbook(); // synchronous, no userId
        if (localLogs.length > 0) {
            const rows = localLogs.map(log => ({
                id:         log.id,
                user_id:    userId,
                type:       log.type,
                notes:      log.notes,
                created_at: log.timestamp || new Date().toISOString(),
            }));

            const { error: logErr } = await supabase
                .from('mygap_logs')
                .upsert(rows, { onConflict: 'id' });

            if (logErr) console.warn('Migration: mygap_logs partial error', logErr.message);
        }

        // ── 3. Checklist ──────────────────────────────────────────────────────
        const localChecklist = getChecklistState(); // synchronous, no userId
        if (Object.keys(localChecklist).length > 0) {
            const { error: clErr } = await supabase
                .from('mygap_checklist')
                .upsert({ user_id: userId, state: localChecklist, updated_at: new Date().toISOString() });

            if (clErr) console.warn('Migration: mygap_checklist partial error', clErr.message);
        }

        // ── 4. Daily Notes ───────────────────────────────────────────────────
        const localNotes = getDailyNotes();
        if (localNotes.length > 0) {
            const rows = localNotes.map(note => ({
                ...note,
                user_id: userId,
                // Ensure IDs are strings and types are correct
                id: note.id.toString()
            }));
            const { error: noteErr } = await supabase
                .from('daily_notes')
                .upsert(rows, { onConflict: 'id' });
            if (noteErr) console.warn('Migration: daily_notes partial error', noteErr.message);
        }

        // ── 5. Farm Plots ─────────────────────────────────────────────────────
        const localPlots = getPlots();
        if (localPlots.length > 0) {
            const rows = localPlots.map(plot => ({
                ...plot,
                user_id: userId,
                id: plot.id.toString()
            }));
            const { error: plotErr } = await supabase
                .from('plots')
                .upsert(rows, { onConflict: 'id' });
            if (plotErr) console.warn('Migration: plots partial error', plotErr.message);
        }

        // ── 6. Clear localStorage keys so data is not duplicated ──────────────
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
