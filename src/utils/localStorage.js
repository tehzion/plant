import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'sea_plant_scan_history';
const LOGBOOK_KEY = 'sea_plant_mygap_logbook';
const CHECKLIST_KEY = 'sea_plant_mygap_checklist';
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

if (!SECRET_KEY && import.meta.env.DEV) {
    console.warn('⚠️ VITE_ENCRYPTION_KEY is missing. Local storage will be unencrypted in development.');
}

/**
 * Encrypt data string
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text
 */
const encryptData = (text) => {
    if (!SECRET_KEY) return text; // No key = store as plain text
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

/**
 * Decrypt data string
 * @param {string} ciphertext - Encrypted text
 * @returns {string} Decrypted text
 */
const decryptData = (ciphertext) => {
    if (!SECRET_KEY) return ciphertext; // No key = assume plain text
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || ciphertext; // If decryption returns empty, data was likely plain text
    } catch (e) {
        return ciphertext; // Fallback: return as-is if decryption fails
    }
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
            id: Date.now().toString(36), // Shortened ID (Base36)
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
        if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
            try {
                // More aggressive cleanup: Keep only 15 most recent
                console.warn('Local storage quota exceeded, clearing old history...');
                const history = getScanHistory();
                if (history.length > 15) {
                    const reducedHistory = history.slice(0, 15);
                    const encryptedData = encryptData(JSON.stringify(reducedHistory));
                    localStorage.setItem(STORAGE_KEY, encryptedData);

                    // Try one last time with the current scan
                    // We don't recurse indefinitely, we just try once more after cleanup
                    const finalHistory = [
                        { id: Date.now().toString(36), timestamp: new Date().toISOString(), ...scanData },
                        ...reducedHistory
                    ].slice(0, 15);
                    localStorage.setItem(STORAGE_KEY, encryptData(JSON.stringify(finalHistory)));
                    return finalHistory[0];
                }
            } catch (e) {
                console.error('Failed to recover from quota error:', e);
            }
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
 * @returns {Object} Scans grouped by date labels (today, yesterday, etc.)
 */
export const getGroupedScans = () => {
    const history = getScanHistory();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const fortnightAgo = new Date(today);
    fortnightAgo.setDate(fortnightAgo.getDate() - 14);

    const grouped = {
        today: [],
        yesterday: [],
        thisWeek: [],
        lastWeek: [],
        older: []
    };

    history.forEach(scan => {
        const scanDate = new Date(scan.timestamp);
        const scanDay = new Date(scanDate.getFullYear(), scanDate.getMonth(), scanDate.getDate());

        if (scanDay.getTime() === today.getTime()) {
            grouped.today.push(scan);
        } else if (scanDay.getTime() === yesterday.getTime()) {
            grouped.yesterday.push(scan);
        } else if (scanDate >= weekAgo) {
            grouped.thisWeek.push(scan);
        } else if (scanDate >= fortnightAgo) {
            grouped.lastWeek.push(scan);
        } else {
            grouped.older.push(scan);
        }
    });

    return grouped;
};

/**
 * myGAP Digital Logbook Functions
 */
export const saveLogEntry = (logEntry) => {
    try {
        const logs = getLogbook();
        const newLog = {
            id: Date.now().toString(36),
            timestamp: new Date().toISOString(),
            ...logEntry
        };
        logs.unshift(newLog);
        localStorage.setItem(LOGBOOK_KEY, encryptData(JSON.stringify(logs.slice(0, 100))));
        return newLog;
    } catch (error) {
        console.error('Error saving log entry:', error);
        return null;
    }
};

export const getLogbook = () => {
    try {
        const data = localStorage.getItem(LOGBOOK_KEY);
        if (!data) return [];
        return JSON.parse(decryptData(data));
    } catch (error) {
        console.error('Error reading logbook:', error);
        return [];
    }
};

/**
 * myGAP Compliance Checklist Functions
 */
export const saveChecklistState = (checklistState) => {
    try {
        localStorage.setItem(CHECKLIST_KEY, encryptData(JSON.stringify(checklistState)));
        return true;
    } catch (error) {
        console.error('Error saving checklist state:', error);
        return false;
    }
};

export const getChecklistState = () => {
    try {
        const data = localStorage.getItem(CHECKLIST_KEY);
        if (!data) return {};
        return JSON.parse(decryptData(data));
    } catch (error) {
        console.error('Error reading checklist state:', error);
        return {};
    }
};
