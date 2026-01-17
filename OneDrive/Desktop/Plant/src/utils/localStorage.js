import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'sea_plant_scan_history';
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'sea-plant-default-secret-key-2025';

/**
 * Encrypt data string
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text
 */
const encryptData = (text) => {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

/**
 * Decrypt data string
 * @param {string} ciphertext - Encrypted text
 * @returns {string} Decrypted text
 */
const decryptData = (ciphertext) => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Save a scan result to local storage (Encrypted)
 * @param {Object} scanData - The scan data to save
 * @param {string} scanData.image - Base64 image data
 * @param {string} scanData.disease - Disease name
 * @param {number} scanData.confidence - Confidence percentage
 * @param {string} scanData.severity - Severity level (mild/moderate/severe)
 * @param {string} scanData.plantPart - Affected plant part
 * @param {Array} scanData.treatments - Treatment recommendations
 * @param {string} scanData.category - Plant category
 */
export const saveScan = (scanData) => {
    try {
        const history = getScanHistory();
        const newScan = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...scanData
        };

        history.unshift(newScan); // Add to beginning

        // Limit to 50 most recent scans
        const limitedHistory = history.slice(0, 50);

        // ENCRYPT DATA BEFORE SAVING
        const jsonString = JSON.stringify(limitedHistory);
        const encryptedData = encryptData(jsonString);

        localStorage.setItem(STORAGE_KEY, encryptedData);
        return newScan;
    } catch (error) {
        console.error('Error saving scan:', error);
        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError') {
            // Clear old scans and try again
            const history = getScanHistory().slice(0, 20);
            // Re-encrypt reduced history
            const encryptedData = encryptData(JSON.stringify(history));
            localStorage.setItem(STORAGE_KEY, encryptedData);
            return saveScan(scanData);
        }
        throw error;
    }
};

/**
 * Get all scan history (Auto-Decrypt)
 * @returns {Array} Array of scan objects
 */
export const getScanHistory = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        // Try to decrypt first
        try {
            const decryptedString = decryptData(data);
            if (decryptedString) {
                return JSON.parse(decryptedString);
            }
            throw new Error('Empty decryption result');
        } catch (e) {
            // FALLBACK: If decryption fails, it might be old legacy plain JSON data
            // Attempt to parse directly
            try {
                return JSON.parse(data);
            } catch (jsonError) {
                console.error('Data corruption:', jsonError);
                return [];
            }
        }
    } catch (error) {
        console.error('Error reading scan history:', error);
        return [];
    }
};

/**
 * Get a single scan by ID
 * @param {string} id - Scan ID
 * @returns {Object|null} Scan object or null if not found
 */
export const getScanById = (id) => {
    const history = getScanHistory();
    return history.find(scan => scan.id === id) || null;
};

/**
 * Delete a scan by ID
 * @param {string} id - Scan ID to delete
 */
export const deleteScan = (id) => {
    try {
        const history = getScanHistory();
        const filtered = history.filter(scan => scan.id !== id);
        const encryptedData = encryptData(JSON.stringify(filtered));
        localStorage.setItem(STORAGE_KEY, encryptedData);
        return true;
    } catch (error) {
        console.error('Error deleting scan:', error);
        return false;
    }
};

/**
 * Clear all scan history
 */
export const clearAllScans = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing scan history:', error);
        return false;
    }
};


/**
 * Get scans grouped by date
 * @returns {Object} Scans grouped by date labels (Today, Yesterday, etc.)
 */
export const getGroupedScans = () => {
    const history = getScanHistory();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const grouped = {
        Today: [],
        Yesterday: [],
        'This Week': [],
        Older: []
    };

    history.forEach(scan => {
        const scanDate = new Date(scan.timestamp);
        const scanDay = new Date(scanDate.getFullYear(), scanDate.getMonth(), scanDate.getDate());

        if (scanDay.getTime() === today.getTime()) {
            grouped.Today.push(scan);
        } else if (scanDay.getTime() === yesterday.getTime()) {
            grouped.Yesterday.push(scan);
        } else if (scanDate >= weekAgo) {
            grouped['This Week'].push(scan);
        } else {
            grouped.Older.push(scan);
        }
    });

    return grouped;
};
