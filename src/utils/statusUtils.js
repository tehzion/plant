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

        if (severity && UNHEALTHY_SEVERITY_KEYWORDS.some(k => severity.includes(k))) return false;

        if (disease) {
            if (HEALTHY_DISEASE_KEYWORDS.some(k => disease.includes(k))) return true;
            if (!UNKNOWN_KEYWORDS.some(k => disease.includes(k))) return false;
        }

        if (!status) return false;
        return HEALTHY_KEYWORDS.some(keyword => status.includes(keyword));
    }

    const lowerStatus = normalize(scanOrStatus);
    if (!lowerStatus) return false;
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
