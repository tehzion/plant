import fs from 'fs';
import 'dotenv/config';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryNeon } from './neonDatabase.js';
import { normalizeDataConsent } from '../../shared/dataConsent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define dataset directory: server/dataset
const DATASET_DIR = process.env.DIAGNOSIS_DATA_DIR || path.join(__dirname, '../dataset');
const IMAGES_DIR = path.join(DATASET_DIR, 'images');
// Log File Rotates Daily (Calculated inside function)

let auditClient;
const shouldUseCloudAudit = () => process.env.DIAGNOSIS_DATA_BACKEND === 'supabase'
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

// Objects live under a per-owner prefix so a caller who reuses someone else's
// scan ID writes to a different path instead of replacing their photo.
const ownerPrefix = (ownerHash) => (ownerHash ? String(ownerHash).slice(0, 16) : 'legacy');

const uploadAuditImage = async (value, scanId, suffix, ownerHash = null) => {
    if (!value) return null;
    const mime = value.match(/^data:(image\/(?:jpeg|png|webp));base64,/)?.[1] || 'image/jpeg';
    const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const objectPath = `training/${ownerPrefix(ownerHash)}/${scanId}_${suffix}.${extension}`;
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
        const { id, category, result, ownerHash = null } = data;
        // Photos are kept only when the farmer opted in; the assessment text
        // is kept either way and carries the consent answer with it.
        const dataConsent = normalizeDataConsent(data.dataConsent);
        const treeImage = dataConsent.aiImprovement ? data.treeImage : null;
        const leafImage = dataConsent.aiImprovement ? data.leafImage : null;
        const metadata = { ...(data.metadata || {}), dataConsent, ...(ownerHash ? { ownerHash } : {}) };
        const scanId = id || crypto.randomUUID();
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(scanId)) throw new Error('Invalid scan ID');

        if (shouldUseCloudAudit()) {
            const existing = await queryNeon(
                "select metadata->>'ownerHash' as owner_hash from public.diagnosis_training_logs where id = $1",
                [scanId],
            );
            if (existing.rows?.length && existing.rows[0].owner_hash !== (ownerHash || null)) {
                console.warn(JSON.stringify({ event: 'audit_owner_conflict', scanId }));
                return false;
            }
            const [tree, leaf] = await Promise.all([
                uploadAuditImage(treeImage, scanId, 'tree', ownerHash),
                uploadAuditImage(leafImage, scanId, 'leaf', ownerHash),
            ]);
            // The owner predicate keeps a concurrent writer with a different
            // identity from replacing an existing assessment record.
            const written = await queryNeon(
                `insert into public.diagnosis_training_logs(id, created_at, category, images, raw_result, metadata)
                 values ($1, $2, $3, $4, $5, $6)
                 on conflict (id) do update set created_at = excluded.created_at, category = excluded.category,
                    images = excluded.images, raw_result = excluded.raw_result, metadata = excluded.metadata
                 where diagnosis_training_logs.metadata->>'ownerHash' is not distinct from excluded.metadata->>'ownerHash'
                 returning id`,
                [scanId, timestamp, category || null, { tree, leaf }, result || {}, metadata],
            );
            if (!written.rows?.length) {
                console.warn(JSON.stringify({ event: 'audit_owner_conflict', scanId }));
                return false;
            }
            return true;
        }
        await ensureLocalDataset();

        // 1. Save Images to Disk (Convert Base64 to File)
        let treeImagePath = null;
        if (treeImage) {
            const base64Data = treeImage.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${ownerPrefix(ownerHash)}_${scanId}_tree.jpg`;
            treeImagePath = `/dataset/images/${fileName}`;
            await fs.promises.writeFile(path.join(IMAGES_DIR, fileName), buffer);
        }

        let leafImagePath = null;
        if (leafImage) {
            const base64Data = leafImage.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${ownerPrefix(ownerHash)}_${scanId}_leaf.jpg`;
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
        console.error('❌ Data Collection Failed:', error?.message || error);
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
export const logFeedback = async (feedbackData, attribution = null) => {
    try {
        const now = new Date();
        // Attribution is written by the server after verifying the caller, so
        // farmer feedback is always distinguishable from expert reviews.
        const record = attribution ? { ...feedbackData, attribution } : feedbackData;
        if (shouldUseCloudAudit()) {
            await queryNeon(
                'insert into public.diagnosis_feedback(scan_id, feedback, created_at) values ($1, $2, $3)',
                [feedbackData.scanId, record, now.toISOString()],
            );
            return true;
        }
        await ensureLocalDataset();
        const dateStr = now.toISOString().split('T')[0];
        const FEEDBACK_FILE = path.join(DATASET_DIR, `feedback_log_${dateStr}.jsonl`);

        const feedbackEntry = {
            ...record,
            timestamp: now.toISOString()
        };

        const logString = JSON.stringify(feedbackEntry) + '\n';
        await fs.promises.appendFile(FEEDBACK_FILE, logString);

        console.log(`💬 Feedback logged for scan: ${feedbackData.scanId}`);
        return true;

    } catch (error) {
        console.error('❌ Feedback logging failed:', error?.message || error);
        return false;
    }
};

/**
 * Withdraw consent for one scan: delete its stored photos and mark the record
 * as not consented. The assessment text stays for the audit window. Callers
 * must have verified that the requester ran or owns the scan.
 * @returns {Promise<{ removed: number }|null>} null when no record exists
 */
export const withdrawTrainingImages = async (scanId) => {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(String(scanId || ''))) throw new Error('Invalid scan ID');
    const withdrawn = { ...normalizeDataConsent(null), withdrawnAt: new Date().toISOString() };
    if (shouldUseCloudAudit()) {
        const { rows } = await queryNeon('select images from public.diagnosis_training_logs where id = $1', [scanId]);
        if (!rows?.length) return null;
        const paths = Object.values(rows[0].images || {}).filter(Boolean);
        if (paths.length) {
            const { error } = await getAuditClient().storage.from('scan-images').remove(paths);
            if (error) throw error;
        }
        await queryNeon(
            `update public.diagnosis_training_logs
             set images = $2, metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('dataConsent', $3::jsonb)
             where id = $1`,
            [scanId, { tree: null, leaf: null }, withdrawn],
        );
        return { removed: paths.length };
    }
    // Local development dataset: images are named <owner>_<scanId>_<kind>.jpg.
    const files = await fs.promises.readdir(IMAGES_DIR).catch(() => []);
    const matches = files.filter((name) => name.endsWith(`_${scanId}_tree.jpg`) || name.endsWith(`_${scanId}_leaf.jpg`));
    await Promise.all(matches.map((name) => fs.promises.unlink(path.join(IMAGES_DIR, name))));
    return { removed: matches.length };
};

