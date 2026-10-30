import { MALAYSIA_CROP_KNOWLEDGE } from '../data/crops.js';
import { normalizeConditionCategory } from '../../shared/diseaseAssessment.js';

// Basic suitability checks applied after keyword matching. A product is only
// presented as a treatment when its stated purpose fits the identified
// problem, nothing in its listing rules out the crop, no restriction is found
// and the listing carries enough label information to check. Everything else
// is either moved to catalogue discovery or dropped. These are catalogue
// heuristics, not a substitute for the registered product label.

export const ELIGIBILITY_STATUS = Object.freeze({
    ELIGIBLE: 'eligible',
    NEEDS_VERIFICATION: 'needs_verification',
    NOT_SUITABLE: 'not_suitable',
});

const PURPOSE_PATTERNS = {
    herbicide: /herbicide|weedkiller|weed killer|racun rumpai|glyphosate|paraquat|glufosinate|除草/i,
    fungicide: /fungicide|racun kulat|antifungal|mancozeb|chlorothalonil|copper|tembaga|azoxystrobin|difenoconazole|propiconazole|metalaxyl|phosphite|sulphur|sulfur|carbendazim|hexaconazole|杀菌|真菌/i,
    bactericide: /bactericide|antibacterial|racun bakteria|copper|tembaga|streptomycin|kasugamycin|杀细菌/i,
    insecticide: /insecticide|pesticide|racun serangga|racun perosak|miticide|acaricide|abamectin|imidacloprid|cypermethrin|emamectin|chlorantraniliprole|neem|mineral oil|horticultural oil|spinosad|杀虫|杀螨/i,
    fertilizer: /fertili[sz]er|baja|npk|compost|kompos|urea|potash|organic manure|foliar|nutrient|nutrien|trace element|unsur surih|humic|seaweed|calcium|magnesium|boron|肥/i,
};

const REQUIRED_PURPOSE = {
    fungal_disease: ['fungicide'],
    bacterial_disease: ['bactericide'],
    pest_damage: ['insecticide'],
    nutrient_deficiency: ['fertilizer'],
};

const RESTRICTION_PATTERNS = [
    /\brestricted\b|terhad penggunaan|banned|dilarang|prohibited/i,
    /not for (?:use on )?(?:food|edible|vegetable|fruit) crops|bukan untuk tanaman makanan/i,
    /(?:turf|lawn|ornamental|non-crop|industrial) use only|untuk rumput sahaja|hanya untuk tanaman hiasan/i,
    /professional use only|licensed applicators? only/i,
];

const GENERAL_CROP_PATTERN = /all crops|semua tanaman|pelbagai tanaman|various crops|wide range of crops|general purpose|most crops|多种作物|所有作物/i;

const CROP_ALIASES = (() => {
    const extra = {
        durian: ['durian'], banana: ['banana', 'pisang'], papaya: ['papaya', 'betik'], mango: ['mango', 'mangga'],
        chilli: ['chilli', 'chili', 'cili'], tomato: ['tomato'], rice: ['rice', 'padi', 'paddy'], oil_palm: ['oil palm', 'kelapa sawit', 'sawit'],
        coconut: ['coconut', 'kelapa'], cocoa: ['cocoa', 'koko'], rubber: ['rubber', 'getah'], pineapple: ['pineapple', 'nanas'],
        cucumber: ['cucumber', 'timun'], corn: ['corn', 'maize', 'jagung'], citrus: ['citrus', 'limau', 'orange'],
        vegetables: ['vegetable', 'sayur'],
    };
    for (const name of Object.keys(MALAYSIA_CROP_KNOWLEDGE || {})) {
        const key = name.toLowerCase().replace(/\s+/g, '_');
        if (!extra[key]) extra[key] = [name.toLowerCase()];
    }
    return extra;
})();

const productText = (product = {}) => [
    product.name, product.description,
    ...(Array.isArray(product.tags) ? product.tags : []),
    ...(Array.isArray(product.categories) ? product.categories : []),
].filter(Boolean).join(' ').toLowerCase();

