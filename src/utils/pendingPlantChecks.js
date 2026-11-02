import { putRecord, listRecords, deleteRecord } from './indexedDbStorage.js';
import { isNetworkUnavailableError, isTimeoutError } from './networkRequest.js';

// Plant checks a farmer took without signal. The photos stay on this device
// and the check runs by itself once the analysis service can be reached.
const COLLECTION = 'pending-checks';
const scope = owner => `pending-check:${owner}`;
export const PENDING_CHECKS_EVENT = 'plant-pending-checks';
export const MAX_PENDING_CHECKS = 10;

const announce = owner => {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    try { window.dispatchEvent(new CustomEvent(PENDING_CHECKS_EVENT, { detail: { owner } })); } catch { /* non-browser runtime */ }
};
const isPhoto = file => file instanceof Blob && file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024;
const pack = file => isPhoto(file) ? { blob: file, name: file.name || 'plant-photo.jpg', modified: file.lastModified ?? Date.now() } : null;
const unpack = value => value?.blob instanceof Blob ? new File([value.blob], value.name, { type: value.blob.type, lastModified: value.modified }) : null;
const newId = () => globalThis.crypto?.randomUUID?.() || `check-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const point = value => Number.isFinite(value?.lat) && Number.isFinite(value?.lng) ? { lat: value.lat, lng: value.lng } : null;
const stored = ({ selectedImage: _image, selectedLeafImage: _leaf, ...value }) => value;

export const queuePlantCheck = async (owner, state, { location = null, locationName = '' } = {}) => {
    if (!owner || !isPhoto(state?.selectedImage)) throw new Error('No photo to save');
    if ((await listRecords(scope(owner), COLLECTION)).length >= MAX_PENDING_CHECKS) {
        const error = new Error('PENDING_CHECKS_FULL'); error.code = 'PENDING_CHECKS_FULL'; throw error;
    }
    const value = { version: 1, id: newId(), savedAt: new Date().toISOString(), state: 'waiting', attempts: 0, lastError: '',
        image: pack(state.selectedImage), leaf: pack(state.selectedLeafImage),
        selectedCategory: String(state.selectedCategory || ''), selectedCrop: String(state.selectedCrop || ''),
        selectedScale: ['acre', 'tree', 'personal'].includes(state.selectedScale) ? state.selectedScale : 'acre',
        scaleQuantity: Number(state.scaleQuantity) > 0 ? Number(state.scaleQuantity) : 1,
        captureContext: state.captureContext || { plantPart: 'whole' },
        location: point(location), locationName: String(locationName || '') };
    await putRecord({ owner: scope(owner), collection: COLLECTION, id: value.id, value });
    announce(owner);
    return value;
};

/** Saved checks, oldest first, with their photos as Files ready for analysis. */
export const listPendingPlantChecks = async owner => {
    if (!owner) return [];
    return (await listRecords(scope(owner), COLLECTION))
        .filter(value => value?.version === 1 && value.image)
        .sort((a, b) => String(a.savedAt).localeCompare(String(b.savedAt)))
        .map(value => ({ ...value, selectedImage: unpack(value.image), selectedLeafImage: unpack(value.leaf) }));
};

export const removePendingPlantCheck = async (owner, id) => {
    await deleteRecord(scope(owner), id);
    announce(owner);
};

export const updatePendingPlantCheck = async (owner, check, patch) => {
    const value = { ...stored(check), ...patch };
    await putRecord({ owner: scope(owner), collection: COLLECTION, id: value.id, value });
    announce(owner);
    return value;
};

// Connection trouble, a busy service or no AI credit leave the check waiting
// for the next try. Anything else (a dark or blurry photo, not a plant) needs
// the farmer, so the check is held for them instead of retried forever.
export const isWaitingError = error => (typeof navigator !== 'undefined' && navigator.onLine === false)
    || ['ANALYSIS_OFFLINE', 'ANALYSIS_NETWORK', 'ANALYSIS_TIMEOUT', 'ANALYSIS_UNAVAILABLE'].includes(error?.userCode)
    || isTimeoutError(error) || isNetworkUnavailableError(error)
    || error?.status === 402 || error?.status === 408 || error?.status === 429 || error?.status >= 500;
