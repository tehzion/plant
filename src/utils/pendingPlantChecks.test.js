import { beforeEach, describe, expect, it, vi } from 'vitest';
const records = vi.hoisted(() => new Map());
vi.mock('./indexedDbStorage.js', () => ({
    putRecord: vi.fn(async ({ owner, id, value }) => records.set(`${owner}:${id}`, value)),
    listRecords: vi.fn(async owner => [...records].filter(([key]) => key.startsWith(`${owner}:`)).map(([, value]) => value)),
    deleteRecord: vi.fn(async (owner, id) => records.delete(`${owner}:${id}`)),
}));
import { putRecord } from './indexedDbStorage.js';
import { NetworkRequestError } from './networkRequest.js';
import { queuePlantCheck, listPendingPlantChecks, removePendingPlantCheck, updatePendingPlantCheck, isWaitingError, MAX_PENDING_CHECKS, PENDING_CHECKS_EVENT } from './pendingPlantChecks.js';

const photo = (name = 'tree.jpg') => new File(['photo'], name, { type: 'image/jpeg', lastModified: 7 });
beforeEach(() => { records.clear(); vi.clearAllMocks(); });

describe('plant checks saved without signal', () => {
    it('keeps both photos and the capture details for the same owner only', async () => {
        const announced = vi.fn();
        window.addEventListener(PENDING_CHECKS_EVENT, announced);
        await queuePlantCheck('user:a', { selectedImage: photo(), selectedLeafImage: photo('leaf.jpg'), selectedCategory: 'Rice', selectedCrop: 'Padi', selectedScale: 'acre', scaleQuantity: 2, captureContext: { plantPart: 'leaf' } }, { location: { lat: 3.1, lng: 101.6, accuracy: 20 }, locationName: 'Kedah' });
        window.removeEventListener(PENDING_CHECKS_EVENT, announced);
        const [check] = await listPendingPlantChecks('user:a');
        expect(check.selectedImage).toBeInstanceOf(File);
        expect(check.selectedLeafImage.name).toBe('leaf.jpg');
        expect(check).toMatchObject({ state: 'waiting', attempts: 0, selectedCategory: 'Rice', selectedCrop: 'Padi', scaleQuantity: 2, captureContext: { plantPart: 'leaf' }, location: { lat: 3.1, lng: 101.6 }, locationName: 'Kedah' });
        expect(announced).toHaveBeenCalledTimes(1);
        expect(await listPendingPlantChecks('user:b')).toEqual([]);
    });
    it('refuses a check without a photo and stops at the device limit', async () => {
        await expect(queuePlantCheck('user:a', { selectedImage: null })).rejects.toThrow('No photo');
        for (let i = 0; i < MAX_PENDING_CHECKS; i += 1) await queuePlantCheck('user:a', { selectedImage: photo() });
        await expect(queuePlantCheck('user:a', { selectedImage: photo() })).rejects.toMatchObject({ code: 'PENDING_CHECKS_FULL' });
    });
    it('updates and removes a check without storing the File copies twice', async () => {
        const saved = await queuePlantCheck('user:a', { selectedImage: photo() });
        const [check] = await listPendingPlantChecks('user:a');
        await updatePendingPlantCheck('user:a', check, { state: 'needs-attention', lastError: 'Too dark' });
        const written = putRecord.mock.calls.at(-1)[0].value;
        expect(written).not.toHaveProperty('selectedImage');
        expect(written).toMatchObject({ id: saved.id, state: 'needs-attention', lastError: 'Too dark' });
        await removePendingPlantCheck('user:a', saved.id);
        expect(await listPendingPlantChecks('user:a')).toEqual([]);
    });
    it('keeps waiting on connection or service trouble, and holds photo problems for the farmer', () => {
        expect(isWaitingError(new NetworkRequestError('down', { code: 'NETWORK_UNAVAILABLE' }))).toBe(true);
        expect(isWaitingError({ status: 503 })).toBe(true);
        expect(isWaitingError({ status: 402 })).toBe(true);
        expect(isWaitingError({ userCode: 'ANALYSIS_TIMEOUT' })).toBe(true);
        expect(isWaitingError({ userCode: 'IMAGE_TOO_DARK' })).toBe(false);
        expect(isWaitingError({ status: 400, message: 'NOT_A_PLANT' })).toBe(false);
    });
});
