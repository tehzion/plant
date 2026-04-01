import CryptoJS from 'crypto-js';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'sea_plant_scan_history';
const LOGBOOK_KEY = 'sea_plant_mygap_logbook';
const CHECKLIST_KEY = 'sea_plant_mygap_checklist';
const NOTES_KEY = 'sea_plant_daily_notes';
const PLOTS_KEY = 'sea_plant_plots';
const GUEST_ID_KEY = 'sea_plant_guest_id';
const ORDERS_KEY = 'sea_plant_orders';
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

const MAX_SCANS = 50;
const MAX_NOTES = 60;
const MAX_LOGS = 100;
const MAX_PLOTS = 30;

export const STORAGE_COLLECTION_KEYS = {
    STORAGE_KEY,
    LOGBOOK_KEY,
    CHECKLIST_KEY,
    NOTES_KEY,
    PLOTS_KEY,
    GUEST_ID_KEY,
    ORDERS_KEY,
};

const QUOTA_CLEANUP_ORDER = [
    { key: STORAGE_KEY, label: 'scanHistory', batchSize: 10 },
    { key: LOGBOOK_KEY, label: 'logbook', batchSize: 10 },
    { key: NOTES_KEY, label: 'dailyNotes', batchSize: 5 },
];

let lastStorageCleanupNotice = null;

if (!SECRET_KEY && import.meta.env.DEV) {
    console.warn('VITE_ENCRYPTION_KEY missing. localStorage will be unencrypted in guest mode.');
}

const encryptData = (text) => {
    if (!SECRET_KEY) return text;
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

const decryptData = (ciphertext) => {
    if (!SECRET_KEY || !ciphertext) return ciphertext;
    if (ciphertext.startsWith('[') || ciphertext.startsWith('{')) return ciphertext;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || ciphertext;
    } catch {
        return ciphertext;
    }
};

const safeRead = (key, fallback = []) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        try {
            return JSON.parse(decryptData(raw));
        } catch {
            try {
                return JSON.parse(raw);
            } catch {
                localStorage.removeItem(key);
                return fallback;
            }
        }
    } catch {
        return fallback;
    }
};

const isQuotaError = (error) =>
    error?.name === 'QuotaExceededError'
    || error?.message?.toLowerCase?.().includes('quota');

const writeEncryptedPayload = (key, payload) => {
    try {
        localStorage.setItem(key, encryptData(JSON.stringify(payload)));
        return true;
    } catch (err) {
        if (isQuotaError(err)) return 'quota';
        console.error(`localStorage write error [${key}]:`, err);
        return false;
    }
};

const trimOldestItems = (items, batchSize) => {
    if (!Array.isArray(items) || items.length === 0) return items;
    const nextLength = Math.max(0, items.length - Math.max(1, batchSize));
    return items.slice(0, nextLength);
};

const recordCleanupNotice = (targetKey, cleanedCollections) => {
    if (!cleanedCollections.length) return;
    lastStorageCleanupNotice = {
        targetKey,
        cleanedCollections,
        timestamp: Date.now(),
    };
};

export const consumeStorageCleanupNotice = () => {
    const notice = lastStorageCleanupNotice;
    lastStorageCleanupNotice = null;
    return notice;
};

