import CryptoJS from 'crypto-js';
import { supabase } from '../lib/supabase';
import { resolvePrivateImageUrl, uploadPrivateImage } from './privateImageStorage.js';
import { parsePHIDays } from './phi.js';
import { dataUrlToBlob, enqueueOperation, getMetadata, getRecord, isIndexedDbAvailable, listRecords, listOperations, removeOperation, putPhoto, putRecord, deleteRecord, setMetadata } from './indexedDbStorage.js';
import { fetchNeonRows, neonApiRequest, neonDataRequest, neonDataRowRequest } from './neonApi.js';
import { queueSyncOperation } from './syncQueue.js';

const STORAGE_KEY = 'sea_plant_scan_history';
const LOGBOOK_KEY = 'sea_plant_mygap_logbook';
const CHECKLIST_KEY = 'sea_plant_mygap_checklist';
const NOTES_KEY = 'sea_plant_daily_notes';
const PLOTS_KEY = 'sea_plant_plots';
const GUEST_ID_KEY = 'sea_plant_guest_id';
const ORDERS_KEY = 'sea_plant_orders';
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

// Keep demo data in its own namespace so it can never be imported into a real
// account's guest migration. Guest mode keeps the historical keys for
// backwards compatibility; authenticated data is stored through the Neon API.
let storageNamespace = 'guest';
const namespacedKey = (key) => storageNamespace === 'guest' ? key : `${storageNamespace}::${key}`;

export const setLocalStorageNamespace = (namespace = 'guest') => {
    storageNamespace = namespace === 'demo' ? 'demo' : 'guest';
};

export const getLocalStorageNamespace = () => storageNamespace;

const persistIndexedGuestRecord = async (collection, value, revision = 0) => {
    if (!isIndexedDbAvailable() || storageNamespace === 'demo') return true;
    const owner = `guest:${getGuestId()}`;
    try {
        const indexedValue = { ...value };
        const photoRefs = {};
        for (const field of ['image', 'leafImage', 'photo_base64']) {
            const blob = dataUrlToBlob(indexedValue[field]);
            if (!blob) continue;
            const photoId = `${collection}:${value.id}:${field}`;
            await putPhoto(owner, photoId, blob);
            photoRefs[field] = photoId;
            indexedValue[field] = null;
        }
        if (Object.keys(photoRefs).length) indexedValue.photoRefs = photoRefs;
        await putRecord({ owner, collection, id: value.id, value: indexedValue, revision });
        await enqueueOperation({ owner, collection, recordId: value.id, type: 'create', expectedRevision: revision, payload: indexedValue });
        return true;
    } catch (error) {
        console.error('IndexedDB guest write failed:', error);
        return false;
    }
};


// ─── Signed-in offline support ───────────────────────────────────────────────
// Signed-in records normally go straight to Neon. When the network is down the
// record is kept on this device and queued for /api/sync instead of being lost.
const CLOUD_COLLECTION_TABLES = { scans: 'scan_history', logbook: 'mygap_logs', notes: 'daily_notes', plots: 'plots' };
const cloudOwner = (userId) => `user:${userId}`;

const mergePending = async (userId, collection, mapped) => {
    if (!isIndexedDbAvailable()) return mapped;
    const pending = await listRecords(cloudOwner(userId), collection).catch(() => []);
    const ids = new Set(pending.map(item => String(item.id)));
    return [...pending.filter(item => !item.__deleted), ...mapped.filter(item => !ids.has(String(item.id)))];
};

const queueCloudMutation = async (userId, collection, id, type, changes = {}, reason = null, source = null) => {
    if (!isIndexedDbAvailable()) throw new Error('Offline storage is unavailable.');
    if (collection === 'logbook' && String(reason || '').trim().length < 3) throw new Error('Give a short reason for the change.');
    const owner = cloudOwner(userId);
    const operations = (await listOperations(owner)).filter(op => op.collection === collection && String(op.recordId) === String(id));
    if (operations.some(op => op.type === 'create')) throw new Error('Wait for this new record to sync before changing it.');
    const cached = await getMetadata(`cloud-cache:${owner}:${collection}`);
    const expectedRecord = operations[0]?.expectedRecord || source || cached?.find(row => String(row.id) === String(id));
    if (!expectedRecord) throw new Error('Open this record while online before changing it offline.');
    const raw = { ...expectedRecord, ...operations.find(op => op.type === 'update')?.payload, ...changes };
    const value = collection === 'logbook' ? fromLogbookRow(raw) : collection === 'scans' ? await hydrateScanHistoryRow(raw) : collection === 'plots' ? normalizeStoredPlot(raw) : raw;
    await queueSyncOperation({ owner, collection, recordId: String(id), type, expectedRecord, reason, payload: type === 'delete' ? null : { ...operations.find(op => op.type === 'update')?.payload, ...changes } });
    if (type === 'delete') await Promise.all(operations.filter(op => op.type === 'update').map(op => removeOperation(op.id)));
    await putRecord({ owner, collection, id: String(id), value: { ...value, syncStatus: 'pending', __deleted: type === 'delete' } });
    return { ...value, syncStatus: 'pending' };
};

