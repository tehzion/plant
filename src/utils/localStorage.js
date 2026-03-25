import CryptoJS from 'crypto-js';
import { supabase } from '../lib/supabase';

// ─── localStorage keys (guest mode) ──────────────────────────────────────────
const STORAGE_KEY   = 'sea_plant_scan_history';
const LOGBOOK_KEY   = 'sea_plant_mygap_logbook';
const CHECKLIST_KEY = 'sea_plant_mygap_checklist';
const SECRET_KEY    = import.meta.env.VITE_ENCRYPTION_KEY;

if (!SECRET_KEY && import.meta.env.DEV) {
    console.warn('⚠️ VITE_ENCRYPTION_KEY is missing. localStorage will be unencrypted in guest mode.');
}

// ─── Encryption helpers (guest localStorage paths only) ──────────────────────
const encryptData = (text) => {
    if (!SECRET_KEY) return text;
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

const decryptData = (ciphertext) => {
    if (!SECRET_KEY || !ciphertext) return ciphertext;
    
    // If it looks like raw JSON array/object, don't decrypt it
    if (ciphertext.startsWith('[') || ciphertext.startsWith('{')) return ciphertext;

    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || ciphertext;
    } catch {
        return ciphertext;
    }
};

// ─── Image helpers ────────────────────────────────────────────────────────────
/**
 * Upload a base64 image to Supabase Storage.
 * Returns the public URL, or null on failure.
 */
const uploadImageToStorage = async (base64, userId, scanId, suffix = 'main') => {
    if (!supabase || !base64 || !userId) return null;
    try {
        // Convert data URL or plain base64 → Blob
        const base64Data = base64.startsWith('data:')
            ? base64.split(',')[1]
            : base64;
        const byteChars  = atob(base64Data);
        const byteNums   = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
        const blob        = new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' });

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

// ─── SCAN HISTORY ─────────────────────────────────────────────────────────────

/**
 * Save a scan result.
 * @param {Object} scanData
 * @param {string|null} userId  — pass user?.id; null → guest localStorage
 */
export const saveScan = async (scanData, userId = null) => {
    // ── Supabase path ──
    if (userId && supabase) {
        try {
            const id = Date.now().toString(36);

            // Upload images in parallel, fall back gracefully if Storage is not ready
            const [imageUrl, leafImageUrl] = await Promise.all([
                uploadImageToStorage(scanData.image, userId, id, 'main'),
                scanData.leafImage
                    ? uploadImageToStorage(scanData.leafImage, userId, id, 'leaf')
                    : Promise.resolve(null)
            ]);

            // Build the row — store full result as result_json, key fields as columns for queries
            const row = {
                id,
                user_id:       userId,
                disease:       scanData.disease       || null,
                confidence:    scanData.confidence    ?? null,
                severity:      scanData.severity      || null,
                category:      scanData.category      || null,
                scale:         scanData.farmScale     || scanData.scale || null,
                location_name: scanData.locationName  || null,
                result_json:   { ...scanData, image: null, leafImage: null }, // strip blobs
                image_url:     imageUrl,
                leaf_image_url: leafImageUrl,
                created_at:    new Date().toISOString(),
            };

            const { error } = await supabase.from('scan_history').insert(row);
            if (error) throw error;

            // Return a shape identical to the localStorage version so callers don't break
            return { ...scanData, id, timestamp: row.created_at, image_url: imageUrl };
        } catch (err) {
            console.error('Supabase saveScan error:', err);
            throw err;
        }
    }

    // ── Guest localStorage path (original logic, unchanged) ──
    try {
        const history = getScanHistory(); // synchronous guest version
        const newScan = {
            id: Date.now().toString(36),
            timestamp: new Date().toISOString(),
            ...scanData
        };
        history.unshift(newScan);
        const limitedHistory = history.slice(0, 50);
        localStorage.setItem(STORAGE_KEY, encryptData(JSON.stringify(limitedHistory)));
        return newScan;
    } catch (error) {
        console.error('Error saving scan (localStorage):', error);
        if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
            try {
                const history  = getScanHistory();
                const reduced  = history.slice(0, 15);
                const newScan  = { id: Date.now().toString(36), timestamp: new Date().toISOString(), ...scanData };
                const final    = [newScan, ...reduced].slice(0, 15);
                localStorage.setItem(STORAGE_KEY, encryptData(JSON.stringify(final)));
                return final[0];
            } catch (e) {
                console.error('Failed to recover from quota error:', e);
            }
        }
        throw error;
    }
};

/**
 * Get full scan history.
 * @param {string|null} userId  — pass user?.id; null → guest localStorage
 * @returns {Array}
 */
export const getScanHistory = (userId = null) => {
    // ── Supabase path returns a Promise; callers must await when logged in ──
    if (userId && supabase) {
        return supabase
            .from('scan_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) { console.error('getScanHistory error:', error); return []; }
                // Normalise shape to match localStorage scans
                return (data || []).map(row => ({
                    ...row.result_json,
                    id:          row.id,
                    timestamp:   row.created_at,
                    disease:     row.disease,
                    confidence:  row.confidence,
                    severity:    row.severity,
                    category:    row.category,
                    image_url:   row.image_url,
                    locationName: row.location_name,
                }));
            });
    }

    // ── Synchronous localStorage path ──
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        try {
            const decrypted = decryptData(data);
            return JSON.parse(decrypted);
        } catch {
            try { 
                return JSON.parse(data); 
            } catch { 
                localStorage.removeItem(STORAGE_KEY);
                return []; 
            }
        }
    } catch {
        return [];
    }
};

