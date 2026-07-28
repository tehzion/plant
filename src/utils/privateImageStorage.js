import { supabase } from '../lib/supabase';

export const SCAN_IMAGE_BUCKET = 'scan-images';
export const SIGNED_IMAGE_URL_EXPIRES_IN_SECONDS = 60 * 60;

const textOrEmpty = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const blobFromBase64 = (base64) => {
    const base64Data = base64.startsWith('data:') ? base64.split(',')[1] : base64;
    const byteChars = atob(base64Data);
    return new Blob(
        [new Uint8Array(Array.from(byteChars, (char) => char.charCodeAt(0)))],
        { type: 'image/jpeg' },
    );
};

export const createSignedImageUrl = async (path, expiresIn = SIGNED_IMAGE_URL_EXPIRES_IN_SECONDS) => {
    const cleanPath = textOrEmpty(path);
    if (!supabase || !cleanPath) return '';

    try {
        const { data, error } = await supabase.storage
            .from(SCAN_IMAGE_BUCKET)
            .createSignedUrl(cleanPath, expiresIn);
        if (error) {
            console.warn('Signed image URL failed:', error.message);
            return '';
        }
        return data?.signedUrl || '';
    } catch (error) {
        console.warn('Signed image URL exception:', error);
        return '';
    }
};

export const resolvePrivateImageUrl = async (path, fallbackUrl = '') => {
    const signedUrl = await createSignedImageUrl(path);
    return signedUrl || textOrEmpty(fallbackUrl);
};

export const uploadPrivateImage = async ({ base64, userId, path }) => {
    const cleanPath = textOrEmpty(path);
    if (!supabase || !base64 || !userId || !cleanPath) {
        return { path: '', signedUrl: '' };
    }

    try {
        const blob = blobFromBase64(base64);
        const { error } = await supabase.storage
            .from(SCAN_IMAGE_BUCKET)
            .upload(cleanPath, blob, { upsert: true, contentType: 'image/jpeg' });
        if (error) {
            console.warn('Private image upload failed:', error.message);
            return { path: '', signedUrl: '' };
        }

        return {
            path: cleanPath,
            signedUrl: await createSignedImageUrl(cleanPath),
        };
    } catch (error) {
        console.warn('Private image upload exception:', error);
        return { path: '', signedUrl: '' };
    }
};