const safeWrite = (key, data) => {
    lastStorageCleanupNotice = null;
    let pendingPayload = data;
    const firstAttempt = writeEncryptedPayload(key, pendingPayload);

    if (firstAttempt === true) {
        return { ok: true, storedData: pendingPayload, cleanedCollections: [] };
    }
    if (firstAttempt === false) {
        return { ok: false, storedData: pendingPayload, cleanedCollections: [] };
    }

    const cleanedCollections = [];

    for (const descriptor of QUOTA_CLEANUP_ORDER) {
        while (true) {
            if (descriptor.key === key) {
                if (!Array.isArray(pendingPayload) || pendingPayload.length === 0) break;
                const trimmedPayload = trimOldestItems(pendingPayload, descriptor.batchSize);
                if (trimmedPayload.length === pendingPayload.length) break;
                cleanedCollections.push({
                    key: descriptor.key,
                    label: descriptor.label,
                    removedCount: pendingPayload.length - trimmedPayload.length,
                });
                pendingPayload = trimmedPayload;
            } else {
                const existing = safeRead(descriptor.key, null);
                if (!Array.isArray(existing) || existing.length === 0) break;
                const trimmedExisting = trimOldestItems(existing, descriptor.batchSize);
                if (trimmedExisting.length === existing.length) break;
                const cleanupWrite = writeEncryptedPayload(descriptor.key, trimmedExisting);
                if (cleanupWrite !== true) break;
                cleanedCollections.push({
                    key: descriptor.key,
                    label: descriptor.label,
                    removedCount: existing.length - trimmedExisting.length,
                });
            }

            const retry = writeEncryptedPayload(key, pendingPayload);
            if (retry === true) {
                recordCleanupNotice(key, cleanedCollections);
                return { ok: true, storedData: pendingPayload, cleanedCollections };
            }
            if (retry === false) {
                return { ok: false, storedData: pendingPayload, cleanedCollections };
            }
        }
    }

    console.error(`[localStorage] Failed to write "${key}" after quota cleanup. Storage may be full.`);
    return { ok: false, storedData: pendingPayload, cleanedCollections };
};

export const writeStorageCollection = (key, data) => safeWrite(key, data);

export const normalizeLegacyDailyNote = (note = {}) => ({
    id: note.id ?? crypto.randomUUID(),
    note: note.note ?? '',
    activity_type: note.activity_type ?? 'note',
    plot_id: note.plot_id ?? null,
    chemical_name: note.chemical_name ?? null,
    chemical_qty: note.chemical_qty ?? null,
    application_timing: note.application_timing ?? null,
    temperature_am: note.temperature_am ?? null,
    humidity: note.humidity ?? null,
    growth_stage: note.growth_stage ?? null,
    pest_notes: note.pest_notes ?? null,
    disease_incidence: note.disease_incidence ?? null,
    disease_name_observed: note.disease_name_observed ?? null,
    scout_severity: note.scout_severity ?? null,
    kg_harvested: note.kg_harvested ?? null,
    quality_grade: note.quality_grade ?? null,
    price_per_kg: note.price_per_kg ?? null,
    buyer_name: note.buyer_name ?? null,
    expense_amount: note.expense_amount ?? null,
    expense_category: note.expense_category ?? null,
    pruned_count: note.pruned_count ?? null,
    pruning_type: note.pruning_type ?? null,
    inspection_type: note.inspection_type ?? null,
    inspection_status: note.inspection_status ?? null,
    photo_url: note.photo_url ?? note.photo_base64 ?? null,
    created_at: note.created_at ?? note.timestamp ?? new Date().toISOString(),
    ...note,
});

export const normalizeStoredPlot = (plot = {}) => {
    const cropType = plot.cropType ?? plot.crop_type ?? '';

    return {
        id: plot.id ?? crypto.randomUUID(),
        name: plot.name ?? '',
        cropType,
        crop_type: cropType,
        area: plot.area ?? 0,
        unit: plot.unit ?? 'acres',
        soil_ph: plot.soil_ph ?? null,
        npk_n: plot.npk_n ?? null,
        npk_p: plot.npk_p ?? null,
        npk_k: plot.npk_k ?? null,
        created_at: plot.created_at ?? plot.timestamp ?? new Date().toISOString(),
        ...plot,
        cropType,
        crop_type: cropType,
    };
};

export const migrateLocalSchema = (key, version, migrateFn) => {
    const flagKey = `${key}_schema_v${version}`;
    if (localStorage.getItem(flagKey)) return;

    const data = safeRead(key, null);
    if (!Array.isArray(data)) {
        localStorage.setItem(flagKey, '1');
        return;
    }

    try {
        const migrated = data.map((item) => {
            try {
                return migrateFn(item);
            } catch {
                return item;
            }
        });
        safeWrite(key, migrated);
        localStorage.setItem(flagKey, '1');
        console.log(`[schema] Migrated "${key}" to v${version}`);
    } catch (err) {
        console.warn(`[schema] Migration failed for "${key}" v${version}:`, err);
    }
};