/**
 * Get a single scan by ID.
 * @param {string} id
 * @param {string|null} userId
 */
export const getScanById = (id, userId = null) => {
    if (userId && supabase) {
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
                    id:          data.id,
                    timestamp:   data.created_at,
                    disease:     data.disease,
                    confidence:  data.confidence,
                    severity:    data.severity,
                    category:    data.category,
                    image_url:   data.image_url,
                    locationName: data.location_name,
                };
            });
    }

    const history = getScanHistory();
    return history.find(s => s.id === id) || null;
};

/**
 * Delete a scan by ID.
 * @param {string} id
 * @param {string|null} userId
 */
export const deleteScan = async (id, userId = null) => {
    if (userId && supabase) {
        const { error } = await supabase
            .from('scan_history')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) { console.error('deleteScan error:', error); return false; }
        return true;
    }

    try {
        const history  = getScanHistory();
        const filtered = history.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, encryptData(JSON.stringify(filtered)));
        return true;
    } catch {
        return false;
    }
};

/**
 * Clear all scans.
 * @param {string|null} userId
 */
export const clearAllScans = async (userId = null) => {
    if (userId && supabase) {
        const { error } = await supabase
            .from('scan_history')
            .delete()
            .eq('user_id', userId);
        if (error) { console.error('clearAllScans error:', error); return false; }
        return true;
    }

    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch {
        return false;
    }
};

/**
 * Get scans grouped by date (today / yesterday / thisWeek / lastWeek / older).
 * Pure JS grouping — same logic regardless of source.
 * @param {string|null} userId  — if provided, getScanHistory returns a Promise
 */
