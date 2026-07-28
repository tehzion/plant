const STATUS_LABEL_KEYS = {
    confirmed: 'results.confirmedDiagnosis',
    likely: 'results.likelyDiagnosis',
    suspected: 'results.likelyDiagnosis',
    uncertain: 'results.uncertainDiagnosis',
    possible: 'results.possibleBadge',
    retake_required: 'results.retakeRequired',
    healthy: 'results.healthy',
    confident_treatment: 'results.scanStateConfidentTreatment',
    needs_closer_photo: 'results.scanStateNeedsCloserPhoto',
    possible_nutrient_issue: 'results.scanStatePossibleNutrientIssue',
    possible_pest: 'results.scanStatePossiblePest',
    expert_review_needed: 'results.scanStateExpertReviewNeeded',
};

const STATUS_LABEL_FALLBACKS = {
    confirmed: 'Confirmed diagnosis',
    likely: 'Likely diagnosis',
    suspected: 'Likely diagnosis',
    uncertain: 'Uncertain diagnosis',
    possible: 'Possible',
    retake_required: 'Need a clearer leaf close-up',
    healthy: 'Healthy',
    confident_treatment: 'Confident treatment',
    needs_closer_photo: 'Need closer photo',
    possible_nutrient_issue: 'Possible nutrient issue',
    possible_pest: 'Possible pest',
    expert_review_needed: 'Expert review needed',
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

export const getScanResultStateLabel = getDiagnosisStatusLabel;
