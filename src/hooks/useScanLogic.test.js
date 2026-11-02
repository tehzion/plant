import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useScanLogic } from './useScanLogic.js';

const diseaseDetectionMocks = vi.hoisted(() => ({
    imageToBase64: vi.fn(),
    analyzePlantDisease: vi.fn(),
    analyzeLocalImageQuality: vi.fn(),
}));
const auth = vi.hoisted(() => ({ user: { id: 'user-1' }, guestId: null }));
const storageMocks = vi.hoisted(() => ({
    consumeStorageCleanupNotice: vi.fn(),
    saveScan: vi.fn(),
}));

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        language: 'en',
        t: (key) => key,
    }),
}));

vi.mock('../context/AuthContext', () => ({ useDataOwner: () => 'guest:local', useAuth: () => auth }));

vi.mock('../utils/diseaseDetection', () => diseaseDetectionMocks);

vi.mock('../utils/localStorage', () => storageMocks);

vi.mock('../utils/toast.js', () => ({
    showToast: vi.fn(),
}));

describe('useScanLogic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        auth.user = { id: 'user-1' }; auth.guestId = null;
        localStorage.clear();
        diseaseDetectionMocks.analyzeLocalImageQuality.mockResolvedValue({
            requiresRetake: false,
        });
        diseaseDetectionMocks.imageToBase64.mockResolvedValue('data:image/jpeg;base64,ok');
        diseaseDetectionMocks.analyzePlantDisease.mockResolvedValue({
            disease: 'Leaf spot',
            plantType: 'Durian',
        });
        storageMocks.saveScan.mockResolvedValue({ id: 'scan-1' });
        storageMocks.consumeStorageCleanupNotice.mockReturnValue(null);
    });

    it('remembers crop and scale across scans and remounts', () => {
        const first = renderHook(() => useScanLogic());
        expect(first.result.current.state.selectedScale).toBe('acre');
        act(() => { first.result.current.actions.setCategory('Vegetables'); first.result.current.actions.setCrop('Chilli'); first.result.current.actions.setScale('tree'); });
        act(() => first.result.current.actions.resetScan());
        expect(first.result.current.state.selectedCrop).toBe('Chilli');
        first.unmount();
        const second = renderHook(() => useScanLogic());
        expect(second.result.current.state).toMatchObject({ selectedCategory: 'Vegetables', selectedCrop: 'Chilli', selectedScale: 'tree' });
    });

    it('uses safe defaults when saved capture preferences are invalid', () => {
        localStorage.setItem('plant_capture_preferences', '{invalid');
        const { result } = renderHook(() => useScanLogic());
        expect(result.current.state.selectedScale).toBe('acre');
    });

    it('resumes prepared photos without resuming an old network request', () => {
        const { result } = renderHook(() => useScanLogic());
        const photo = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
        act(() => result.current.actions.restoreDraft({ selectedImage: photo, selectedLeafImage: photo, selectedCategory: 'Rice', selectedCrop: '', selectedScale: 'acre', scaleQuantity: 2, currentStep: 3, loading: true, error: 'old failure' }));
        expect(result.current.state).toMatchObject({ selectedImage: photo, selectedCategory: 'Rice', currentStep: 2, loading: false, error: '' });
        expect(diseaseDetectionMocks.analyzePlantDisease).not.toHaveBeenCalled();
    });

    it('clears in-memory photos on account switch and keeps farm defaults scoped to the owner', () => {
        const { result, rerender } = renderHook(() => useScanLogic());
        const file = new File(['photo'], 'private.jpg', { type: 'image/jpeg' });
        act(() => { result.current.actions.handleImageCapture(file); result.current.actions.setCategory('Rice'); result.current.actions.setQuantity(3); });
        auth.user = { id: 'user-2' }; rerender();
        expect(result.current.state.selectedImage).toBeNull();
        expect(result.current.state.selectedCategory).toBe('');
        act(() => result.current.actions.setCategory('Durian'));
        auth.user = { id: 'user-1' }; rerender();
        expect(result.current.state).toMatchObject({ selectedImage: null, selectedCategory: 'Rice', scaleQuantity: 3 });
    });

    it('does not save or display a previous account result when ownership changes during analysis', async () => {
        let finish; diseaseDetectionMocks.analyzePlantDisease.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
        const { result, rerender } = renderHook(() => useScanLogic());
        let pending;
        act(() => { pending = result.current.actions.performAnalyze(null, '', { selectedImage: new File(['x'], 'x.jpg', { type: 'image/jpeg' }), selectedCategory: 'Rice' }).catch(error => error); });
        await waitFor(() => expect(diseaseDetectionMocks.analyzePlantDisease).toHaveBeenCalled());
        auth.user = { id: 'user-2' }; rerender();
        let error; await act(async () => { finish({ disease: 'Leaf spot' }); error = await pending; });
        expect(error.code).toBe('ANALYSIS_CANCELLED');
        expect(storageMocks.saveScan).not.toHaveBeenCalled();
        expect(result.current.state).toMatchObject({ loading: false, error: '', selectedImage: null });
    });

    it('uses the immediate selected crop override when analysis starts', async () => {
        const { result } = renderHook(() => useScanLogic());
        const image = new File(['leaf'], 'leaf.jpg', { type: 'image/jpeg' });

        let scanId = '';
        await act(async () => {
            scanId = await result.current.actions.performAnalyze(null, 'Malaysia', {
                selectedImage: image,
                selectedCategory: 'Durian',
                selectedScale: 'personal',
                scaleQuantity: 1,
            });
        });

        expect(scanId).toBe('scan-1');
        expect(diseaseDetectionMocks.analyzePlantDisease).toHaveBeenCalledWith(
            'data:image/jpeg;base64,ok',
            'Durian',
            null,
            'en',
            'Malaysia',
            expect.objectContaining({
                tree: expect.objectContaining({ requiresRetake: false }),
            }),
            { crop: '', dataConsent: expect.objectContaining({ aiImprovement: false }) },
        );
        expect(storageMocks.saveScan).toHaveBeenCalledWith(
            expect.objectContaining({
                category: 'Durian',
                plantType: 'Durian',
                healthStatus: 'unknown',
            }),
            'user-1',
        );
    });

    it('sends a farmer-stated crop and clears it when the category changes', async () => {
        const { result } = renderHook(() => useScanLogic());
        const image = new File(['leaf'], 'leaf.jpg', { type: 'image/jpeg' });
        act(() => { result.current.actions.setCategory('Vegetables'); result.current.actions.setCrop('Tomato'); });
        expect(result.current.state.selectedCrop).toBe('Tomato');
        act(() => result.current.actions.setCategory('Fruits'));
        expect(result.current.state.selectedCrop).toBe('');
        act(() => { result.current.actions.setCategory('Vegetables'); result.current.actions.setCrop('Tomato'); });

        await act(async () => {
            await result.current.actions.performAnalyze(null, 'Malaysia', { selectedImage: image });
        });

        expect(diseaseDetectionMocks.analyzePlantDisease).toHaveBeenCalledWith(
            'data:image/jpeg;base64,ok', 'Vegetables', null, 'en', 'Malaysia', expect.any(Object), { crop: 'Tomato', dataConsent: expect.objectContaining({ aiImprovement: false }) },
        );
        expect(storageMocks.saveScan).toHaveBeenCalledWith(expect.objectContaining({ category: 'Vegetables', crop: 'Tomato' }), 'user-1');
    });

    it('explains that AI assessment needs connectivity and sends nothing while offline', async () => {
        const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
        const { result } = renderHook(() => useScanLogic());
        const image = new File(['leaf'], 'leaf.jpg', { type: 'image/jpeg' });
        let thrown;
        await act(async () => {
            try {
                await result.current.actions.performAnalyze(null, 'Malaysia', { selectedImage: image, selectedCategory: 'Durian' });
            } catch (error) { thrown = error; }
        });
        onLine.mockRestore();
        expect(thrown.userCode).toBe('ANALYSIS_OFFLINE');
        expect(result.current.state.errorCode).toBe('ANALYSIS_OFFLINE');
        expect(diseaseDetectionMocks.analyzePlantDisease).not.toHaveBeenCalled();
        expect(storageMocks.saveScan).not.toHaveBeenCalled();
    });
});