export const getGroupedScans = async (userId = null) => {
    const history = await Promise.resolve(getScanHistory(userId));

    const now       = new Date();
    const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo   = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const fortAgo   = new Date(today); fortAgo.setDate(fortAgo.getDate() - 14);

    const grouped = { today: [], yesterday: [], thisWeek: [], lastWeek: [], older: [] };

    history.forEach(scan => {
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


// ─── MYGAP LOGBOOK ────────────────────────────────────────────────────────────

/**
 * Save a logbook entry.
 * @param {Object} logEntry
 * @param {string|null} userId
 */
export const saveLogEntry = async (logEntry, userId = null) => {
    if (userId && supabase) {
        const newLog = {
            id:         Date.now().toString(36),
            user_id:    userId,
            type:       logEntry.type,
            notes:      logEntry.notes,
            created_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('mygap_logs').insert(newLog);
        if (error) { console.error('saveLogEntry error:', error); return null; }
        return { ...newLog, timestamp: newLog.created_at };
    }

    try {
        const logs   = getLogbook();
        const newLog = { id: Date.now().toString(36), timestamp: new Date().toISOString(), ...logEntry };
        logs.unshift(newLog);
        localStorage.setItem(LOGBOOK_KEY, encryptData(JSON.stringify(logs.slice(0, 100))));
        return newLog;
    } catch (error) {
        console.error('saveLogEntry (localStorage) error:', error);
        return null;
    }
};

/**
 * Get all logbook entries.
 * @param {string|null} userId
 */
export const getLogbook = (userId = null) => {
    if (userId && supabase) {
        return supabase
            .from('mygap_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) { console.error('getLogbook error:', error); return []; }
                return (data || []).map(row => ({
                    id:        row.id,
                    timestamp: row.created_at,
                    type:      row.type,
                    notes:     row.notes,
                }));
            });
    }

    try {
        const data = localStorage.getItem(LOGBOOK_KEY);
        if (!data) return [];
        try {
            return JSON.parse(decryptData(data));
        } catch {
            localStorage.removeItem(LOGBOOK_KEY);
            return [];
        }
    } catch {
        return [];
    }
};


// ─── MYGAP CHECKLIST ──────────────────────────────────────────────────────────

/**
 * Save checklist state.
 * @param {Object} state  — e.g. { check1: true, check2: false, … }
 * @param {string|null} userId
 */
export const saveChecklistState = async (state, userId = null) => {
    if (userId && supabase) {
        const { error } = await supabase
            .from('mygap_checklist')
            .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
        if (error) { console.error('saveChecklistState error:', error); return false; }
        return true;
    }

    try {
        localStorage.setItem(CHECKLIST_KEY, encryptData(JSON.stringify(state)));
        return true;
    } catch {
        return false;
    }
};

/**
 * Get checklist state.
 * @param {string|null} userId
 * @returns {Object|Promise<Object>}
 */
export const getChecklistState = (userId = null) => {
    if (userId && supabase) {
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

    try {
        const data = localStorage.getItem(CHECKLIST_KEY);
        if (!data) return {};
        try {
            return JSON.parse(decryptData(data));
        } catch {
            localStorage.removeItem(CHECKLIST_KEY);
            return {};
        }
    } catch {
        return {};
    }
};


// ─── DAILY NOTES ─────────────────────────────────────────────────────────────

/**
 * Save a daily note/report entry (structured).
 * @param {{ note?: string, activity_type?: string, plot_id?: string,
 *           chemical_name?: string, chemical_qty?: string, application_timing?: string,
 *           temperature_am?: number, humidity?: number,
 *           growth_stage?: string, pest_notes?: string, disease_incidence?: number,
 *           disease_name_observed?: string, scout_severity?: string,
 *           kg_harvested?: number, quality_grade?: string,
 *           price_per_kg?: number, buyer_name?: string,
 *           expense_amount?: number }} entry
 * @param {string|null} userId
 */
export const saveDailyNote = async (entry, userId = null) => {
    const newNote = {
        id:                  Date.now().toString(36),
        note:                entry.note                || '',
        activity_type:       entry.activity_type       || 'note',
        plot_id:             entry.plot_id             || null,
        chemical_name:       entry.chemical_name       || null,
        chemical_qty:        entry.chemical_qty        || null,
        application_timing:  entry.application_timing  || null,
        temperature_am:      entry.temperature_am != null ? Number(entry.temperature_am) : null,
        humidity:            entry.humidity        != null ? Number(entry.humidity)       : null,
        growth_stage:        entry.growth_stage        || null,
        pest_notes:          entry.pest_notes          || null,
        disease_incidence:   entry.disease_incidence != null ? Number(entry.disease_incidence) : null,
        disease_name_observed: entry.disease_name_observed || null,
        scout_severity:      entry.scout_severity      || null,
        kg_harvested:        entry.kg_harvested != null ? Number(entry.kg_harvested) : null,
        quality_grade:       entry.quality_grade       || null,
        price_per_kg:        entry.price_per_kg != null ? Number(entry.price_per_kg) : null,
        buyer_name:          entry.buyer_name          || null,
        expense_amount:      entry.expense_amount != null ? Number(entry.expense_amount) : null,
        expense_category:    entry.expense_category    || null,
        photo_url:           entry.photo_url           || null,
        created_at:          new Date().toISOString(),
    };

    if (userId && supabase) {
        const { error } = await supabase
            .from('daily_notes')
            .insert({ ...newNote, user_id: userId });
        if (error) { console.error('saveDailyNote error:', error); return null; }
        return newNote;
    }

    try {
        const NOTES_KEY = 'sea_plant_daily_notes';
        const existing  = JSON.parse(decryptData(localStorage.getItem(NOTES_KEY) || encryptData('[]')));
        existing.unshift(newNote);
        localStorage.setItem(NOTES_KEY, encryptData(JSON.stringify(existing.slice(0, 50))));
        return newNote;
    } catch {
        return null;
    }
};

/**
 * Get all daily notes.
 * @param {string|null} userId
 */
export const getDailyNotes = (userId = null) => {
    if (userId && supabase) {
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

    try {
        const NOTES_KEY = 'sea_plant_daily_notes';
        const data = localStorage.getItem(NOTES_KEY);
        if (!data) return [];
        try {
            return JSON.parse(decryptData(data));
        } catch {
            localStorage.removeItem(NOTES_KEY);
            return [];
        }
    } catch {
        return [];
    }
};


// ─── FARM PLOTS ──────────────────────────────────────────────────────────────

/**
 * Save a new farm/plot entry.
 * @param {{ name: string, cropType: string, area: number, unit: string }} plot
 * @param {string|null} userId
 */
export const savePlot = async (plot, userId = null) => {
    const newPlot = {
        id:         Date.now().toString(36),
        name:       plot.name || '',
        crop_type:  plot.cropType || '',
        area:       plot.area || 0,
        unit:       plot.unit || 'acres',
        soil_ph:    plot.soil_ph != null ? Number(plot.soil_ph) : null,
        npk_n:      plot.npk_n  != null ? Number(plot.npk_n)  : null,
        npk_p:      plot.npk_p  != null ? Number(plot.npk_p)  : null,
        npk_k:      plot.npk_k  != null ? Number(plot.npk_k)  : null,
        created_at: new Date().toISOString(),
    };

    if (userId && supabase) {
        const { error } = await supabase
            .from('plots')
            .insert({ ...newPlot, user_id: userId });
        if (error) { console.error('savePlot error:', error); return null; }
        return newPlot;
    }

    try {
        const PLOTS_KEY = 'sea_plant_plots';
        const existing  = JSON.parse(decryptData(localStorage.getItem(PLOTS_KEY) || encryptData('[]')));
        existing.unshift(newPlot);
        localStorage.setItem(PLOTS_KEY, encryptData(JSON.stringify(existing)));
        return newPlot;
    } catch {
        return null;
    }
};

/**
 * Get all farm plots.
 * @param {string|null} userId
 */
export const getPlots = (userId = null) => {
    if (userId && supabase) {
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

    try {
        const PLOTS_KEY = 'sea_plant_plots';
        const data = localStorage.getItem(PLOTS_KEY);
        if (!data) return [];
        try {
            return JSON.parse(decryptData(data));
        } catch {
            localStorage.removeItem(PLOTS_KEY);
            return [];
        }
    } catch {
        return [];
    }
};

/**
 * Delete a plot by ID.
 * @param {string} id
 * @param {string|null} userId
 */
export const deletePlot = async (id, userId = null) => {
    if (userId && supabase) {
        const { error } = await supabase
            .from('plots')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) { console.error('deletePlot error:', error); return false; }
        return true;
    }

    try {
        const PLOTS_KEY = 'sea_plant_plots';
        const existing  = JSON.parse(decryptData(localStorage.getItem(PLOTS_KEY) || encryptData('[]')));
        localStorage.setItem(PLOTS_KEY, encryptData(JSON.stringify(existing.filter(p => p.id !== id))));
        return true;
    } catch {
        return false;
    }
};
