const severityRank = {
    mild: 1,
    moderate: 2,
    severe: 3,
    critical: 4,
};

const normalizeDate = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
};

export const sortFollowUpEvents = (events = []) => [...events]
    .filter(event => event && event.id)
    .sort((a, b) => {
        const aTime = normalizeDate(a.recordedAt)?.getTime() || 0;
        const bTime = normalizeDate(b.recordedAt)?.getTime() || 0;
        if (bTime !== aTime) return bTime - aTime;
        return String(b.id).localeCompare(String(a.id));
    });

const listValue = value => Array.isArray(value)
    ? value.filter(Boolean)
    : typeof value === 'string' ? value.split(/\r?\n|•|;/).map(item => item.trim()).filter(Boolean) : [];

export const getSeverityChange = (originalSeverity, latestSeverity, copy) => {
    const original = String(originalSeverity || '').toLowerCase();
    const latest = String(latestSeverity || '').toLowerCase();
    if (!severityRank[original] || !severityRank[latest]) return { key: 'notRecorded', label: copy.notRecorded, direction: 'unknown' };
    if (severityRank[latest] < severityRank[original]) return { key: 'improved', label: copy.improved, direction: 'improved' };
    if (severityRank[latest] > severityRank[original]) return { key: 'worsened', label: copy.worsened, direction: 'worsened' };
    return { key: 'unchangedSeverity', label: copy.unchangedSeverity, direction: 'unchanged' };
};

export const buildFollowUpComparisonModel = ({ scan = {}, event = null, photoUrl = '', copy }) => {
    const originalSymptoms = listValue(scan.symptoms || scan.observations);
    const originalImage = scan.image || scan.image_url || '';
    const originalLeafImage = scan.leafImage || scan.leaf_image_url || '';
    const originalSeverity = String(scan.severity || '').toLowerCase();
    const latestSeverity = String(event?.severity || '').toLowerCase();

    return {
        original: {
            image: originalImage,
            secondaryImage: originalLeafImage && originalLeafImage !== originalImage ? originalLeafImage : '',
            diagnosis: scan.disease || scan.diagnosis || copy.notRecorded,
            health: scan.healthStatus || scan.health_state || (scan.healthy ? 'healthy' : copy.notRecorded),
            symptoms: originalSymptoms,
            severity: originalSeverity,
            recordedAt: scan.timestamp || '',
        },
        latest: event ? {
            image: event.photo || photoUrl || '',
            outcome: event.outcome || '',
            severity: latestSeverity,
            notes: event.note || '',
            recordedAt: event.recordedAt || '',
        } : null,
        severityChange: getSeverityChange(originalSeverity, latestSeverity, copy),
    };
};
