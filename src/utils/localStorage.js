import CryptoJS from 'crypto-js';
import { supabase } from '../lib/supabase';

// ─── localStorage keys ────────────────────────────────────────────────────────
const STORAGE_KEY   = 'sea_plant_scan_history';
const LOGBOOK_KEY   = 'sea_plant_mygap_logbook';
const CHECKLIST_KEY = 'sea_plant_mygap_checklist';
const NOTES_KEY     = 'sea_plant_daily_notes';
const PLOTS_KEY     = 'sea_plant_plots';
const SECRET_KEY    = import.meta.env.VITE_ENCRYPTION_KEY;

// ─── Quota constants ──────────────────────────────────────────────────────────
// Max item counts per collection (guest / localStorage mode)
const MAX_SCANS  = 50;
const MAX_NOTES  = 60;
const MAX_LOGS   = 100;
const MAX_PLOTS  = 30;

// Warn in dev if encryption key is missing
if (!SECRET_KEY && import.meta.env.DEV) {
    console.warn('⚠️ VITE_ENCRYPTION_KEY missing. localStorage will be unencrypted in guest mode.');
}

// ─── Encryption helpers ───────────────────────────────────────────────────────
const encryptData = (text) => {
    if (!SECRET_KEY) return text;
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

const decryptData = (ciphertext) => {
    if (!SECRET_KEY || !ciphertext) return ciphertext;
    if (ciphertext.startsWith('[') || ciphertext.startsWith('{')) return ciphertext;
    try {
        const bytes     = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || ciphertext;
    } catch {
        return ciphertext;
    }
};

// ─── Safe JSON read ───────────────────────────────────────────────────────────
/**
 * Reads a localStorage key, decrypts, and parses JSON.
 * Returns `fallback` on any error, and prunes the corrupt key.
 */
const safeRead = (key, fallback = []) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        try {
            return JSON.parse(decryptData(raw));
        } catch {
            try { return JSON.parse(raw); } catch { /* corrupt */ }
            localStorage.removeItem(key);
            return fallback;
        }
    } catch {
        return fallback;
    }
};

// ─── Safe JSON write with quota handling ──────────────────────────────────────
/**
 * Encrypts and stores data.  If the write hits the quota:
 *   1. Trims the array to `trimTo` items and retries once.
 *   2. On second failure logs an error (non-fatal).
 * Returns true on success, false on failure.
 */
const safeWrite = (key, data, trimTo = null) => {
    const write = (payload) => {
        try {
            localStorage.setItem(key, encryptData(JSON.stringify(payload)));
            return true;
        } catch (err) {
            if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
                return 'quota';
            }
            console.error(`localStorage write error [${key}]:`, err);
            return false;
        }
    };

    const result = write(data);
    if (result === true)  return true;
    if (result === false) return false;

    // Quota hit – trim and retry
    if (trimTo != null && Array.isArray(data)) {
        const trimmed = data.slice(0, trimTo);
        console.warn(`[localStorage] Quota exceeded on "${key}". Trimming to ${trimTo} items.`);
        const retry = write(trimmed);
        if (retry === true) return true;
    }

    console.error(`[localStorage] Failed to write "${key}" after trim. Storage may be full.`);
    return false;
};

// ─── Schema migration helper ──────────────────────────────────────────────────
/**
 * Applies a safe migration to any array stored in localStorage.
 * `migrateFn` receives each item and returns the updated item.
 * Only runs once per `version` (stored as a flag key).
 */
export const migrateLocalSchema = (key, version, migrateFn) => {
    const flagKey = `${key}_schema_v${version}`;
    if (localStorage.getItem(flagKey)) return; // already done

    const data = safeRead(key, null);
    if (!Array.isArray(data)) { localStorage.setItem(flagKey, '1'); return; }

    try {
        const migrated = data.map((item) => {
            try { return migrateFn(item); } catch { return item; }
        });
        safeWrite(key, migrated);
        localStorage.setItem(flagKey, '1');
        console.log(`[schema] Migrated "${key}" to v${version}`);
    } catch (err) {
        console.warn(`[schema] Migration failed for "${key}" v${version}:`, err);
    }
};

