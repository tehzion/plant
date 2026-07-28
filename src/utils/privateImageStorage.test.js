import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageFromMock = vi.hoisted(() => vi.fn());
const uploadMock = vi.hoisted(() => vi.fn());
const createSignedUrlMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase', () => ({
    supabase: {
        storage: {
            from: storageFromMock,
        },
    },
}));

const {
    createSignedImageUrl,
    resolvePrivateImageUrl,
    uploadPrivateImage,
} = await import('./privateImageStorage.js');

describe('private image storage helpers', () => {
    beforeEach(() => {
        storageFromMock.mockReset();
        uploadMock.mockReset();
        createSignedUrlMock.mockReset();
        storageFromMock.mockReturnValue({
            upload: uploadMock,
            createSignedUrl: createSignedUrlMock,
        });
        uploadMock.mockResolvedValue({ error: null });
        createSignedUrlMock.mockResolvedValue({ data: { signedUrl: 'https://signed.example/image.jpg' }, error: null });
    });

    it('creates signed URLs for private image paths', async () => {
        await expect(createSignedImageUrl('user-1/scan.jpg')).resolves.toBe('https://signed.example/image.jpg');
        expect(storageFromMock).toHaveBeenCalledWith('scan-images');
        expect(createSignedUrlMock).toHaveBeenCalledWith('user-1/scan.jpg', 3600);
    });

    it('falls back to legacy URLs when signing fails', async () => {
        createSignedUrlMock.mockResolvedValueOnce({ data: null, error: new Error('denied') });

        await expect(resolvePrivateImageUrl('user-1/scan.jpg', 'https://legacy.example/scan.jpg')).resolves.toBe('https://legacy.example/scan.jpg');
    });

    it('uploads private images and returns the path plus signed URL', async () => {
        const result = await uploadPrivateImage({
            base64: 'data:image/jpeg;base64,YWJj',
            userId: 'user-1',
            path: 'user-1/scan.jpg',
        });

        expect(uploadMock).toHaveBeenCalledWith(
            'user-1/scan.jpg',
            expect.any(Blob),
            { upsert: true, contentType: 'image/jpeg' },
        );
        expect(result).toEqual({
            path: 'user-1/scan.jpg',
            signedUrl: 'https://signed.example/image.jpg',
        });
    });
});