/**
 * Log a farmer's thumbs up or down on a floating-assistant answer, so wrong or
 * unhelpful answers can be found and the assistant's instructions improved.
 * @param {{rating: 'up'|'down', question: string, answer: string, language: string, page?: string, scanStatus?: string|null}} feedback
 */
export const logAssistantFeedback = async (feedback) => {
    const record = {
        rating: feedback.rating,
        language: feedback.language || 'en',
        question: feedback.question,
        answer: feedback.answer,
        page: feedback.page || null,
        scanStatus: feedback.scanStatus || null,
    };
    try {
        const now = new Date();
        if (shouldUseCloudAudit()) {
            await queryNeon(
                'insert into public.assistant_feedback(rating, language, question, answer, page, scan_status, created_at) values ($1, $2, $3, $4, $5, $6, $7)',
                [record.rating, record.language, record.question, record.answer, record.page, record.scanStatus, now.toISOString()],
            );
            return true;
        }
        await ensureLocalDataset();
        const file = path.join(DATASET_DIR, `assistant_feedback_${now.toISOString().split('T')[0]}.jsonl`);
        await fs.promises.appendFile(file, JSON.stringify({ ...record, timestamp: now.toISOString() }) + '\n');
        return true;
    } catch (error) {
        console.error('❌ Assistant feedback logging failed:', error?.message || error);
        return false;
    }
};
