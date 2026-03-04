/**
 * Common utility for handling plant health status across the application.
 * Prevents fragile string-based checks in multiple components.
 */

const HEALTHY_KEYWORDS = [
    'healthy',
    'sihat',
    'tiada masalah',
    '健康',
    '无问题',
    '未检测到问题',
    'normal',
    'tiada penyakit',
    'pokok elok'
];

/**
 * Checks if a scan result indicates a healthy plant.
 * @param {Object|string} scanOrStatus - The scan object or a status string.
 * @returns {boolean}
 */
export const isHealthy = (scanOrStatus) => {
    if (!scanOrStatus) return false;

    const status = typeof scanOrStatus === 'string'
        ? scanOrStatus
        : (scanOrStatus.healthStatus || scanOrStatus.status || '');

    if (!status) return false;

    const lowerStatus = status.toLowerCase();
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
