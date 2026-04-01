import { useState, useRef, useEffect } from 'react';
import { Camera, Image, X } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { useNotifications } from '../context/NotificationProvider.jsx';
import { compressImage } from '../utils/imageCompressor';
import './CameraUpload.css';

const CameraUpload = ({ onImageCapture, disabled, currentImage }) => {
    const { t } = useLanguage();
    const { notifyError } = useNotifications();
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Sync preview with prop
    useEffect(() => {
        if (currentImage) {
            if (typeof currentImage === 'string') {
                setPreview(currentImage);
            } else if (currentImage instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => setPreview(e.target.result);
                reader.readAsDataURL(currentImage);
            }
        } else {
            setPreview(null);
        }
    }, [currentImage]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Camera access failed:", err);
            // Fallback to native input if webcam fails
            cameraInputRef.current?.click();
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);

            canvas.toBlob((blob) => {
                const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });

                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    setPreview(e.target.result);
                };
                reader.readAsDataURL(file);

                if (onImageCapture) onImageCapture(file);
                stopCamera();
            }, 'image/jpeg', 0.8);
        }
    };

    // Initialize video stream when modal opens
    useEffect(() => {
        if (isCameraOpen && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraOpen]);

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            notifyError(t('common.errorSelectImage'));
            return;
        }

        // Initial size check (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            notifyError(t('common.errorImageSize'));
            return;
        }

        try {
            // Compress Image (Resize to max 1280px, Quality 0.8)
            const compressedFile = await compressImage(file, {
                maxWidth: 1280,
                maxHeight: 1280,
                quality: 0.8
            });

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target.result);
            };
            reader.readAsDataURL(compressedFile);

            // Pass compressed file to parent
            if (onImageCapture) {
                onImageCapture(compressedFile);
            }
        } catch (error) {
            console.error("Image compression failed:", error);
            // Fallback: Use original file if compression fails
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target.result);
            reader.readAsDataURL(file);
            if (onImageCapture) onImageCapture(file);
        }
    };

    const handleGalleryClick = () => {
        fileInputRef.current?.click();
    };

    const clearPreview = () => {
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    return (
        <div className="camera-upload">
            {isCameraOpen ? (
                <div className="camera-modal">
                    <div className="video-container">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="live-video"
                        />
                    </div>
                    <div className="camera-controls">
                        <button onClick={stopCamera} className="btn-circle cancel">
                            <X size={24} />
                        </button>
                        <button onClick={capturePhoto} className="btn-circle large capture"></button>
                        <div className="camera-controls-spacer" aria-hidden="true"></div>
                    </div>
                </div>
            ) : preview ? (
                <div className="preview-container fade-in">
                    <img src={preview} alt="Preview" className="preview-image" />
                    <button
                        onClick={clearPreview}
                        className="btn btn-secondary mt-md display-flex-center gap-sm"
                        disabled={disabled}
                    >
                        <X size={18} /> {t('common.clearImage')}
                    </button>
                </div>
            ) : (
                <div className="upload-buttons">
                    {/* Camera Button */}
                    <button
                        onClick={startCamera}
                        className="btn btn-primary btn-large camera-btn"
                        disabled={disabled}
                    >
                        <Camera size={32} className="btn-icon-large" />
                        <span>{t('common.takePhoto')}</span>
                    </button>

                    {/* Gallery Button */}
                    <button
                        onClick={handleGalleryClick}
                        className="btn btn-secondary btn-large"
                        disabled={disabled}
                    >
                        <Image size={32} className="btn-icon-large" />
                        <span>{t('common.uploadGallery')}</span>
                    </button>
                </div>
            )}

            {/* Hidden file inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="camera-upload-input"
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="camera-upload-input"
            />

        </div>
    );
};

export default CameraUpload;