// ─── Run schema migrations on module load ─────────────────────────────────────
// v1 → ensure all daily_notes have the harvest fields added in the latest build
migrateLocalSchema(NOTES_KEY, 1, (note) => ({
    kg_harvested:     null,
    quality_grade:    null,
    price_per_kg:     null,
    buyer_name:       null,
    pruned_count:     null,
    pruning_type:     null,
    inspection_type:  null,
    inspection_status: null,
    ...note, // existing values win
}));

// ─── Image helpers (Supabase only, safely no-ops when supabase===null) ────────
const uploadImageToStorage = async (base64, userId, scanId, suffix = 'main') => {
    if (!supabase || !base64 || !userId) return null;
    try {
        const base64Data = base64.startsWith('data:') ? base64.split(',')[1] : base64;
        const byteChars  = atob(base64Data);
        const blob       = new Blob(
            [new Uint8Array(Array.from(byteChars, (c) => c.charCodeAt(0)))],
            { type: 'image/jpeg' },
        );
        const path = `${userId}/${scanId}_${suffix}.jpg`;
        const { error } = await supabase.storage
            .from('scan-images')
            .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (error) { console.warn('Image upload failed:', error.message); return null; }
        const { data } = supabase.storage.from('scan-images').getPublicUrl(path);
        return data.publicUrl;
    } catch (e) {
        console.warn('Image upload exception:', e);
        return null;
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// SCAN HISTORY
// ═════════════════════════════════════════════════════════════════════════════

export const saveScan = async (scanData, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        try {
            const id = crypto.randomUUID();
            const [imageUrl, leafImageUrl] = await Promise.all([
                uploadImageToStorage(scanData.image, userId, id, 'main'),
                scanData.leafImage ? uploadImageToStorage(scanData.leafImage, userId, id, 'leaf') : null,
            ]);
            const row = {
                id,
                user_id:        userId,
                disease:        scanData.disease      || null,
                confidence:     scanData.confidence   ?? null,
                severity:       scanData.severity     || null,
                category:       scanData.category     || null,
                scale:          scanData.farmScale    || scanData.scale || null,
                location_name:  scanData.locationName || null,
                result_json:    { ...scanData, image: null, leafImage: null },
                image_url:      imageUrl,
                leaf_image_url: leafImageUrl,
                created_at:     new Date().toISOString(),
            };
            const { error } = await supabase.from('scan_history').insert(row);
            if (error) throw error;
            return {
                ...scanData,
                id,
                timestamp: row.created_at,
                image_url: imageUrl,
                leaf_image_url: leafImageUrl,
            };
        } catch (err) {
            console.error('Supabase saveScan error:', err);
            throw err;
        }
    }

    // Guest path
    const history = getScanHistory();
    const newScan = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...scanData };
    history.unshift(newScan);
    const limited = history.slice(0, MAX_SCANS);
    const ok = safeWrite(STORAGE_KEY, limited, Math.floor(MAX_SCANS / 2));
    if (!ok) console.warn('saveScan: could not persist scan — storage may be full');
    return newScan;
};

export const getScanHistory = (userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        return supabase
            .from('scan_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) { console.error('getScanHistory error:', error); return []; }
                return (data || []).map((row) => ({
                    ...row.result_json,
                    id:           row.id,
                    timestamp:    row.created_at,
                    disease:      row.disease,
                    confidence:   row.confidence,
                    severity:     row.severity,
                    category:     row.category,
                    image_url:    row.image_url,
                    leaf_image_url: row.leaf_image_url,
                    locationName: row.location_name,
                }));
            });
    }
    return safeRead(STORAGE_KEY, []);
};

export const getScanById = (id, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        return supabase
            .from('scan_history')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .then(({ data, error }) => {
                if (error || !data) return null;
                return {
                    ...data.result_json,
                    id:           data.id,
                    timestamp:    data.created_at,
                    disease:      data.disease,
                    confidence:   data.confidence,
                    severity:     data.severity,
                    category:     data.category,
                    image_url:    data.image_url,
                    leaf_image_url: data.leaf_image_url,
                    locationName: data.location_name,
                };
            });
    }
    const history = getScanHistory();
    return history.find((s) => s.id === id) || null;
};

