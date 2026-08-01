import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useScanLogic } from './useScanLogic.js';

const diseaseDetectionMocks = vi.hoisted(() => ({
    imageToBase64: vi.fn(),
    analyzePlantDisease: vi.fn(),
    analyzeLocalImageQuality: vi.fn(),
}));
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

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-1' },
    }),
}));

vi.mock('../utils/diseaseDetection', () => diseaseDetectionMocks);

vi.mock('../utils/localStorage', () => storageMocks);

vi.mock('../utils/statusUtils', () => ({
    getStandardizedStatus: () => 'unhealthy',
}));

vi.mock('../utils/toast.js', () => ({
    showToast: vi.fn(),
}));

describe('useScanLogic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
        );
        expect(storageMocks.saveScan).toHaveBeenCalledWith(
            expect.objectContaining({
                category: 'Durian',
                plantType: 'Durian',
            }),
            'user-1',
        );
    });
});