export const isConnectivityError = (error) => (
    error instanceof TypeError
    || (typeof navigator !== 'undefined' && navigator.onLine === false)
    || [408, 429, 500, 502, 503, 504].includes(Number(error?.status))
);

const queueCloudRecord = async (userId, collection, row, localValue) => {
    if (!isIndexedDbAvailable()) return null;
    const owner = cloudOwner(userId);
    const { user_id: _ownerFromClient, ...payload } = row;
    const value = { ...localValue, syncStatus: 'pending' };
    await putRecord({ owner, collection, id: String(row.id), value });
    await queueSyncOperation({ owner, collection, recordId: String(row.id), type: 'create', payload });
    return value;
};

const writeCloudRecord = async (userId, collection, row, localValue) => {
    try {
        await neonDataRequest(CLOUD_COLLECTION_TABLES[collection], { operation: 'insert', payload: row });
        return { ...localValue, syncStatus: 'synced' };
    } catch (error) {
        if (!isConnectivityError(error)) throw error;
        const queued = await queueCloudRecord(userId, collection, row, localValue).catch((queueError) => {
            console.error('Offline queue write failed:', queueError);
            return null;
        });
        if (!queued) throw error;
        return queued;
    }
};

// Reads merge records still waiting to sync, and fall back to the last copy
// fetched on this device when the network is unavailable.
const readCloudCollection = async (userId, collection, fetchRows, mapRows) => {
    const owner = cloudOwner(userId);
    const cacheKey = `cloud-cache:${owner}:${collection}`;
    let rows;
    try {
        rows = await fetchRows();
        if (isIndexedDbAvailable()) setMetadata(cacheKey, rows).catch(() => {});
    } catch (error) {
        if (!isConnectivityError(error) || !isIndexedDbAvailable()) throw error;
        rows = await getMetadata(cacheKey).catch(() => null);
        if (!Array.isArray(rows)) throw error;
    }
    const mapped = await mapRows(rows);
    if (!isIndexedDbAvailable()) return mapped;
    return mergePending(userId, collection, mapped);
};

/** Clears cached cloud snapshots (not pending records) when a user signs out. */
export const clearCloudReadCache = async (userId) => {
    if (!userId || !isIndexedDbAvailable()) return;
    await Promise.all(Object.keys(CLOUD_COLLECTION_TABLES).map((collection) => (
        setMetadata(`cloud-cache:${cloudOwner(userId)}:${collection}`, null).catch(() => {})
    )));
};

export const STORAGE_COLLECTION_KEYS = {
    STORAGE_KEY,
    LOGBOOK_KEY,
    CHECKLIST_KEY,
    NOTES_KEY,
    PLOTS_KEY,
    GUEST_ID_KEY,
    ORDERS_KEY,
};

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
        const raw = localStorage.getItem(namespacedKey(key));
        if (!raw) return fallback;
        try {
            return JSON.parse(decryptData(raw));
        } catch {
            try {
                return JSON.parse(raw);
            } catch {
                localStorage.removeItem(namespacedKey(key));
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
        localStorage.setItem(namespacedKey(key), encryptData(JSON.stringify(payload)));
        return true;
    } catch (err) {
        if (isQuotaError(err)) return 'quota';
        console.error(`localStorage write error [${key}]:`, err);
        return false;
    }
};

export const consumeStorageCleanupNotice = () => {
    const notice = lastStorageCleanupNotice;
    lastStorageCleanupNotice = null;
    return notice;
};

const safeWrite = (key, data) => {
    lastStorageCleanupNotice = null;
    const ok = writeEncryptedPayload(key, data) === true;
    // Farm evidence must never be discarded to make room for another write.
    return { ok, storedData: data, cleanedCollections: [] };
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
    photo_path: note.photo_path ?? null,
    created_at: note.created_at ?? note.timestamp ?? new Date().toISOString(),
    ...note,
});