export const deleteScan = async (id, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('scan_history').delete().eq('id', id).eq('user_id', userId);
        if (error) { console.error('deleteScan error:', error); return false; }
        return true;
    }
    const filtered = getScanHistory().filter((s) => s.id !== id);
    return safeWrite(STORAGE_KEY, filtered);
};

export const clearAllScans = async (userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('scan_history').delete().eq('user_id', userId);
        if (error) { console.error('clearAllScans error:', error); return false; }
        return true;
    }
    try { localStorage.removeItem(STORAGE_KEY); return true; } catch { return false; }
};

export const getGroupedScans = async (userId = null) => {
    const history = await Promise.resolve(getScanHistory(userId));
    const now       = new Date();
    const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo   = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const fortAgo   = new Date(today); fortAgo.setDate(fortAgo.getDate() - 14);
    const grouped   = { today: [], yesterday: [], thisWeek: [], lastWeek: [], older: [] };
    history.forEach((scan) => {
        const d   = new Date(scan.timestamp ?? scan.created_at);
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (day.getTime() === today.getTime())          grouped.today.push(scan);
        else if (day.getTime() === yesterday.getTime()) grouped.yesterday.push(scan);
        else if (d >= weekAgo)                          grouped.thisWeek.push(scan);
        else if (d >= fortAgo)                          grouped.lastWeek.push(scan);
        else                                            grouped.older.push(scan);
    });
    return grouped;
};

// ═════════════════════════════════════════════════════════════════════════════
// MYGAP LOGBOOK
// ═════════════════════════════════════════════════════════════════════════════

export const saveLogEntry = async (logEntry, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const newLog = {
            id: crypto.randomUUID(), user_id: userId,
            type: logEntry.type, notes: logEntry.notes,
            created_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('mygap_logs').insert(newLog);
        if (error) { console.error('saveLogEntry error:', error); return null; }
        return { ...newLog, timestamp: newLog.created_at };
    }
    const logs   = getLogbook();
    const newLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...logEntry };
    logs.unshift(newLog);
    safeWrite(LOGBOOK_KEY, logs.slice(0, MAX_LOGS), Math.floor(MAX_LOGS / 2));
    return newLog;
};

export const getLogbook = (userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        return supabase
            .from('mygap_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) { console.error('getLogbook error:', error); return []; }
                return (data || []).map((row) => ({
                    id: row.id, timestamp: row.created_at, type: row.type, notes: row.notes,
                }));
            });
    }
    return safeRead(LOGBOOK_KEY, []);
};

// ═════════════════════════════════════════════════════════════════════════════
// MYGAP CHECKLIST
// ═════════════════════════════════════════════════════════════════════════════

export const saveChecklistState = async (state, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('mygap_checklist')
            .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
        if (error) { console.error('saveChecklistState error:', error); return false; }
        return true;
    }
    try {
        localStorage.setItem(CHECKLIST_KEY, encryptData(JSON.stringify(state)));
        return true;
    } catch { return false; }
};

export const getChecklistState = (userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        return supabase
            .from('mygap_checklist')
            .select('state')
            .eq('user_id', userId)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) { console.error('getChecklistState error:', error); return {}; }
                return data?.state ?? {};
            });
    }
    return safeRead(CHECKLIST_KEY, {});
};

// ═════════════════════════════════════════════════════════════════════════════
// DAILY NOTES
// ═════════════════════════════════════════════════════════════════════════════

