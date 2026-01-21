import { useState, useRef, useEffect } from 'react';
import { Camera, Image, X } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { compressImage } from '../utils/imageCompressor';

const CameraUpload = ({ onImageCapture, disabled, currentImage }) => {
    const { t } = useLanguage();
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
            alert(t('common.errorSelectImage'));
            return;
        }

        // Initial size check (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert(t('common.errorImageSize'));
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
                        <div style={{ width: 40 }}></div> {/* Spacer for balance */}
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
                style={{ display: 'none' }}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            <style>{`
        .camera-upload {
          width: 100%;
        }

        .camera-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh; /* Fallback */
            height: 100dvh;
            background: black;
            z-index: 2000; /* Ensure it's above bottom nav (z-index: 1000) */
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .video-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
            background: #000;
        }

        .live-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .camera-controls {
            padding: 30px;
            padding-bottom: calc(30px + env(safe-area-inset-bottom));
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            z-index: 10;
        }

        .btn-circle {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: white;
            font-size: 1.2rem;
            transition: transform 0.2s;
        }

        .btn-circle:active {
            transform: scale(0.9);
        }

        .btn-circle.cancel {
            background: rgba(255,255,255,0.2);
        }

        .btn-circle.capture {
            width: 70px;
            height: 70px;
            background: white;
            border: 4px solid rgba(0,0,0,0.2);
            position: relative;
        }

        .btn-circle.capture::after {
            content: '';
            position: absolute;
            width: 90%;
            height: 90%;
            border-radius: 50%;
            border: 2px solid black;
        }

        .upload-buttons {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          width: 100%;
        }

        .camera-btn {
          background: var(--gradient-primary);
          box-shadow: var(--shadow-lg);
        }

        .btn-icon-large {
          font-size: 2rem;
        }

        .preview-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .preview-image {
          width: 100%;
          max-width: 500px;
          height: auto;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          object-fit: cover;
        }

        @media (max-width: 768px) {
          .preview-image {
            max-height: 400px;
          }
        }
      `}</style>
        </div>
    );
};

export default CameraUpload;
