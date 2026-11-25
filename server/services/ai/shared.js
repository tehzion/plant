// Small text and JSON helpers shared by the AI modules.
// Split out of aiService.js; aiService.js re-exports everything for existing callers.


// Helper to clean JSON string from Markdown
export function cleanJsonString(str) {
    if (!str) return '';
    // Remove markdown code blocks
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '');
    return cleaned.trim();
}
const GENERIC_PRODUCT_TERMS = new Set([
    'chemical',
    'chemicals',
    'kimia',
    'organic',
    'organik',
    'fertilizer',
    'fertilisers',
    'fertiliser',
    'baja',
    'pesticide',
    'racun',
    'fungicide',
    'insecticide',
    'herbicide',
    'product',
    'produk',
    'unknown',
    'tidak diketahui',
    'n/a',
    'na',
    'none',
    'null',
    '-',
]);
export const normalizeLookupText = (value = '') =>
    String(value)
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s/%+-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
const PRODUCT_WORD_BLOCKLIST = new Set([
    'chemical',
    'chemicals',
    'kimia',
    'organic',
    'organik',
    'fertilizer',
    'fertilisers',
    'fertiliser',
    'baja',
    'pesticide',
    'racun',
    'fungicide',
    'insecticide',
    'herbicide',
    'product',
    'produk',
    'unknown',
    'tidak',
    'diketahui',
    'none',
    'null',
    'na',
    'n/a',
]);
export function isGenericProductName(name) {
    const normalized = normalizeLookupText(name);
    if (!normalized) return true;
    if (GENERIC_PRODUCT_TERMS.has(normalized)) return true;

    const words = normalized.split(' ').filter(Boolean);
    return words.length > 0 && words.every((word) => PRODUCT_WORD_BLOCKLIST.has(word));
}
export const translateText = (language, variants) => {
    if (language === 'ms') return variants.ms;
    if (language === 'zh') return variants.zh;
    return variants.en;
};
export const clampConfidence = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.min(100, Math.round(numeric)));
};
export const normalizeArray = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
        return value
            .split(/\r?\n|•|;/g)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};
export const clipText = (value, maxLength = 140) => {
    const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};
export const formatDateForAI = (value) => {
    const timestamp = new Date(value || 0);
    if (!Number.isFinite(timestamp.getTime())) return 'Unknown date';
    return timestamp.toISOString().slice(0, 10);
};
export const normalizeScanStateText = (value = '') => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
