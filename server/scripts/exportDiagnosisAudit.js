import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAuditClient } from '../utils/dataCollector.js';

// Export private audit records for the existing holdout/evaluation scripts.
const outputDir = path.resolve(process.env.DIAGNOSIS_DATA_DIR || 'server/dataset');
await fs.mkdir(path.join(outputDir, 'images'), { recursive: true });

const readAll = async (table) => {
    const rows = [];
    for (let offset = 0; ;) {
        const { data, error, count } = await getAuditClient().from(table).select('*', { count: 'exact' })
            .order('created_at').order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...data);
        offset += data.length;
        if (!data.length || (count != null ? offset >= count : data.length < 500)) return rows;
    }
};

const scans = await readAll('diagnosis_training_logs');
const feedback = await readAll('diagnosis_feedback');
const exportedScans = [];
for (const scan of scans) {
    const images = {};
    for (const [kind, objectPath] of Object.entries(scan.images || {})) {
        if (!objectPath) { images[kind] = null; continue; }
        const { data, error } = await getAuditClient().storage.from('scan-images').download(objectPath);
        if (error) throw error;
        const name = path.basename(objectPath);
        await fs.writeFile(path.join(outputDir, 'images', name), Buffer.from(await data.arrayBuffer()));
        images[kind] = `/dataset/images/${name}`;
    }
    exportedScans.push({ ...scan, timestamp: scan.created_at, images,
        prediction: { disease: scan.raw_result.disease, confidence: scan.raw_result.confidence,
            healthStatus: scan.raw_result.healthStatus, status: scan.raw_result.status } });
}
const writeJsonl = (file, rows) => fs.writeFile(path.join(outputDir, file), rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
await writeJsonl('data_log_cloud.jsonl', exportedScans);
await writeJsonl('feedback_log_cloud.jsonl', feedback.map((row) => ({ ...row.feedback, timestamp: row.created_at })));
console.log(`Exported ${scans.length} scans and ${feedback.length} feedback records to ${outputDir}`);