migrateLocalSchema(NOTES_KEY, 1, (note) => ({
    kg_harvested: null,
    quality_grade: null,
    price_per_kg: null,
    buyer_name: null,
    pruned_count: null,
    pruning_type: null,
    inspection_type: null,
    inspection_status: null,
    ...note,
}));

migrateLocalSchema(NOTES_KEY, 2, normalizeLegacyDailyNote);
migrateLocalSchema(PLOTS_KEY, 1, normalizeStoredPlot);

const uploadImageToStorage = async (base64, userId, scanId, suffix = 'main') => {
    if (!supabase || !base64 || !userId) return null;
    try {
        const base64Data = base64.startsWith('data:') ? base64.split(',')[1] : base64;
        const byteChars = atob(base64Data);
        const blob = new Blob(
            [new Uint8Array(Array.from(byteChars, (c) => c.charCodeAt(0)))],
            { type: 'image/jpeg' },
        );
        const path = `${userId}/${scanId}_${suffix}.jpg`;
        const { error } = await supabase.storage
            .from('scan-images')
            .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (error) {
            console.warn('Image upload failed:', error.message);
            return null;
        }
        const { data } = supabase.storage.from('scan-images').getPublicUrl(path);
        return data.publicUrl;
    } catch (error) {
        console.warn('Image upload exception:', error);
        return null;
    }
};

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
                user_id: userId,
                disease: scanData.disease || null,
                confidence: scanData.confidence ?? null,
                severity: scanData.severity || null,
                category: scanData.category || null,
                scale: scanData.farmScale || scanData.scale || null,
                location_name: scanData.locationName || null,
                result_json: { ...scanData, image: null, leafImage: null },
                image_url: imageUrl,
                leaf_image_url: leafImageUrl,
                created_at: new Date().toISOString(),
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
        } catch (error) {
            console.error('Supabase saveScan error:', error);
            throw error;
        }
    }

    const history = getScanHistory();
    const newScan = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...scanData };
    history.unshift(newScan);
    const writeResult = safeWrite(STORAGE_KEY, history.slice(0, MAX_SCANS));
    if (!writeResult.ok) {
        console.warn('saveScan: could not persist scan. Storage may be full');
    }
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
                if (error) {
                    console.error('getScanHistory error:', error);
                    return [];
                }
                return (data || []).map((row) => ({
                    ...row.result_json,
                    id: row.id,
                    timestamp: row.created_at,
                    disease: row.disease,
                    confidence: row.confidence,
                    severity: row.severity,
                    category: row.category,
                    image_url: row.image_url,
                    leaf_image_url: row.leaf_image_url,
                    locationName: row.location_name,
                }));
            });
    }
    return safeRead(STORAGE_KEY, []);
};

export const getScanById = (id, userId = null) => {
    const getLocalScan = () => {
        const history = getScanHistory();
        return history.find((scan) => scan.id === id) || null;
    };

    if (userId && userId !== 'demo-user-123' && supabase) {
        return supabase
            .from('scan_history')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .then(({ data, error }) => {
                if (error || !data) return getLocalScan();
                return {
                    ...data.result_json,
                    id: data.id,
                    timestamp: data.created_at,
                    disease: data.disease,
                    confidence: data.confidence,
                    severity: data.severity,
                    category: data.category,
                    image_url: data.image_url,
                    leaf_image_url: data.leaf_image_url,
                    locationName: data.location_name,
                };
            })
            .catch(() => getLocalScan());
    }
    return getLocalScan();
};

export const deleteScan = async (id, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('scan_history').delete().eq('id', id).eq('user_id', userId);
        if (error) {
            console.error('deleteScan error:', error);
            return false;
        }
        return true;
    }
    const filtered = getScanHistory().filter((scan) => scan.id !== id);
    return safeWrite(STORAGE_KEY, filtered).ok;
};