export const saveDailyNote = async (entry, userId = null) => {
    const newNote = {
        id:                    crypto.randomUUID(),
        note:                  entry.note                || '',
        activity_type:         entry.activity_type       || 'note',
        plot_id:               entry.plot_id             || null,
        chemical_name:         entry.chemical_name       || null,
        chemical_qty:          entry.chemical_qty        || null,
        application_timing:    entry.application_timing  || null,
        temperature_am:        entry.temperature_am   != null ? Number(entry.temperature_am)   : null,
        humidity:              entry.humidity         != null ? Number(entry.humidity)          : null,
        growth_stage:          entry.growth_stage        || null,
        pest_notes:            entry.pest_notes          || null,
        disease_incidence:     entry.disease_incidence != null ? Number(entry.disease_incidence) : null,
        disease_name_observed: entry.disease_name_observed || null,
        scout_severity:        entry.scout_severity      || null,
        kg_harvested:          entry.kg_harvested     != null ? Number(entry.kg_harvested)      : null,
        quality_grade:         entry.quality_grade       || null,
        price_per_kg:          entry.price_per_kg     != null ? Number(entry.price_per_kg)      : null,
        buyer_name:            entry.buyer_name          || null,
        expense_amount:        entry.expense_amount   != null ? Number(entry.expense_amount)    : null,
        expense_category:      entry.expense_category    || null,
        pruned_count:          entry.pruned_count     != null ? Number(entry.pruned_count)      : null,
        pruning_type:          entry.pruning_type        || null,
        inspection_type:       entry.inspection_type     || null,
        inspection_status:     entry.inspection_status   || null,
        photo_url:             entry.photo_url           || null,
        created_at:            new Date().toISOString(),
    };

    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('daily_notes').insert({ ...newNote, user_id: userId });
        if (error) { console.error('saveDailyNote error:', error); return null; }
        return newNote;
    }

    const existing = safeRead(NOTES_KEY, []);
    existing.unshift(newNote);
    const ok = safeWrite(NOTES_KEY, existing.slice(0, MAX_NOTES), Math.floor(MAX_NOTES / 2));
    return ok ? newNote : null;
};

export const getDailyNotes = (userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        return supabase
            .from('daily_notes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)
            .then(({ data, error }) => {
                if (error) { console.error('getDailyNotes error:', error); return []; }
                return data || [];
            });
    }
    return safeRead(NOTES_KEY, []);
};

// ═════════════════════════════════════════════════════════════════════════════
// FARM PLOTS
// ═════════════════════════════════════════════════════════════════════════════

export const savePlot = async (plot, userId = null) => {
    const newPlot = {
        id:         crypto.randomUUID(),
        name:       plot.name    || '',
        crop_type:  plot.cropType || '',
        area:       plot.area    || 0,
        unit:       plot.unit    || 'acres',
        soil_ph:    plot.soil_ph != null ? Number(plot.soil_ph) : null,
        npk_n:      plot.npk_n   != null ? Number(plot.npk_n)   : null,
        npk_p:      plot.npk_p   != null ? Number(plot.npk_p)   : null,
        npk_k:      plot.npk_k   != null ? Number(plot.npk_k)   : null,
        created_at: new Date().toISOString(),
    };
    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('plots').insert({ ...newPlot, user_id: userId });
        if (error) { console.error('savePlot error:', error); return null; }
        return newPlot;
    }
    const existing = safeRead(PLOTS_KEY, []);
    existing.unshift(newPlot);
    const ok = safeWrite(PLOTS_KEY, existing.slice(0, MAX_PLOTS));
    return ok ? newPlot : null;
};

export const getPlots = (userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        return supabase
            .from('plots')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) { console.error('getPlots error:', error); return []; }
                return data || [];
            });
    }
    return safeRead(PLOTS_KEY, []);
};

export const deletePlot = async (id, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('plots').delete().eq('id', id).eq('user_id', userId);
        if (error) { console.error('deletePlot error:', error); return false; }
        return true;
    }
    const filtered = safeRead(PLOTS_KEY, []).filter((p) => p.id !== id);
    return safeWrite(PLOTS_KEY, filtered);
};

// ═════════════════════════════════════════════════════════════════════════════
// DEMO DATA SEEDER
// ═════════════════════════════════════════════════════════════════════════════

export const seedDemoData = (userId, data) => {
    if (userId !== 'demo-user-123') return;
    const { scans, notes, plots, logbook } = data;

    const seedKey = (key, items, maxItems) => {
        if (!items?.length) return;
        const existing = safeRead(key, []);
        if (existing.length === 0) {
            safeWrite(key, items.slice(0, maxItems));
        }
    };

    seedKey(STORAGE_KEY, scans,   MAX_SCANS);
    seedKey(NOTES_KEY,   notes,   MAX_NOTES);
    seedKey(PLOTS_KEY,   plots,   MAX_PLOTS);
    seedKey(LOGBOOK_KEY, logbook, MAX_LOGS);
};
