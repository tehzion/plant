/**
 * Client-side encryption utilities using Web Crypto API
 * Provides AES-GCM encryption for sensitive localStorage data
 */

const ENCRYPTION_KEY_NAME = 'vh_encryption_key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Generate a new AES-GCM encryption key
 */
async function generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
        {
            name: ALGORITHM,
            length: KEY_LENGTH,
        },
        true, // extractable
        ['encrypt', 'decrypt']
    );
}

/**
 * Export a CryptoKey to a format that can be stored
 */
async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
}

/**
 * Import a key from stored format
 */
async function importKey(keyData: string): Promise<CryptoKey> {
    const jwk = JSON.parse(keyData);
    return await crypto.subtle.importKey(
        'jwk',
        jwk,
        {
            name: ALGORITHM,
            length: KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Initialize or retrieve the encryption key
 * Creates a new key if one doesn't exist
 */
export async function initializeEncryptionKey(): Promise<CryptoKey> {
    try {
        const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME);

        if (storedKey) {
            return await importKey(storedKey);
        }

        // Generate new key if none exists
        const newKey = await generateKey();
        const exportedKey = await exportKey(newKey);
        localStorage.setItem(ENCRYPTION_KEY_NAME, exportedKey);

        return newKey;
    } catch (error) {
        console.error('Failed to initialize encryption key:', error);
        throw new Error('Encryption initialization failed');
    }
}

/**
 * Encrypt data using AES-GCM
 * @param data - Plain text string to encrypt
 * @returns Base64-encoded encrypted data with IV prepended
 */
export async function encryptData(data: string): Promise<string> {
    try {
        const key = await initializeEncryptionKey();

        // Generate random IV (Initialization Vector)
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Encode the data
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);

        // Encrypt
        const encryptedBuffer = await crypto.subtle.encrypt(
            {
                name: ALGORITHM,
                iv: iv,
            },
            key,
            encodedData
        );

        // Combine IV and encrypted data
        const encryptedArray = new Uint8Array(encryptedBuffer);
        const combined = new Uint8Array(iv.length + encryptedArray.length);
        combined.set(iv, 0);
        combined.set(encryptedArray, iv.length);

        // Convert to Base64 for storage
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedData - Base64-encoded encrypted data with IV
 * @returns Plain text string
 */
export async function decryptData(encryptedData: string): Promise<string> {
    try {
        const key = await initializeEncryptionKey();

        // Decode from Base64
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encryptedBuffer = combined.slice(12);

        // Decrypt
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv: iv,
            },
            key,
            encryptedBuffer
        );

        // Decode the result
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Check if encryption is supported in the current browser
 */
export function isEncryptionSupported(): boolean {
    return typeof crypto !== 'undefined' &&
        typeof crypto.subtle !== 'undefined' &&
        typeof crypto.getRandomValues !== 'undefined';
}
