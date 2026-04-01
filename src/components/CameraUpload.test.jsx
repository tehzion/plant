import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CameraUpload from './CameraUpload.jsx';

const notifyErrorMock = vi.fn();

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'common.errorSelectImage': 'Please select an image file',
            'common.errorImageSize': 'Image size must be less than 10MB',
            'common.clearImage': 'Clear Image',
            'common.takePhoto': 'Take Photo',
            'common.uploadGallery': 'Upload from Gallery',
            'common.cameraUnsupported': 'Camera access is not available on this device. You can upload a photo from your gallery instead.',
            'common.cameraPermissionDenied': 'Camera access was blocked. You can upload a photo from your gallery instead.',
            'common.cameraUnavailable': 'We could not find an available camera. Please upload a photo from your gallery instead.',
            'common.cameraOpenFailed': 'We could not open the camera right now. Please try again or upload a photo from your gallery.',
        }[key] || key),
    }),
}));

vi.mock('../context/NotificationProvider.jsx', () => ({
    useNotifications: () => ({
        notifyError: notifyErrorMock,
    }),
}));

vi.mock('../utils/imageCompressor', () => ({
    compressImage: vi.fn(async (file) => file),
}));

describe('CameraUpload', () => {
    beforeEach(() => {
        notifyErrorMock.mockReset();
        vi.restoreAllMocks();
    });

    it('shows a toast error for non-image files', () => {
        const { container } = render(<CameraUpload onImageCapture={vi.fn()} />);
        const input = container.querySelector('input[type="file"][accept="image/*"]');
        const file = new File(['bad'], 'notes.txt', { type: 'text/plain' });

        fireEvent.change(input, { target: { files: [file] } });

        expect(notifyErrorMock).toHaveBeenCalledWith('Please select an image file');
    });

    it('shows a toast error for oversized images', () => {
        const { container } = render(<CameraUpload onImageCapture={vi.fn()} />);
        const input = container.querySelector('input[type="file"][accept="image/*"]');
        const bigFile = new File(['img'], 'huge.jpg', { type: 'image/jpeg' });
        Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });

        fireEvent.change(input, { target: { files: [bigFile] } });

        expect(notifyErrorMock).toHaveBeenCalledWith('Image size must be less than 10MB');
    });

    it('shows a clear error and falls back to gallery when camera permission is denied', async () => {
        const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia: vi.fn().mockRejectedValue({ name: 'NotAllowedError' }),
            },
        });

        render(<CameraUpload onImageCapture={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Take Photo' }));

        await waitFor(() => {
            expect(notifyErrorMock).toHaveBeenCalledWith(
                'Camera access was blocked. You can upload a photo from your gallery instead.',
                expect.objectContaining({ actionLabel: 'Upload from Gallery' }),
            );
        });

        expect(clickSpy).toHaveBeenCalled();
    });
});
