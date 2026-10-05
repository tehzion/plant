import fs from 'fs';
import 'dotenv/config';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define dataset directory: server/dataset
const DATASET_DIR = process.env.DIAGNOSIS_DATA_DIR || path.join(__dirname, '../dataset');
const IMAGES_DIR = path.join(DATASET_DIR, 'images');
// Log File Rotates Daily (Calculated inside function)

let auditClient;
const useCloudAudit = () => process.env.DIAGNOSIS_DATA_BACKEND === 'supabase'
    || (process.env.NODE_ENV === 'production' && process.env.DIAGNOSIS_DATA_BACKEND !== 'local');

export const getAuditClient = () => {
    if (!auditClient) {
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
        if (!url || !key) throw new Error('Durable diagnosis storage requires server-side Supabase configuration');
        auditClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    return auditClient;
};

const ensureLocalDataset = async () => {
    if (process.env.NODE_ENV === 'production' && !process.env.DIAGNOSIS_DATA_DIR) {
        throw new Error('Production local diagnosis storage requires DIAGNOSIS_DATA_DIR on a persistent volume');
    }
    await fs.promises.mkdir(IMAGES_DIR, { recursive: true });
};

const uploadAuditImage = async (value, scanId, suffix) => {
    if (!value) return null;
    const mime = value.match(/^data:(image\/(?:jpeg|png|webp));base64,/)?.[1] || 'image/jpeg';
    const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const objectPath = `training/${scanId}_${suffix}.${extension}`;
    const { error } = await getAuditClient().storage.from('scan-images').upload(
        objectPath, Buffer.from(value.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
        { upsert: true, contentType: mime },
    );
    if (error) throw error;
    return objectPath;
};

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
        const { id, treeImage, leafImage, category, result, metadata = {} } = data;
        const scanId = id || crypto.randomUUID();
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(scanId)) throw new Error('Invalid scan ID');

        if (useCloudAudit()) {
            const [tree, leaf] = await Promise.all([
                uploadAuditImage(treeImage, scanId, 'tree'),
                uploadAuditImage(leafImage, scanId, 'leaf'),
            ]);
            const { error } = await getAuditClient().from('diagnosis_training_logs').upsert({
                id: scanId, created_at: timestamp, category,
                images: { tree, leaf }, raw_result: result, metadata,
            }, { onConflict: 'id' });
            if (error) throw error;
            return true;
        }
        await ensureLocalDataset();

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
                healthStatus: result.healthStatus,
                status: result.status || null,
                confidenceBreakdown: result.confidenceBreakdown || null,
                differentialDiagnoses: result.differentialDiagnoses || [],
            },
            metadata: {
                ...metadata,
                imageQuality: metadata.imageQuality || null,
                plantNetCandidates: metadata.plantNetCandidates || [],
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

/**
 * Log user feedback for a scan
 * @param {Object} feedbackData
 * @param {string} feedbackData.scanId - The scan ID
 * @param {number} feedbackData.rating - Rating (1-5)
 * @param {string} feedbackData.comment - Optional comment
 * @param {string} feedbackData.correction - Optional correction
 * @param {boolean} feedbackData.wasCorrect - Whether the diagnosis was correct
 * @param {string} feedbackData.correctCrop - Optional corrected crop
 * @param {string} feedbackData.correctDisease - Optional corrected disease
 * @param {string} feedbackData.issueType - Optional issue category
 * @param {string} feedbackData.note - Optional detailed note
 */
export const logFeedback = async (feedbackData) => {
    try {
        const now = new Date();
        if (useCloudAudit()) {
            const { error } = await getAuditClient().from('diagnosis_feedback').insert({
                scan_id: feedbackData.scanId, feedback: feedbackData, created_at: now.toISOString(),
            });
            if (error) throw error;
            return true;
        }
        await ensureLocalDataset();
        const dateStr = now.toISOString().split('T')[0];
        const FEEDBACK_FILE = path.join(DATASET_DIR, `feedback_log_${dateStr}.jsonl`);

        const feedbackEntry = {
            ...feedbackData,
            timestamp: now.toISOString()
        };

        const logString = JSON.stringify(feedbackEntry) + '\n';
        await fs.promises.appendFile(FEEDBACK_FILE, logString);

        console.log(`💬 Feedback logged for scan: ${feedbackData.scanId}`);
        return true;

    } catch (error) {
        console.error('❌ Feedback logging failed:', error);
        return false;
    }
};
