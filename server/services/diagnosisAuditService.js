import { getAuditClient } from '../utils/dataCollector.js';

// Invoke from an explicit scheduled maintenance job, never from a user request.
export const pruneDiagnosisAudit = async (days = Number(process.env.DIAGNOSIS_RETENTION_DAYS || 90)) => {
    if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('Retention must be between 1 and 3650 days');
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const client = getAuditClient();
    let deletedScans = 0;
    while (true) {
        const { data, error } = await client.from('diagnosis_training_logs').select('id, images')
            .lt('created_at', cutoff).order('created_at').limit(100);
        if (error) throw error;
        if (!data?.length) break;
        const paths = data.flatMap((row) => Object.values(row.images || {})).filter(Boolean);
        if (paths.some((value) => typeof value !== 'string' || !/^training\/[a-zA-Z0-9_-]+_(tree|leaf)\.(jpg|png|webp)$/.test(value))) {
            throw new Error('Unexpected audit image path; cleanup stopped');
        }
        if (paths.length) {
            const { error: storageError } = await client.storage.from('scan-images').remove(paths);
            if (storageError) throw storageError;
        }
        const { error: deleteError } = await client.from('diagnosis_training_logs').delete().in('id', data.map((row) => row.id));
        if (deleteError) throw deleteError;
        deletedScans += data.length;
    }
    const feedbackDelete = client.from('diagnosis_feedback').delete().lt('created_at', cutoff);
    const feedbackResult = typeof feedbackDelete.select === 'function'
        ? await feedbackDelete.select('id')
        : await feedbackDelete;
    const { data: feedbackRows, error } = feedbackResult;
    if (error) throw error;
    return { deletedScans, deletedFeedback: feedbackRows?.length || 0, cutoff };
};
