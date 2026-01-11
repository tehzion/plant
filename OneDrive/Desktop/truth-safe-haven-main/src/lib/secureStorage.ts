/**
 * Secure storage wrapper for localStorage with automatic encryption/decryption
 * Provides a drop-in replacement for localStorage with encryption
 */

import { encryptData, decryptData, isEncryptionSupported } from './encryption';

const MIGRATION_FLAG = 'vh_encrypted_storage_v1';

/**
 * Store an item securely with encryption
 * @param key - Storage key
 * @param value - Value to store (will be JSON stringified)
 */
export async function setSecureItem(key: string, value: any): Promise<void> {
    try {
        const jsonString = JSON.stringify(value);

        if (!isEncryptionSupported()) {
            console.warn('Encryption not supported, falling back to plain storage');
            localStorage.setItem(key, jsonString);
            return;
        }

        const encrypted = await encryptData(jsonString);
        localStorage.setItem(key, encrypted);

        // Mark this key as encrypted
        const encryptedKeys = getEncryptedKeys();
        if (!encryptedKeys.includes(key)) {
            encryptedKeys.push(key);
            localStorage.setItem(MIGRATION_FLAG, JSON.stringify(encryptedKeys));
        }
    } catch (error) {
        console.error(`Failed to set secure item "${key}":`, error);
        throw error;
    }
}

/**
 * Retrieve and decrypt an item from storage
 * @param key - Storage key
 * @returns Parsed value or null if not found
 */
export async function getSecureItem<T = any>(key: string): Promise<T | null> {
    try {
        const storedValue = localStorage.getItem(key);

        if (!storedValue) {
            return null;
        }

        const encryptedKeys = getEncryptedKeys();
        const isEncrypted = encryptedKeys.includes(key);

        // If not marked as encrypted, try to parse as plain text (backward compatibility)
        if (!isEncrypted) {
            // Try to parse as JSON first
            try {
                const parsed = JSON.parse(storedValue);

                // Auto-migrate to encrypted storage
                if (isEncryptionSupported()) {
                    console.log(`Auto-migrating "${key}" to encrypted storage`);
                    await setSecureItem(key, parsed);
                }

                return parsed as T;
            } catch {
                // If JSON parse fails, might be encrypted without flag (shouldn't happen)
                // Try to decrypt anyway
            }
        }

        // Decrypt and parse
        if (!isEncryptionSupported()) {
            console.warn('Encryption not supported, attempting plain text parse');
            return JSON.parse(storedValue) as T;
        }

        const decrypted = await decryptData(storedValue);
        return JSON.parse(decrypted) as T;
    } catch (error) {
        console.error(`Failed to get secure item "${key}":`, error);
        // Return null instead of throwing to handle corrupted data gracefully
        return null;
    }
}

/**
 * Remove an item from secure storage
 * @param key - Storage key
 */
export function removeSecureItem(key: string): void {
    localStorage.removeItem(key);

    // Remove from encrypted keys list
    const encryptedKeys = getEncryptedKeys();
    const filtered = encryptedKeys.filter(k => k !== key);
    localStorage.setItem(MIGRATION_FLAG, JSON.stringify(filtered));
}

/**
 * Get list of keys that are encrypted
 */
function getEncryptedKeys(): string[] {
    try {
        const stored = localStorage.getItem(MIGRATION_FLAG);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Check if encryption is available
 */
export function isSecureStorageAvailable(): boolean {
    return isEncryptionSupported();
}

/**
 * Clear all secure storage items
 */
export async function clearSecureStorage(): Promise<void> {
    const encryptedKeys = getEncryptedKeys();
    encryptedKeys.forEach(key => {
        localStorage.removeItem(key);
    });
    localStorage.removeItem(MIGRATION_FLAG);
}
