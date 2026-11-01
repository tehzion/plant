import { getRecord, putRecord, deleteRecord } from './indexedDbStorage.js';
const ID = 'active-capture-draft';
const scope = owner => `capture:${owner}`;
const image = file => file instanceof Blob && file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024;
const pack = file => image(file) ? { blob: file, name: file.name || 'plant-photo.jpg', modified: file.lastModified || Date.now() } : null;
const unpack = value => value?.blob instanceof Blob ? new File([value.blob], value.name, { type: value.blob.type, lastModified: value.modified }) : null;
export const captureDraftSignature = value => JSON.stringify([
    ...['selectedImage', 'selectedLeafImage'].map(key => value?.[key] ? [value[key].name, value[key].size, value[key].lastModified] : null),
    value?.selectedCategory, value?.selectedCrop, value?.selectedScale, String(value?.scaleQuantity || 1),
    Math.min(value?.currentStep || 1, 2), value?.captureContext, value?.retakeReason || '',
]);
export const saveCaptureDraft = async (owner, state) => {
    if (!owner || (!image(state.selectedImage) && !image(state.selectedLeafImage))) throw new Error('No photo to save');
    const value = { version: 1, savedAt: new Date().toISOString(), image: pack(state.selectedImage), leaf: pack(state.selectedLeafImage),
        selectedCategory: String(state.selectedCategory || ''), selectedCrop: String(state.selectedCrop || ''),
        selectedScale: ['acre', 'tree', 'personal'].includes(state.selectedScale) ? state.selectedScale : 'acre',
        scaleQuantity: Number(state.scaleQuantity) > 0 ? Number(state.scaleQuantity) : 1,
        currentStep: state.selectedImage ? Math.min(state.currentStep || 1, 2) : 1,
        captureContext: state.captureContext || { plantPart: 'whole' }, retakeReason: String(state.retakeReason || '') };
    await putRecord({ owner: scope(owner), collection: 'capture-drafts', id: ID, value });
    return { ...value, selectedImage: state.selectedImage || null, selectedLeafImage: state.selectedLeafImage || null };
};
export const loadCaptureDraft = async owner => {
    if (!owner) return null;
    const value = await getRecord(scope(owner), ID);
    if (value?.version !== 1 || (!value.image && !value.leaf)) return null;
    const selectedImage = unpack(value.image), selectedLeafImage = unpack(value.leaf);
    if (!selectedImage && !selectedLeafImage) return null;
    return { ...value, selectedImage, selectedLeafImage };
};
export const discardCaptureDraft = owner => owner ? deleteRecord(scope(owner), ID) : Promise.resolve();