export const clearAllScans = async (userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('scan_history').delete().eq('user_id', userId);
        if (error) {
            console.error('clearAllScans error:', error);
            return false;
        }
        return true;
    }
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch {
        return false;
    }
};

export const getGroupedScans = async (userId = null) => {
    const history = await Promise.resolve(getScanHistory(userId));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const fortnightAgo = new Date(today);
    fortnightAgo.setDate(fortnightAgo.getDate() - 14);
    const grouped = { today: [], yesterday: [], thisWeek: [], lastWeek: [], older: [] };

    history.forEach((scan) => {
        const date = new Date(scan.timestamp ?? scan.created_at);
        const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (day.getTime() === today.getTime()) grouped.today.push(scan);
        else if (day.getTime() === yesterday.getTime()) grouped.yesterday.push(scan);
        else if (date >= weekAgo) grouped.thisWeek.push(scan);
        else if (date >= fortnightAgo) grouped.lastWeek.push(scan);
        else grouped.older.push(scan);
    });

    return grouped;
};

export const saveLogEntry = async (logEntry, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const newLog = {
            id: crypto.randomUUID(),
            user_id: userId,
            type: logEntry.type,
            notes: logEntry.notes,
            created_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('mygap_logs').insert(newLog);
        if (error) {
            console.error('saveLogEntry error:', error);
            return null;
        }
        return { ...newLog, timestamp: newLog.created_at };
    }

    const logs = getLogbook();
    const newLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...logEntry };
    logs.unshift(newLog);
    safeWrite(LOGBOOK_KEY, logs.slice(0, MAX_LOGS));
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
                if (error) {
                    console.error('getLogbook error:', error);
                    return [];
                }
                return (data || []).map((row) => ({
                    id: row.id,
                    timestamp: row.created_at,
                    type: row.type,
                    notes: row.notes,
                }));
            });
    }
    return safeRead(LOGBOOK_KEY, []);
};

export const saveChecklistState = async (state, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase
            .from('mygap_checklist')
            .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
        if (error) {
            console.error('saveChecklistState error:', error);
            return false;
        }
        return true;
    }

    try {
        localStorage.setItem(CHECKLIST_KEY, encryptData(JSON.stringify(state)));
        return true;
    } catch {
        return false;
    }
};

export const getChecklistState = (userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        return supabase
            .from('mygap_checklist')
            .select('state')
            .eq('user_id', userId)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) {
                    console.error('getChecklistState error:', error);
                    return {};
                }
                return data?.state ?? {};
            });
    }
    return safeRead(CHECKLIST_KEY, {});
};

export const saveDailyNote = async (entry, userId = null) => {
    const newNote = normalizeLegacyDailyNote({
        id: crypto.randomUUID(),
        note: entry.note || '',
        activity_type: entry.activity_type || 'note',
        plot_id: entry.plot_id || null,
        chemical_name: entry.chemical_name || null,
        chemical_qty: entry.chemical_qty || null,
        application_timing: entry.application_timing || null,
        temperature_am: entry.temperature_am != null ? Number(entry.temperature_am) : null,
        humidity: entry.humidity != null ? Number(entry.humidity) : null,
        growth_stage: entry.growth_stage || null,
        pest_notes: entry.pest_notes || null,
        disease_incidence: entry.disease_incidence != null ? Number(entry.disease_incidence) : null,
        disease_name_observed: entry.disease_name_observed || null,
        scout_severity: entry.scout_severity || null,
        kg_harvested: entry.kg_harvested != null ? Number(entry.kg_harvested) : null,
        quality_grade: entry.quality_grade || null,
        price_per_kg: entry.price_per_kg != null ? Number(entry.price_per_kg) : null,
        buyer_name: entry.buyer_name || null,
        expense_amount: entry.expense_amount != null ? Number(entry.expense_amount) : null,
        expense_category: entry.expense_category || null,
        pruned_count: entry.pruned_count != null ? Number(entry.pruned_count) : null,
        pruning_type: entry.pruning_type || null,
        inspection_type: entry.inspection_type || null,
        inspection_status: entry.inspection_status || null,
        photo_url: entry.photo_url || null,
        created_at: new Date().toISOString(),
    });

    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('daily_notes').insert({ ...newNote, user_id: userId });
        if (error) {
            console.error('saveDailyNote error:', error);
            return null;
        }
        return newNote;
    }

    const existing = safeRead(NOTES_KEY, []);
    existing.unshift(newNote);
    const writeResult = safeWrite(NOTES_KEY, existing.slice(0, MAX_NOTES));
    return writeResult.ok ? newNote : null;
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
                if (error) {
                    console.error('getDailyNotes error:', error);
                    return [];
                }
                return data || [];
            });
    }
    return safeRead(NOTES_KEY, []).map(normalizeLegacyDailyNote);
};

