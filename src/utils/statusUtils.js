/**
 * Common utility for handling plant health status across the application.
 * Prevents fragile string-based checks in multiple components.
 */

const HEALTHY_KEYWORDS = [
    'healthy',
    'sihat',
    'tiada masalah',
    'tiada penyakit',
    'pokok elok',
    'normal',
    '健康',
    '无问题',
    '未检测到问题'
];

const HEALTHY_DISEASE_KEYWORDS = [
    'no issues',
    'no issue',
    'tiada masalah',
    'tiada penyakit',
    'pokok elok',
    'healthy',
    'sihat',
    'normal',
    '未检测到问题',
    '无问题'
];

const UNKNOWN_KEYWORDS = [
    'unknown',
    'tidak diketahui',
    'masalah tidak dikenali',
    'unknown disease',
    'n/a'
];

const UNHEALTHY_STATUS_KEYWORDS = [
    'unhealthy',
    'diseased',
    'disease detected',
    'issue detected',
    'issues detected',
    'not healthy',
    'sick',
    'sakit'
];

const UNHEALTHY_SEVERITY_KEYWORDS = [
    'mild',
    'moderate',
    'severe',
    'critical',
    'low',
    'high',
    'rendah',
    'sederhana',
    'tinggi',
    'kritikal',
    'kritikal',
    '严重',
    '中等',
    '轻微'
];

const SEVERITY_ALIASES = {
    mild: 'mild',
    low: 'mild',
    rendah: 'mild',
    ringan: 'mild',
    milds: 'mild',
    moderate: 'moderate',
    sederhana: 'moderate',
    medium: 'moderate',
    sedang: 'moderate',
    中等: 'moderate',
    中度: 'moderate',
    severe: 'severe',
    high: 'severe',
    tinggi: 'severe',
    teruk: 'severe',
    严重: 'severe',
    critical: 'critical',
    kritikal: 'critical',
};

export const SCAN_RESULT_STATES = Object.freeze({
    CONFIDENT_TREATMENT: 'confident_treatment',
    NEEDS_CLOSER_PHOTO: 'needs_closer_photo',
    POSSIBLE_NUTRIENT_ISSUE: 'possible_nutrient_issue',
    POSSIBLE_PEST: 'possible_pest',
    EXPERT_REVIEW_NEEDED: 'expert_review_needed',
    HEALTHY: 'healthy',
});

const REVIEW_RESULT_STATES = new Set([
    SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO,
    SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE,
    SCAN_RESULT_STATES.POSSIBLE_PEST,
    SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED,
]);

const REVIEW_STATUS_VALUES = new Set([
    'retake_required',
    'uncertain',
    'possible',
    'inconclusive',
    'needs_more_evidence',
    'needs_review',
    'review_needed',
]);

const normalizeText = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const toSearchText = (value) => String(value || '').toLowerCase();

const getConfidenceValue = (scan = {}) => {
    const candidates = [
        scan.diagnosisConfidence,
        scan.confidenceBreakdown?.diagnosisConfidence,
        scan.confidence,
    ];
    for (const candidate of candidates) {
        const number = Number(candidate);
        if (Number.isFinite(number)) {
            return number > 1 ? number : number * 100;
        }
    }
    return null;
};

const includesAny = (value, keywords) => {
    const text = toSearchText(value);
    return keywords.some((keyword) => text.includes(keyword));
};

const getImageQualityConfidence = (scan = {}) => (
    Number(scan.captureAssessment?.imageQualityConfidence ?? scan.confidenceBreakdown?.imageQualityConfidence)
);

const hasNeedsCloserPhotoSignal = (scan = {}, status = normalizeText(scan.status)) => {
    const imageQualityConfidence = getImageQualityConfidence(scan);

    return Boolean(
        scan.requiresRetake
        || scan.captureAssessment?.requiresRetake
        || status === 'retake_required'
        || scan.retakeReason
        || scan.captureAssessment?.leafDetailSufficient === false
        || (Number.isFinite(imageQualityConfidence) && imageQualityConfidence < 50)
    );
};

const hasReviewOrRetakeSignal = (scan = {}) => {
    const resultState = normalizeText(scan.resultState);
    const status = normalizeText(scan.status);
    const confidence = getConfidenceValue(scan);

    return REVIEW_RESULT_STATES.has(resultState)
        || hasNeedsCloserPhotoSignal(scan, status)
        || REVIEW_STATUS_VALUES.has(status)
        || scan.needsMoreEvidence
        || scan.abstainReason
        || (confidence !== null && confidence < 70);
};

const hasPestSignal = (scan = {}) => {
    const evidenceText = [
        scan.disease,
        scan.pathogenType,
        scan.diseaseCategory,
        scan.diagnosticEvidence?.likelyCauseCategory,
        ...(Array.isArray(scan.symptoms) ? scan.symptoms : []),
        ...(Array.isArray(scan.productSearchTags) ? scan.productSearchTags : []),
    ].join(' ');

    return includesAny(evidenceText, [
        'pest',
        'insect',
        'mealybug',
        'mealy bug',
        'scale',
        'aphid',
        'mite',
        'thrip',
        'whitefly',
        'infestation',
        'kutu',
        'serangga',
    ]);
};

