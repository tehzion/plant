import { queryNeon } from '../utils/neonDatabase.js';
import { getAuditClient } from '../utils/dataCollector.js';

// Invoke from an explicit scheduled maintenance job, never from a user request.
export const pruneDiagnosisAudit = async (days = Number(process.env.DIAGNOSIS_RETENTION_DAYS || 90)) => {
    if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('Retention must be between 1 and 3650 days');
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const storage = getAuditClient();
    let deletedScans = 0;
    while (true) {
        const { rows } = await queryNeon(
            'select id, images from public.diagnosis_training_logs where created_at < $1 order by created_at limit 100',
            [cutoff],
        );
        if (!rows?.length) break;
        const paths = rows.flatMap((row) => Object.values(row.images || {})).filter(Boolean);
        // Accepts both the original flat layout and the per-owner folder
        // (training/<owner>/<scan>_tree.jpg) used since the ownership fix.
        if (paths.some((value) => typeof value !== 'string' || !/^training\/(?:[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+_(tree|leaf)\.(jpg|png|webp)$/.test(value))) {
            throw new Error('Unexpected audit image path; cleanup stopped');
        }
        if (paths.length) {
            const { error: storageError } = await storage.storage.from('scan-images').remove(paths);
            if (storageError) throw storageError;
        }
        const ids = rows.map((row) => row.id);
        await queryNeon(
            `delete from public.diagnosis_training_logs where id in (${ids.map((_, index) => `$${index + 1}`).join(', ')})`,
            ids,
        );
        deletedScans += rows.length;
    }
    const { rows: feedbackRows } = await queryNeon(
        'delete from public.diagnosis_feedback where created_at < $1 returning id',
        [cutoff],
    );
    return { deletedScans, deletedFeedback: feedbackRows?.length || 0, cutoff };
};