const wordMatch = (text, alias) => new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`, 'i').test(text);

const cropsMentioned = (text) => Object.entries(CROP_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => wordMatch(text, alias)))
    .map(([crop]) => crop);

const diagnosisCrops = (diagnosis = {}) => {
    const text = [diagnosis.plantType, diagnosis.category, diagnosis.cropType].filter(Boolean).join(' ').toLowerCase();
    return cropsMentioned(text);
};

const purposesOf = (text) => Object.entries(PURPOSE_PATTERNS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([purpose]) => purpose);

const checkCrop = (text, diagnosis) => {
    const target = diagnosisCrops(diagnosis);
    const mentioned = cropsMentioned(text).filter((crop) => crop !== 'vegetables');
    if (GENERAL_CROP_PATTERN.test(text)) return 'compatible';
    if (!mentioned.length) return 'not_stated';
    if (!target.length) return 'not_stated';
    return target.some((crop) => mentioned.includes(crop)) ? 'compatible' : 'incompatible';
};

const checkPurpose = (purposes, role, category) => {
    if (purposes.includes('herbicide')) return 'conflict';
    if (role === 'fertilizer' || role === 'supplement') {
        if (purposes.some((purpose) => ['fungicide', 'bactericide', 'insecticide'].includes(purpose)) && !purposes.includes('fertilizer')) return 'conflict';
        return purposes.includes('fertilizer') ? 'match' : 'unknown';
    }
    const required = REQUIRED_PURPOSE[category];
    if (!required) return category === 'viral_disease' || category === 'environmental_stress' ? 'conflict' : 'unknown';
    if (purposes.some((purpose) => required.includes(purpose))) return 'match';
    const pesticidal = purposes.filter((purpose) => ['fungicide', 'bactericide', 'insecticide'].includes(purpose));
    return pesticidal.length ? 'conflict' : 'unknown';
};

/**
 * @returns {{ status, checks: { purpose, crop, restriction, labelInfo }, reasons: string[] }}
 */
export const evaluateProductEligibility = (product = {}, diagnosis = {}, role = 'treatment', match = {}) => {
    const text = productText(product);
    const category = normalizeConditionCategory(
        diagnosis.structuredCategory || diagnosis.diseaseCategory || diagnosis.pathogenType,
        diagnosis.disease,
    );
    const purposes = purposesOf(text);
    const purpose = checkPurpose(purposes, role, category);
    const crop = checkCrop(text, diagnosis);
    const restriction = RESTRICTION_PATTERNS.some((pattern) => pattern.test(text)) ? 'restricted' : 'none_found';
    const descriptionLength = String(product.description || '').trim().length;
    const labelInfo = descriptionLength >= 40 || (match.matchedActiveIngredients || []).length > 0 ? 'available' : 'missing';
    const curated = Boolean(match.curatedRuleId) && ((match.matchedActiveIngredients || []).length > 0 || Number(match.matchScore || 0) >= 40);

    const reasons = [];
    if (purpose === 'conflict') reasons.push('purpose_mismatch');
    if (purpose === 'unknown') reasons.push('purpose_not_stated');
    if (crop === 'incompatible') reasons.push('crop_not_listed');
    if (crop === 'not_stated') reasons.push('crop_not_stated');
    if (restriction === 'restricted') reasons.push('restriction_found');
    if (labelInfo === 'missing') reasons.push('label_info_missing');

    let status;
    if (purpose === 'conflict' || crop === 'incompatible' || restriction === 'restricted') {
        status = ELIGIBILITY_STATUS.NOT_SUITABLE;
    } else if (role !== 'treatment') {
        status = purpose === 'match' ? ELIGIBILITY_STATUS.ELIGIBLE : ELIGIBILITY_STATUS.NEEDS_VERIFICATION;
    } else if (purpose === 'match' && labelInfo === 'available' && (crop === 'compatible' || (crop === 'not_stated' && curated))) {
        status = ELIGIBILITY_STATUS.ELIGIBLE;
    } else {
        status = ELIGIBILITY_STATUS.NEEDS_VERIFICATION;
    }
    return { status, checks: { purpose, crop, restriction, labelInfo, curatedRule: curated }, reasons };
};

const REASON_TEXT = {
    purpose: {
        en: (condition) => `Listed for ${condition}`,
        ms: (condition) => `Disenaraikan untuk ${condition}`,
        zh: (condition) => `适用于${condition}`,
    },
    crop: {
        en: (crop) => `mentions ${crop}`,
        ms: (crop) => `menyebut ${crop}`,
        zh: (crop) => `提及${crop}`,
    },
    curated: {
        en: 'matches an expert-curated rule',
        ms: 'sepadan dengan peraturan pakar',
        zh: '符合专家整理的规则',
    },
};

export const buildRecommendationReason = (diagnosis = {}, eligibility = {}, language = 'en') => {
    const lang = ['ms', 'zh'].includes(language) ? language : 'en';
    const condition = String(diagnosis.disease || '').split('(')[0].trim() || 'this problem';
    const parts = [REASON_TEXT.purpose[lang](condition)];
    const crop = String(diagnosis.plantType || '').split('(')[0].trim();
    if (eligibility.checks?.crop === 'compatible' && crop) parts.push(REASON_TEXT.crop[lang](crop));
    if (eligibility.checks?.curatedRule) parts.push(REASON_TEXT.curated[lang]);
    return parts.join(lang === 'zh' ? '，' : '; ');
};

/** Splits matched treatment products into verified recommendations and catalogue discovery. */
export const partitionByEligibility = (products = [], diagnosis = {}, role = 'treatment', language = 'en') => {
    const eligible = [];
    const discovery = [];
    let excluded = 0;
    for (const product of products) {
        const eligibility = evaluateProductEligibility(product, diagnosis, role, product);
        if (eligibility.status === ELIGIBILITY_STATUS.NOT_SUITABLE) { excluded += 1; continue; }
        const enriched = { ...product, eligibility };
        if (eligibility.status === ELIGIBILITY_STATUS.ELIGIBLE) {
            eligible.push({ ...enriched, recommendationReason: buildRecommendationReason(diagnosis, eligibility, language) });
        } else {
            discovery.push({ ...enriched, discoveryOnly: true });
        }
    }
    return { eligible, discovery, excluded };
};