const hasNutrientSignal = (scan = {}) => {
    const nutritionalStatus = normalizeText(scan.nutritionalIssues?.status || scan.nutritionalStatus);
    const evidenceText = [
        scan.disease,
        scan.pathogenType,
        scan.diseaseCategory,
        scan.diagnosticEvidence?.likelyCauseCategory,
        ...(Array.isArray(scan.productSearchTags) ? scan.productSearchTags : []),
    ].join(' ');

    return ['possible', 'confirmed'].includes(nutritionalStatus)
        || includesAny(evidenceText, [
            'nutrient',
            'nutrition',
            'nutritional',
            'deficien',
            'chlorosis',
            'nitrogen',
            'potassium',
            'magnesium',
            'calcium',
            'kalium',
        ]);
};

const hasActionableCause = (scan = {}) => {
    const evidenceText = [
        scan.disease,
        scan.pathogenType,
        scan.diseaseCategory,
        scan.diagnosticEvidence?.likelyCauseCategory,
    ].join(' ');

    return includesAny(evidenceText, [
        'fungal',
        'fungus',
        'bacterial',
        'bacteria',
        'viral',
        'virus',
        'pest',
        'insect',
        'oomycete',
        'nematode',
        'blight',
        'spot',
        'rot',
        'wilt',
        'rust',
        'mildew',
    ]);
};

export const getScanResultState = (scan = {}) => {
    if (!scan || typeof scan !== 'object') return SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED;

    const explicitState = normalizeText(scan.resultState);
    const status = normalizeText(scan.status);

    if (hasNeedsCloserPhotoSignal(scan, status)) return SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO;
    if (Object.values(SCAN_RESULT_STATES).includes(explicitState) && explicitState !== SCAN_RESULT_STATES.HEALTHY) {
        return explicitState;
    }

    const confidence = getConfidenceValue(scan);
    const weakEvidence = Boolean(
        scan.needsMoreEvidence
        || scan.abstainReason
        || REVIEW_STATUS_VALUES.has(status)
        || (confidence !== null && confidence < 70)
    );

    if (explicitState === SCAN_RESULT_STATES.HEALTHY && !weakEvidence) {
        return SCAN_RESULT_STATES.HEALTHY;
    }

    if (isHealthy(scan) && !weakEvidence) return SCAN_RESULT_STATES.HEALTHY;

    const strongTreatment = hasActionableCause(scan)
        && !weakEvidence
        && (
            (status === 'confirmed' && confidence !== null && confidence >= 80)
            || (status === 'likely' && confidence !== null && confidence >= 85)
        );

    if (hasNutrientSignal(scan) && !strongTreatment) {
        return SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE;
    }

    if (hasPestSignal(scan) && !strongTreatment) {
        return SCAN_RESULT_STATES.POSSIBLE_PEST;
    }

    if (strongTreatment) return SCAN_RESULT_STATES.CONFIDENT_TREATMENT;

    return SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED;
};

/**
 * Checks if a scan result indicates a healthy plant.
 * @param {Object|string} scanOrStatus - The scan object or a status string.
 * @returns {boolean}
 */
export const isHealthy = (scanOrStatus) => {
    if (!scanOrStatus) return false;

    const normalize = (value) => (value || '').toString().trim().toLowerCase();

    if (typeof scanOrStatus !== 'string') {
        const disease = normalize(scanOrStatus.disease);
        const severity = normalize(scanOrStatus.severity);
        const status = normalize(scanOrStatus.healthStatus || scanOrStatus.status);

        if (hasReviewOrRetakeSignal(scanOrStatus)) return false;

        if (disease) {
            if (HEALTHY_DISEASE_KEYWORDS.some(k => disease.includes(k))) return true;
            if (!UNKNOWN_KEYWORDS.some(k => disease.includes(k))) return false;
        }

        if (severity && UNHEALTHY_SEVERITY_KEYWORDS.some(k => severity.includes(k))) return false;

        if (!status) return false;
        if (UNHEALTHY_STATUS_KEYWORDS.some(keyword => status.includes(keyword))) return false;
        return HEALTHY_KEYWORDS.some(keyword => status.includes(keyword));
    }

    const lowerStatus = normalize(scanOrStatus);
    if (!lowerStatus) return false;
    if (['uncertain', 'possible', 'inconclusive', 'retake'].some(keyword => lowerStatus.includes(keyword))) return false;
    if (UNHEALTHY_STATUS_KEYWORDS.some(keyword => lowerStatus.includes(keyword))) return false;
    return HEALTHY_KEYWORDS.some(keyword => lowerStatus.includes(keyword));
};

/**
 * Standardizes a raw status string into a predefined state.
 * @param {string} rawStatus 
 * @returns {'healthy' | 'unhealthy'}
 */
export const getStandardizedStatus = (rawStatus) => {
    return isHealthy(rawStatus) ? 'healthy' : 'unhealthy';
};

/**
 * Normalizes stored severity strings across languages/legacy values.
 * @param {string} rawSeverity
 * @returns {'mild' | 'moderate' | 'severe' | 'critical' | ''}
 */
export const getStandardizedSeverity = (rawSeverity) => {
    if (!rawSeverity) return '';
    const normalized = String(rawSeverity).trim().toLowerCase();
    return SEVERITY_ALIASES[normalized] || '';
};