export const normalizeStoredPlot = (plot = {}) => {
    const cropType = plot.cropType ?? plot.crop_type ?? '';

    return {
        id: plot.id ?? crypto.randomUUID(),
        name: plot.name ?? '',
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

const toNullableNumber = (value) => {
    if (value === '' || value == null) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

export const isCloudUser = (userId = null) => Boolean(userId && userId !== 'demo-user-123' && supabase);

export const toScanHistoryRow = (
    scanData = {},
    userId,
    id = scanData.id ?? crypto.randomUUID(),
    imageUrl = null,
    leafImageUrl = null,
    imagePath = null,
    leafImagePath = null,
) => ({
    id,
    user_id: userId,
    disease: scanData.disease || null,
    confidence: scanData.confidence ?? null,
    severity: scanData.severity || null,
    category: scanData.category || null,
    scale: scanData.farmScale || scanData.scale || null,
    location_name: scanData.locationName || scanData.location_name || null,
    plot_id: scanData.plotId || scanData.plot_id || scanData.result_json?.plot_id || null,
    result_json: { ...scanData, image: null, leafImage: null },
    image_url: imageUrl || scanData.image_url || null,
    leaf_image_url: leafImageUrl || scanData.leaf_image_url || null,
    image_path: imagePath || scanData.image_path || null,
    leaf_image_path: leafImagePath || scanData.leaf_image_path || null,
    revision: Number.isInteger(scanData.revision) ? scanData.revision : 0,
    created_at: scanData.timestamp || scanData.created_at || new Date().toISOString(),
});

export const fromScanHistoryRow = (row = {}, signedUrls = {}) => ({
    ...(row.result_json || {}),
    id: row.id,
    timestamp: row.created_at,
    disease: row.disease,
    confidence: row.confidence,
    severity: row.severity,
    category: row.category,
    farmScale: row.scale,
    image_url: signedUrls.imageUrl || row.image_url,
    leaf_image_url: signedUrls.leafImageUrl || row.leaf_image_url,
    image_path: row.image_path || row.result_json?.image_path || null,
    leaf_image_path: row.leaf_image_path || row.result_json?.leaf_image_path || null,
    locationName: row.location_name,
    plotId: row.plot_id || row.result_json?.plot_id || null,
    revision: Number.isInteger(row.revision) ? row.revision : Number.isInteger(row.result_json?.revision) ? row.result_json.revision : 0,
});

const hydrateScanHistoryRow = async (row = {}) => {
    const imagePath = row.image_path || row.result_json?.image_path || '';
    const leafImagePath = row.leaf_image_path || row.result_json?.leaf_image_path || '';
    const [imageUrl, leafImageUrl] = await Promise.all([
        resolvePrivateImageUrl(imagePath, row.image_url),
        resolvePrivateImageUrl(leafImagePath, row.leaf_image_url),
    ]);
    return fromScanHistoryRow(row, { imageUrl, leafImageUrl });
};

const optionalText = (value, max = 200) => {
    const text = value == null ? '' : String(value).trim();
    return text ? text.slice(0, max) : null;
};

const optionalAmount = (value) => {
    if (value === '' || value == null) return null;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

// Structured myGAP record fields. Quantity is recorded exactly as the farmer
// entered it; the app never calculates or suggests chemical dosages.
export const LOGBOOK_DETAIL_FIELDS = ['activity_date', 'plot_id', 'crop', 'product_used', 'quantity', 'operator', 'active_ingredient', 'registration_no', 'area_treated', 'target_pest', 'phi_days', 'linked_scan_id', 'updated_at', 'amount', 'unit', 'supplier', 'price', 'buyer', 'lot_code', 'topic', 'attendees'];

export const toLogbookRow = (log = {}, userId) => ({
    id: String(log.id ?? crypto.randomUUID()),
    user_id: userId,
    type: log.type || 'pesticide',
    notes: log.notes || '',
    activity_date: optionalText(log.activity_date ?? log.activityDate, 10),
    plot_id: optionalText(log.plot_id ?? log.plotId, 200),
    crop: optionalText(log.crop),
    product_used: optionalText(log.product_used ?? log.productUsed),
    quantity: optionalText(log.quantity, 100),
    operator: optionalText(log.operator, 120),
    active_ingredient: optionalText(log.active_ingredient, 200),
    registration_no: optionalText(log.registration_no, 60),
    area_treated: optionalText(log.area_treated, 60),
    target_pest: optionalText(log.target_pest, 200),
    phi_days: parsePHIDays(log.phi_days),
    linked_scan_id: optionalText(log.linked_scan_id, 200),
    amount: optionalAmount(log.amount),
    unit: optionalText(log.unit, 20),
    supplier: optionalText(log.supplier, 200),
    price: optionalText(log.price, 60),
    buyer: optionalText(log.buyer, 200),
    lot_code: optionalText(log.lot_code, 60),
    topic: optionalText(log.topic, 200),
    attendees: optionalText(log.attendees, 1000),
    created_at: log.timestamp || log.created_at || new Date().toISOString(),
});

export const fromLogbookRow = (row = {}) => ({
    id: row.id,
    timestamp: row.created_at,
    type: row.type,
    notes: row.notes,
    ...Object.fromEntries(LOGBOOK_DETAIL_FIELDS.map((field) => [field, row[field] ?? null])),
    activity_date: row.activity_date ? String(row.activity_date).slice(0, 10) : null,
    amount: optionalAmount(row.amount),
    ...(row.syncStatus ? { syncStatus: row.syncStatus } : {}),
});

export const toDailyNoteRow = (note = {}, userId) => {
    const normalized = normalizeLegacyDailyNote(note);
    return {
        id: String(normalized.id),
        user_id: userId,
        note: normalized.note || '',
        activity_type: normalized.activity_type || 'note',
        plot_id: normalized.plot_id || null,
        chemical_name: normalized.chemical_name || null,
        chemical_qty: normalized.chemical_qty || null,
        application_timing: normalized.application_timing || null,
        temperature_am: toNullableNumber(normalized.temperature_am),
        humidity: toNullableNumber(normalized.humidity),
        growth_stage: normalized.growth_stage || null,
        pest_notes: normalized.pest_notes || null,
        disease_incidence: toNullableNumber(normalized.disease_incidence),
        disease_name_observed: normalized.disease_name_observed || null,
        scout_severity: normalized.scout_severity || null,
        kg_harvested: toNullableNumber(normalized.kg_harvested),
        quality_grade: normalized.quality_grade || null,
        price_per_kg: toNullableNumber(normalized.price_per_kg),
        buyer_name: normalized.buyer_name || null,
        expense_amount: toNullableNumber(normalized.expense_amount),
        expense_category: normalized.expense_category || null,
        pruned_count: toNullableNumber(normalized.pruned_count),
        pruning_type: normalized.pruning_type || null,
        inspection_type: normalized.inspection_type || null,
        inspection_status: normalized.inspection_status || null,
        photo_url: normalized.photo_url || null,
        photo_path: normalized.photo_path || null,
        created_at: normalized.created_at || new Date().toISOString(),
    };
};

const hydrateDailyNoteRow = async (row = {}) => ({
    ...row,
    photo_url: await resolvePrivateImageUrl(row.photo_path, row.photo_url),
});

export const toPlotRow = (plot = {}, userId) => {
    const normalized = normalizeStoredPlot(plot);
    return {
        id: String(normalized.id),
        user_id: userId,
        name: normalized.name || '',
        crop_type: normalized.crop_type || normalized.cropType || '',
        area: toNullableNumber(normalized.area) ?? 0,
        unit: normalized.unit || 'acres',
        soil_ph: toNullableNumber(normalized.soil_ph),
        npk_n: toNullableNumber(normalized.npk_n),
        npk_p: toNullableNumber(normalized.npk_p),
        npk_k: toNullableNumber(normalized.npk_k),
        created_at: normalized.created_at || new Date().toISOString(),
    };
};

export const normalizeProfileInfo = (profile = {}) => ({
    name: profile.name ?? '',
    contact: profile.contact ?? '',
    crops: profile.crops ?? '',
    memberSince: profile.memberSince ?? profile.member_since ?? new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' }),
});

export const getProfileInfo = async (userId = null) => {
    const localKey = `profile_info_${userId}`;
    const fallback = normalizeProfileInfo(safeRead(localKey, {}));

    if (isCloudUser(userId)) {
        try {
            const [data] = await fetchNeonRows('profiles', { limit: 1 });
            return data ? normalizeProfileInfo(data) : fallback;
        } catch (error) {
            console.error('getProfileInfo error:', error);
            return fallback;
        }
    }

    return fallback;
};

// myGAP farm profile: farm details, certificate and workers (myGAP 4-9).
// Stored on the profile row but saved separately, so editing it never
// overwrites the name and contact edited on the dashboard.
const FARM_PROFILE_KEY = 'sea_plant_farm_profile';

export const normalizeWorker = (worker = {}) => ({
    id: String(worker.id || crypto.randomUUID()),
    name: optionalText(worker.name, 120) || '',
    idNumber: optionalText(worker.idNumber, 40) || '',
    nationality: optionalText(worker.nationality, 60) || '',
    role: optionalText(worker.role, 80) || '',
});

export const normalizeFarmProfile = (profile = {}) => {
    let workers = profile.workers ?? [];
    if (typeof workers === 'string') {
        try { workers = JSON.parse(workers); } catch { workers = []; }
    }
    return {
        farmerName: profile.farmerName ?? profile.name ?? '',
        farmName: profile.farmName ?? profile.farm_name ?? '',
        farmAddress: profile.farmAddress ?? profile.farm_address ?? '',
        landTenure: profile.landTenure ?? profile.land_tenure ?? '',
        mygapRef: profile.mygapRef ?? profile.mygap_ref ?? '',
        certExpiry: String(profile.certExpiry ?? profile.cert_expiry ?? '').slice(0, 10),
        workers: Array.isArray(workers) ? workers.filter((worker) => worker && worker.name).map(normalizeWorker) : [],
    };
};

export const getFarmProfile = async (userId = null) => {
    if (isCloudUser(userId)) {
        const [row] = await fetchNeonRows('profiles', { limit: 1 });
        return normalizeFarmProfile(row || {});
    }
    return normalizeFarmProfile(safeRead(FARM_PROFILE_KEY, {}));
};

export const saveFarmProfile = async (profile = {}, userId = null) => {
    const normalized = normalizeFarmProfile(profile);
    if (isCloudUser(userId)) {
        await neonDataRequest('profiles', {
            operation: 'upsert',
            payload: {
                user_id: userId,
                farm_name: normalized.farmName || null,
                farm_address: normalized.farmAddress || null,
                land_tenure: normalized.landTenure || null,
                mygap_ref: normalized.mygapRef || null,
                cert_expiry: normalized.certExpiry || null,
                // Sent as JSON text: the database driver would turn an array into a Postgres array.
                workers: JSON.stringify(normalized.workers),
                updated_at: new Date().toISOString(),
            },
        });
        return normalized;
    }
    if (!safeWrite(FARM_PROFILE_KEY, normalized).ok) throw new Error('Could not save the farm profile on this device.');
    return normalized;
};

export const saveProfileInfo = async (profileInfo = {}, userId = null) => {
    const normalized = normalizeProfileInfo(profileInfo);
    const localSaved = userId ? safeWrite(`profile_info_${userId}`, normalized).ok : false;

    if (isCloudUser(userId)) {
        try {
            await neonDataRequest('profiles', {
                operation: 'upsert',
                payload: {
                user_id: userId,
                name: normalized.name,
                contact: normalized.contact,
                crops: normalized.crops,
                member_since: normalized.memberSince,
                updated_at: new Date().toISOString(),
                },
            });
        } catch (error) {
            console.error('saveProfileInfo error:', error);
            return false;
        }
    }

    return isCloudUser(userId) || localSaved;
};

export const migrateLocalSchema = (key, version, migrateFn) => {
    const flagKey = `${key}_schema_v${version}`;
    if (localStorage.getItem(flagKey)) return;

    const data = safeRead(key, null);
    if (!Array.isArray(data)) {
        localStorage.setItem(namespacedKey(flagKey), '1');
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
        if (!safeWrite(key, migrated).ok) return;
        localStorage.setItem(namespacedKey(flagKey), '1');
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
    const path = `${userId}/${scanId}_${suffix}.jpg`;
    return uploadPrivateImage({ base64, userId, path });
};

export const saveScan = async (scanData, userId = null) => {
    if (isCloudUser(userId)) {
        try {
            const id = scanData.id || crypto.randomUUID();
            const [mainUpload, leafUpload] = await Promise.all([
                uploadImageToStorage(scanData.image, userId, id, 'main'),
                scanData.leafImage ? uploadImageToStorage(scanData.leafImage, userId, id, 'leaf') : null,
            ]);
            if ((scanData.image && !mainUpload?.path) || (scanData.leafImage && !leafUpload?.path)) {
                throw new Error('Photo upload failed. Your scan has not been saved; please retry.');
            }
            const imageUrl = mainUpload?.signedUrl || null;
            const leafImageUrl = leafUpload?.signedUrl || null;
            const imagePath = mainUpload?.path || null;
            const leafImagePath = leafUpload?.path || null;
            const row = toScanHistoryRow(scanData, userId, id, imageUrl, leafImageUrl, imagePath, leafImagePath);
            try {
                await neonDataRequest('scan_history', { operation: 'insert', payload: row });
            } catch (error) {
                const paths = [imagePath, leafImagePath].filter(Boolean);
                if (paths.length && supabase?.storage?.from) await supabase.storage.from('scan-images').remove(paths);
                throw error;
            }
            return {
                ...scanData,
                id,
                timestamp: row.created_at,
                image_url: imageUrl,
                leaf_image_url: leafImageUrl,
                image_path: imagePath,
                leaf_image_path: leafImagePath,
            };
        } catch (error) {
            console.error('Neon saveScan error:', error);
            throw error;
        }
    }

    const history = getScanHistory();
    const newScan = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...scanData };
    if (!await persistIndexedGuestRecord('scans', newScan, Number(newScan.revision || 0))) {
        const error = new Error('Device storage is full or unavailable. Export or delete old records, then retry saving.');
        error.code = 'STORAGE_SAVE_FAILED';
        throw error;
    }
    history.unshift(newScan);
    const writeResult = safeWrite(STORAGE_KEY, history);
    if (!writeResult.ok) {
        const error = new Error('Device storage is full or unavailable. Export or delete old records, then retry saving.');
        error.code = 'STORAGE_SAVE_FAILED';
        throw error;
    }
    return newScan;
};

export const fetchAllUserRows = async (table, userId, { limit = null } = {}) => {
    const rows = [];
    const pageSize = 500;
    const maxRows = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : null;
    for (let offset = 0; ;) {
        const batchSize = maxRows ? Math.min(pageSize, maxRows - offset) : pageSize;
        if (batchSize <= 0) return rows.slice(0, maxRows);
        const data = await fetchNeonRows(table, { limit: batchSize, offset });
        rows.push(...(data || []));
        offset += data?.length || 0;
        if (maxRows && rows.length >= maxRows) return rows.slice(0, maxRows);
        if (!data?.length || data.length < batchSize) return rows;
    }
};

export const fetchScanHistoryPage = async (userId, { cursor = null, limit = 20 } = {}) => {
    if (!isCloudUser(userId)) {
        const rows = getScanHistory().slice(0, Math.min(Number(limit) || 20, 100));
        return { rows, nextCursor: null };
    }
    const tokenResult = await supabase.auth.getSession();
    const token = tokenResult.data?.session?.access_token;
    if (!token) throw new Error('History needs an authenticated account.');
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', btoa(JSON.stringify(cursor)).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
    try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/history?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.message || payload.error || 'Could not load history.'), { status: response.status });
    if (isIndexedDbAvailable()) {
        const key = `cloud-cache:${cloudOwner(userId)}:scans`;
        const previous = cursor ? await getMetadata(key) || [] : [];
        await setMetadata(key, [...new Map([...previous, ...(payload.rows || [])].map(row => [String(row.id), row])).values()]);
    }
    const rows = await Promise.all((payload.rows || []).map(hydrateScanHistoryRow));
    return { ...payload, rows: await mergePending(userId, 'scans', rows) };
    } catch (error) {
        if (!isConnectivityError(error)) throw error;
        const cached = await getMetadata(`cloud-cache:${cloudOwner(userId)}:scans`);
        if (!Array.isArray(cached)) throw error;
        return { rows: await mergePending(userId, 'scans', await Promise.all(cached.map(hydrateScanHistoryRow))), nextCursor: null, offline: true };
    }
};

export const getScanHistory = (userId = null, options = {}) => {
    if (isCloudUser(userId)) {
        return readCloudCollection(userId, 'scans', () => fetchAllUserRows('scan_history', userId, options), rows => Promise.all(rows.map(hydrateScanHistoryRow)));
    }
    const history = safeRead(STORAGE_KEY, []);
    return Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
        ? history.slice(0, Number(options.limit))
        : history;
};

export const getScanById = (id, userId = null) => {
    const getLocalScan = () => {
        const history = getScanHistory();
        return history.find((scan) => scan.id === id) || null;
    };

    if (isCloudUser(userId)) {
        return neonDataRowRequest('scan_history', id, { operation: 'get' })
            .then(({ row }) => {
                // A cloud account must never fall back to the shared guest
                // namespace. A failed lookup can otherwise reveal another
                // user's local record on a shared device.
                if (!row) return null;
                return hydrateScanHistoryRow(row);
            })
            .catch(() => null);
    }
    return getLocalScan();
};

export const deleteScan = async (id, userId = null) => {
    if (isCloudUser(userId)) {
        let row;
        try {
            row = (await neonDataRowRequest('scan_history', id, { operation: 'get' })).row;
            if (!row) return false;
            await neonDataRowRequest('scan_history', id, { operation: 'delete' });
        } catch (error) {
            console.error('deleteScan error:', error);
            if (isConnectivityError(error)) {
                try { await queueCloudMutation(userId, 'scans', id, 'delete', {}, null, row); return true; } catch { return false; }
            }
            return false;
        }
        const paths = [row?.image_path, row?.leaf_image_path].filter(Boolean);
        if (paths.length && supabase?.storage?.from) await supabase.storage.from('scan-images').remove(paths);
        return true;
    }
    if (isIndexedDbAvailable() && storageNamespace !== 'demo') {
        const owner = `guest:${getGuestId()}`;
        try {
            await deleteRecord(owner, id);
            await enqueueOperation({ owner, collection: 'scans', recordId: id, type: 'delete', payload: null });
        } catch (error) {
            console.error('IndexedDB scan delete queue failed:', error);
            return false;
        }
    }
    const filtered = getScanHistory().filter((scan) => scan.id !== id);
    return safeWrite(STORAGE_KEY, filtered).ok;
};

export const clearAllScans = async (userId = null) => {
    if (isCloudUser(userId)) {
        try {
            const rows = await fetchAllUserRows('scan_history', userId);
            for (let index = 0; index < rows.length; index += 20) {
                await Promise.all(rows.slice(index, index + 20).map((row) => neonDataRowRequest('scan_history', row.id, { operation: 'delete' })));
            }
            const paths = rows.flatMap((row) => [row.image_path, row.leaf_image_path]).filter(Boolean);
            for (let index = 0; index < paths.length; index += 100) {
                if (supabase?.storage?.from) await supabase.storage.from('scan-images').remove(paths.slice(index, index + 100));
            }
            return true;
        } catch (error) {
            console.error('clearAllScans error:', error);
            if (isConnectivityError(error)) {
                try {
                    const cached = await getMetadata(`cloud-cache:${cloudOwner(userId)}:scans`);
                    if (!Array.isArray(cached)) return false;
                    for (const row of cached) await queueCloudMutation(userId, 'scans', row.id, 'delete', {}, null, row);
                    return true;
                } catch { return false; }
            }
            return false;
        }
    }
    try {
        localStorage.removeItem(namespacedKey(STORAGE_KEY));
        return true;
    } catch {
        return false;
    }
};

export const groupScansByDate = (history = []) => {
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

export const getGroupedScans = async (userId = null) => {
    const history = await Promise.resolve(getScanHistory(userId));
    return groupScansByDate(history);
};

export const saveLogEntry = async (logEntry, userId = null) => {
    if (isCloudUser(userId)) {
        const newLog = toLogbookRow(logEntry, userId);
        try {
            return await writeCloudRecord(userId, 'logbook', newLog, fromLogbookRow(newLog));
        } catch (error) {
            console.error('saveLogEntry error:', error);
            return null;
        }
    }

    const logs = getLogbook();
    const newLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...logEntry };
    if (!await persistIndexedGuestRecord('logbook', newLog)) return null;
    logs.unshift(newLog);
    return safeWrite(LOGBOOK_KEY, logs).ok ? newLog : null;
};

// Corrections keep the earlier values and the farmer's reason. Signed-in
// records are corrected on the server (which logs each revision); guest
// records keep their correction history on the entry itself.
const LOGBOOK_CORRECTABLE_FIELDS = ['type', 'notes', ...LOGBOOK_DETAIL_FIELDS.filter((field) => field !== 'updated_at')];

const pickCorrectableChanges = (changes = {}) => Object.fromEntries(
    LOGBOOK_CORRECTABLE_FIELDS.filter((field) => changes[field] !== undefined).map((field) => [field, changes[field]]),
);

export const updateLogEntry = async (id, changes, reason, userId = null) => {
    const picked = pickCorrectableChanges(changes);
    if (isCloudUser(userId)) {
        try {
        const result = await neonApiRequest(`/api/mygap/logs/${encodeURIComponent(id)}/correct`, {
            method: 'POST',
            body: JSON.stringify({ changes: picked, reason }),
        });
        return fromLogbookRow(result.row || result.data || {});
        } catch (error) {
            if (!isConnectivityError(error)) throw error;
            return queueCloudMutation(userId, 'logbook', id, 'update', picked, reason);
        }
    }
    const logs = safeRead(LOGBOOK_KEY, []);
    const index = logs.findIndex((log) => String(log.id) === String(id));
    if (index < 0) throw new Error('Record not found.');
    const current = logs[index];
    const previous = Object.fromEntries(Object.keys(picked).filter((field) => (current[field] ?? null) !== (picked[field] ?? null)).map((field) => [field, current[field] ?? null]));
    if (!Object.keys(previous).length) return current;
    const updatedAt = new Date().toISOString();
    const updated = {
        ...current,
        ...picked,
        updated_at: updatedAt,
        corrections: [...(current.corrections || []), { at: updatedAt, reason, previous }],
    };
    logs[index] = updated;
    if (!safeWrite(LOGBOOK_KEY, logs).ok) throw new Error('Could not save the correction on this device.');
    return updated;
};

export const deleteLogEntry = async (id, reason, userId = null) => {
    if (isCloudUser(userId)) {
        try {
        await neonApiRequest(`/api/mygap/logs/${encodeURIComponent(id)}/delete`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
        } catch (error) {
            if (!isConnectivityError(error)) throw error;
            await queueCloudMutation(userId, 'logbook', id, 'delete', {}, reason);
        }
        return true;
    }
    const logs = safeRead(LOGBOOK_KEY, []);
    const remaining = logs.filter((log) => String(log.id) !== String(id));
    if (remaining.length === logs.length) throw new Error('Record not found.');
    if (!safeWrite(LOGBOOK_KEY, remaining).ok) throw new Error('Could not delete the record on this device.');
    return true;
};

export const getLogbook = (userId = null, options = {}) => {
    if (isCloudUser(userId)) {
        return readCloudCollection(userId, 'logbook', () => fetchAllUserRows('mygap_logs', userId, options), (rows) => rows.map(fromLogbookRow));
    }
    const logs = safeRead(LOGBOOK_KEY, []);
    return Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
        ? logs.slice(0, Number(options.limit))
        : logs;
};

export const saveChecklistState = async (state, userId = null) => {
    if (isCloudUser(userId)) {
        const updatedAt = new Date().toISOString();
        try {
            await neonDataRequest('mygap_checklist', {
                operation: 'upsert',
                payload: { user_id: userId, state, updated_at: updatedAt },
            });
        } catch (error) {
            if (!isConnectivityError(error) || !isIndexedDbAvailable()) {
                console.error('saveChecklistState error:', error);
                return false;
            }
            try {
                const owner = cloudOwner(userId);
                await putRecord({ owner, collection: 'checklist', id: 'checklist:current', value: { state, updated_at: updatedAt } });
                await queueSyncOperation({ owner, collection: 'checklist', recordId: 'current', type: 'update', payload: { state, updated_at: updatedAt } });
            } catch (queueError) {
                console.error('saveChecklistState offline queue error:', queueError);
                return false;
            }
        }
        return true;
    }

    try {
        if (isIndexedDbAvailable() && storageNamespace !== 'demo') {
            const owner = `guest:${getGuestId()}`;
            await putRecord({ owner, collection: 'checklist', id: 'current', value: state });
            await enqueueOperation({ owner, collection: 'checklist', recordId: 'current', type: 'update', payload: state });
        }
        localStorage.setItem(namespacedKey(CHECKLIST_KEY), encryptData(JSON.stringify(state)));
        return true;
    } catch {
        return false;
    }
};

export const getChecklistState = (userId = null) => {
    if (isCloudUser(userId)) {
        const pendingChecklist = () => (isIndexedDbAvailable()
            ? getRecord(cloudOwner(userId), 'checklist:current').catch(() => null)
            : Promise.resolve(null));
        return pendingChecklist().then((pending) => {
            // A change saved offline is newer than anything on the server.
            if (pending?.state) return pending.state;
            return fetchNeonRows('mygap_checklist', { limit: 1 })
                .then(([row]) => row?.state ?? {})
                .catch((error) => {
                    console.error('getChecklistState error:', error);
                    return {};
                });
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
        photo_path: entry.photo_path || null,
        created_at: new Date().toISOString(),
    });

    if (isCloudUser(userId)) {
        try {
            return await writeCloudRecord(userId, 'notes', toDailyNoteRow(newNote, userId), newNote);
        } catch (error) {
            console.error('saveDailyNote error:', error);
            return null;
        }
    }

    const existing = safeRead(NOTES_KEY, []);
    if (!await persistIndexedGuestRecord('notes', newNote)) return null;
    existing.unshift(newNote);
    const writeResult = safeWrite(NOTES_KEY, existing);
    return writeResult.ok ? newNote : null;
};

export const getDailyNotes = (userId = null, options = {}) => {
    if (isCloudUser(userId)) {
        return readCloudCollection(userId, 'notes', () => fetchAllUserRows('daily_notes', userId, options), (rows) => Promise.all(rows.map(hydrateDailyNoteRow)));
    }
    const notes = safeRead(NOTES_KEY, []).map(normalizeLegacyDailyNote);
    return Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
        ? notes.slice(0, Number(options.limit))
        : notes;
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

    if (isCloudUser(userId)) {
        try {
            return await writeCloudRecord(userId, 'plots', toPlotRow(newPlot, userId), newPlot);
        } catch (error) {
            console.error('savePlot error:', error);
            return null;
        }
    }

    const existing = safeRead(PLOTS_KEY, []).map(normalizeStoredPlot);
    if (!await persistIndexedGuestRecord('plots', newPlot)) return null;
    existing.unshift(newPlot);
    const writeResult = safeWrite(PLOTS_KEY, existing);
    return writeResult.ok ? newPlot : null;
};

export const getPlots = (userId = null, options = {}) => {
    if (isCloudUser(userId)) {
        return readCloudCollection(userId, 'plots', () => fetchAllUserRows('plots', userId, options), (rows) => rows.map(normalizeStoredPlot));
    }
    const plots = safeRead(PLOTS_KEY, []).map(normalizeStoredPlot);
    return Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
        ? plots.slice(0, Number(options.limit))
        : plots;
};

// ─── Guest Identity & Orders ──────────────────────────────────────────────────

/**
 * Get or create a persistent Guest ID for this browser session
 */
export const getGuestId = () => {
    let guestId = localStorage.getItem(namespacedKey(GUEST_ID_KEY));
    if (!guestId) {
        guestId = `guest_${crypto.randomUUID()}`;
        localStorage.setItem(namespacedKey(GUEST_ID_KEY), guestId);
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
    if (isCloudUser(userId)) {
        try {
            await neonDataRowRequest('plots', id, { operation: 'delete' });
        } catch (error) {
            console.error('deletePlot error:', error);
            if (isConnectivityError(error)) {
                try { await queueCloudMutation(userId, 'plots', id, 'delete'); return true; } catch { return false; }
            }
            return false;
        }
        return true;
    }
    if (isIndexedDbAvailable() && storageNamespace !== 'demo') {
        const owner = `guest:${getGuestId()}`;
        try {
            await deleteRecord(owner, id);
            await enqueueOperation({ owner, collection: 'plots', recordId: id, type: 'delete', payload: null });
        }
        catch (error) { console.error('IndexedDB plot delete queue failed:', error); return false; }
    }
    const filtered = safeRead(PLOTS_KEY, []).filter((plot) => plot.id !== id);
    return safeWrite(PLOTS_KEY, filtered).ok;
};

export const seedDemoData = (userId, data) => {
    if (userId !== 'demo-user-123') return;
    const { scans, notes, plots, logbook } = data;

    const seedKey = (key, items, normalizeFn = null) => {
        if (!items?.length) return;
        const existing = safeRead(key, []);
        if (existing.length === 0) {
            const normalized = normalizeFn ? items.map(normalizeFn) : items;
            safeWrite(key, normalized);
            return;
        }

        // Demo records are intentionally illustrative. Keep any locally added
        // records, but make sure the prepared scenarios remain available and do
        // not carry stale, fabricated confidence values from an older seed.
        if (userId === 'demo-user-123' && key === STORAGE_KEY) {
            const preparedById = new Map(items.map(item => [item.id, item]));
            const merged = [...existing];
            preparedById.forEach((prepared, id) => {
                const index = merged.findIndex(item => item.id === id);
                if (index === -1) {
                    merged.push(prepared);
                    return;
                }
                merged[index] = {
                    ...merged[index],
                    isDemo: true,
                    confidence: prepared.confidence ?? null,
                };
            });
            if (JSON.stringify(merged) !== JSON.stringify(existing)) safeWrite(key, merged);
        }
    };

    seedKey(STORAGE_KEY, scans);
    seedKey(NOTES_KEY, notes, normalizeLegacyDailyNote);
    seedKey(PLOTS_KEY, plots, normalizeStoredPlot);
    seedKey(LOGBOOK_KEY, logbook);
};
