import CryptoJS from 'crypto-js';

const DB_NAME = 'plant-field-storage-v1';
const DB_VERSION = 1;
const STORES = {
    records: 'records',
    photos: 'photos',
    pendingOps: 'pendingOps',
    metadata: 'metadata',
};

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

const openDatabase = () => new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
        reject(new Error('IndexedDB is unavailable in this browser.'));
        return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.records)) {
            const store = db.createObjectStore(STORES.records, { keyPath: 'key' });
            store.createIndex('owner', 'owner', { unique: false });
            store.createIndex('collection', 'collection', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.photos)) {
            const store = db.createObjectStore(STORES.photos, { keyPath: 'key' });
            store.createIndex('owner', 'owner', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.pendingOps)) {
            const store = db.createObjectStore(STORES.pendingOps, { keyPath: 'id' });
            store.createIndex('owner', 'owner', { unique: false });
            store.createIndex('state', 'state', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.metadata)) db.createObjectStore(STORES.metadata, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open IndexedDB.'));
});

const transaction = async (storeName, mode, action) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let result;
        try { result = action(store); } catch (error) { reject(error); return; }
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error('IndexedDB transaction failed.')); };
        tx.onabort = () => { db.close(); reject(tx.error || new Error('IndexedDB transaction aborted.')); };
    });
};

const requestResult = (request) => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

export const ownerKey = (owner, id) => `${owner}:${id}`;
export const isIndexedDbAvailable = hasIndexedDb;

export const putRecord = async ({ owner, collection, id, value, revision = 0 }) => {
    if (!owner || !collection || !id) throw new Error('owner, collection, and id are required');
    const record = { key: ownerKey(owner, id), owner, collection, id, value, revision, updatedAt: new Date().toISOString() };
    await transaction(STORES.records, 'readwrite', (store) => store.put(record));
    return record;
};

export const getRecord = async (owner, id) => {
    const result = await transaction(STORES.records, 'readonly', (store) => requestResult(store.get(ownerKey(owner, id))));
    return result?.value ?? null;
};

export const listRecords = async (owner, collection = null) => {
    const rows = await transaction(STORES.records, 'readonly', (store) => requestResult(store.index('owner').getAll(owner)));
    return (rows || []).filter((row) => !collection || row.collection === collection).map((row) => row.value);
};

export const deleteRecord = async (owner, id) => transaction(STORES.records, 'readwrite', (store) => store.delete(ownerKey(owner, id)));

export const putPhoto = async (owner, id, blob) => {
    if (!(blob instanceof Blob)) throw new Error('Photo must be a Blob.');
    const row = { key: ownerKey(owner, id), owner, id, blob, updatedAt: new Date().toISOString() };
    await transaction(STORES.photos, 'readwrite', (store) => store.put(row));
    return row;
};

export const getPhoto = async (owner, id) => {
    const result = await transaction(STORES.photos, 'readonly', (store) => requestResult(store.get(ownerKey(owner, id))));
    return result?.blob ?? null;
};

export const enqueueOperation = async ({ owner, recordId, collection, type, expectedRevision = 0, payload = null }) => {
    if (!owner || !recordId || !['create', 'update', 'delete'].includes(type)) throw new Error('Invalid sync operation');
    const operation = { id: crypto.randomUUID(), owner, recordId, collection, type, expectedRevision, payload, state: 'pending', attempts: 0, createdAt: new Date().toISOString() };
    await transaction(STORES.pendingOps, 'readwrite', (store) => store.put(operation));
    return operation;
};

export const listPendingOperations = async (owner) => {
    const rows = await transaction(STORES.pendingOps, 'readonly', (store) => requestResult(store.index('owner').getAll(owner)));
    return (rows || []).filter((row) => row.state === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const updateOperation = async (operation) => transaction(STORES.pendingOps, 'readwrite', (store) => store.put(operation));
export const removeOperation = async (id) => transaction(STORES.pendingOps, 'readwrite', (store) => store.delete(id));

export const getMetadata = async (key) => {
    const result = await transaction(STORES.metadata, 'readonly', (store) => requestResult(store.get(key)));
    return result?.value ?? null;
};

export const setMetadata = async (key, value) => transaction(STORES.metadata, 'readwrite', (store) => store.put({ key, value, updatedAt: new Date().toISOString() }));

const decodeLegacy = (raw, secret) => {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed) return parsed;
    } catch { /* encrypted legacy value */ }
    if (!secret) return null;
    try {
        const decrypted = CryptoJS.AES.decrypt(raw, secret).toString(CryptoJS.enc.Utf8);
        return JSON.parse(decrypted);
    } catch { return null; }
};

export const migrateLegacyCollection = async ({ owner, collection, legacyKey, storage = globalThis.localStorage, secret = '' }) => {
    const marker = `indexeddb:migrated:${owner}:${legacyKey}`;
    if (await getMetadata(marker)) return { migrated: false, count: 0 };
    const raw = storage?.getItem(legacyKey);
    const records = decodeLegacy(raw, secret);
    if (!Array.isArray(records)) {
        await setMetadata(marker, { count: 0, verifiedAt: new Date().toISOString() });
        return { migrated: false, count: 0 };
    }
    for (const value of records) {
        const id = value?.id || crypto.randomUUID();
        await putRecord({ owner, collection, id, value, revision: Number(value?.revision || 0) });
    }
    const verified = await listRecords(owner, collection);
    if (verified.length !== records.length) throw new Error(`IndexedDB migration verification failed for ${legacyKey}`);
    await setMetadata(marker, { count: verified.length, verifiedAt: new Date().toISOString() });
    // Keep legacy records until the caller explicitly confirms the migration.
    return { migrated: true, count: verified.length };
};

export const confirmLegacyCollectionRemoval = async ({ owner, legacyKey, storage = globalThis.localStorage }) => {
    const marker = await getMetadata(`indexeddb:migrated:${owner}:${legacyKey}`);
    if (!marker) throw new Error('IndexedDB migration has not been verified.');
    storage?.removeItem(legacyKey);
    return true;
};