export const savePlot = async (plot, userId = null) => {
    const newPlot = normalizeStoredPlot({
        id: crypto.randomUUID(),
        name: plot.name || '',
        cropType: plot.cropType || plot.crop_type || '',
        area: plot.area || 0,
        unit: plot.unit || 'acres',
        soil_ph: plot.soil_ph != null ? Number(plot.soil_ph) : null,
        npk_n: plot.npk_n != null ? Number(plot.npk_n) : null,
        npk_p: plot.npk_p != null ? Number(plot.npk_p) : null,
        npk_k: plot.npk_k != null ? Number(plot.npk_k) : null,
        created_at: new Date().toISOString(),
    });

    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('plots').insert({ ...newPlot, user_id: userId });
        if (error) {
            console.error('savePlot error:', error);
            return null;
        }
        return newPlot;
    }

    const existing = safeRead(PLOTS_KEY, []).map(normalizeStoredPlot);
    existing.unshift(newPlot);
    const writeResult = safeWrite(PLOTS_KEY, existing.slice(0, MAX_PLOTS));
    return writeResult.ok ? newPlot : null;
};

export const getPlots = (userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        return supabase
            .from('plots')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('getPlots error:', error);
                    return [];
                }
                return (data || []).map(normalizeStoredPlot);
            });
    }
    return safeRead(PLOTS_KEY, []).map(normalizeStoredPlot);
};

// ─── Guest Identity & Orders ──────────────────────────────────────────────────

/**
 * Get or create a persistent Guest ID for this browser session
 */
export const getGuestId = () => {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
        guestId = `guest_${crypto.randomUUID()}`;
        localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
};

/**
 * Save an order ID to local history
 */
export const saveLocalOrder = (orderId) => {
    if (!orderId) return;
    const orders = safeRead(ORDERS_KEY, []);
    if (!orders.includes(orderId)) {
        orders.unshift(orderId);
        safeWrite(ORDERS_KEY, orders.slice(0, 100));
    }
};

/**
 * Get locally stored order IDs
 */
export const getLocalOrders = () => safeRead(ORDERS_KEY, []);

export const deletePlot = async (id, userId = null) => {
    if (userId && userId !== 'demo-user-123' && supabase) {
        const { error } = await supabase.from('plots').delete().eq('id', id).eq('user_id', userId);
        if (error) {
            console.error('deletePlot error:', error);
            return false;
        }
        return true;
    }
    const filtered = safeRead(PLOTS_KEY, []).filter((plot) => plot.id !== id);
    return safeWrite(PLOTS_KEY, filtered).ok;
};

export const seedDemoData = (userId, data) => {
    if (userId !== 'demo-user-123') return;
    const { scans, notes, plots, logbook } = data;

    const seedKey = (key, items, maxItems, normalizeFn = null) => {
        if (!items?.length) return;
        const existing = safeRead(key, []);
        if (existing.length === 0) {
            const normalized = normalizeFn ? items.map(normalizeFn) : items;
            safeWrite(key, normalized.slice(0, maxItems));
        }
    };

    seedKey(STORAGE_KEY, scans, MAX_SCANS);
    seedKey(NOTES_KEY, notes, MAX_NOTES, normalizeLegacyDailyNote);
    seedKey(PLOTS_KEY, plots, MAX_PLOTS, normalizeStoredPlot);
    seedKey(LOGBOOK_KEY, logbook, MAX_LOGS);
};
