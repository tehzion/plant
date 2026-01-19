import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define dataset directory: server/dataset
const DATASET_DIR = path.join(__dirname, '../dataset');
const IMAGES_DIR = path.join(DATASET_DIR, 'images');
// Log File Rotates Daily (Calculated inside function)

// Ensure directories exist
if (!fs.existsSync(DATASET_DIR)) fs.mkdirSync(DATASET_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

/**
 * Save analysis data for model training
 * @param {Object} data
 * @param {string} data.id - Unique ID (Scan ID)
 * @param {string} data.treeImage - Base64 image
 * @param {string} data.leafImage - Base64 image (optional)
 * @param {string} data.category - Plant category
 * @param {Object} data.result - The analysis result from AI
 * @param {string} data.feedback - Optional feedback (correct/incorrect)
 */
export const logTrainingData = async (data) => {
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const LOG_FILE = path.join(DATASET_DIR, `data_log_${dateStr}.jsonl`);

        const timestamp = now.toISOString();
        const { id, treeImage, leafImage, category, result } = data;
        const scanId = id || `scan_${Date.now()}`;

        // 1. Save Images to Disk (Convert Base64 to File)
        let treeImagePath = null;
        if (treeImage) {
            const base64Data = treeImage.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${scanId}_tree.jpg`;
            treeImagePath = `/dataset/images/${fileName}`;
            await fs.promises.writeFile(path.join(IMAGES_DIR, fileName), buffer);
        }

        let leafImagePath = null;
        if (leafImage) {
            const base64Data = leafImage.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${scanId}_leaf.jpg`;
            leafImagePath = `/dataset/images/${fileName}`;
            await fs.promises.writeFile(path.join(IMAGES_DIR, fileName), buffer);
        }

        // 2. Prepare Log Entry (JSONL format)
        const logEntry = {
            id: scanId,
            timestamp,
            category,
            // We store PATHS, not base64, to keep the log light
            images: {
                tree: treeImagePath,
                leaf: leafImagePath
            },
            // The AI's prediction
            prediction: {
                disease: result.disease,
                confidence: result.confidence,
                healthStatus: result.healthStatus
            },
            // Full raw result (optional, but good for debugging)
            raw_result: result,
            // Placeholder for human verification
            verified: false,
            correction: null
        };

        // 3. Append to JSONL File (Auto-rotated by date)
        const logString = JSON.stringify(logEntry) + '\n';
        await fs.promises.appendFile(LOG_FILE, logString);

        console.log(`📝 Data logged for ID: ${scanId} (Log: ${path.basename(LOG_FILE)})`);
        return true;

    } catch (error) {
        console.error('❌ Data Collection Failed:', error);
        return false; // Don't crash the app if logging fails
    }
};
