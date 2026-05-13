const STATUS_LABEL_KEYS = {
    confirmed: 'results.confirmedDiagnosis',
    likely: 'results.likelyDiagnosis',
    suspected: 'results.likelyDiagnosis',
    uncertain: 'results.uncertainDiagnosis',
    possible: 'results.possibleBadge',
    retake_required: 'results.retakeRequired',
    healthy: 'results.healthy',
};

const STATUS_LABEL_FALLBACKS = {
    confirmed: 'Confirmed diagnosis',
    likely: 'Likely diagnosis',
    suspected: 'Likely diagnosis',
    uncertain: 'Uncertain diagnosis',
    possible: 'Possible',
    retake_required: 'Need a clearer leaf close-up',
    healthy: 'Healthy',
};

const normalizeDiagnosisStatus = (status) => String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const humanizeStatus = (status) => String(status || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getDiagnosisStatusLabel = (t, status) => {
    const normalized = normalizeDiagnosisStatus(status);
    if (!normalized) return '';

    const key = STATUS_LABEL_KEYS[normalized];
    if (key && typeof t === 'function') {
        const translated = t(key);
        if (translated && translated !== key) {
            return translated;
        }
    }

    return STATUS_LABEL_FALLBACKS[normalized] || humanizeStatus(status);
};
