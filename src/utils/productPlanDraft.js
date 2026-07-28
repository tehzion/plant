import { SCAN_RESULT_STATES } from './statusUtils.js';

const DRAFT_FIELDS = [
    'activity_type',
    'chemical_name',
    'chemical_qty',
    'disease_name_observed',
    'scout_severity',
    'inspection_type',
    'inspection_status',
    'expense_category',
    'note',
];

const textOrEmpty = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const normalizeList = (value) => {
    if (Array.isArray(value)) return value.map(textOrEmpty).filter(Boolean);
    if (typeof value === 'string') return value.split(/\r?\n|,|;|•|â€¢/g).map(textOrEmpty).filter(Boolean);
    return [];
};

const sanitizeDraft = (draft = {}) => DRAFT_FIELDS.reduce((output, key) => {
    output[key] = textOrEmpty(draft[key]);
    return output;
}, {});

const getConfidenceLine = (diagnosis = {}) => {
    const confidence = Number(diagnosis.diagnosisConfidence ?? diagnosis.confidence);
    if (!Number.isFinite(confidence)) return '';
    return `Confidence: ${Math.round(confidence <= 1 ? confidence * 100 : confidence)}%`;
};

const severityForForm = (severity = '') => {
    const normalized = textOrEmpty(severity).toLowerCase();
    if (['high', 'severe', 'critical'].includes(normalized)) return 'High';
    if (['moderate', 'medium'].includes(normalized)) return 'Moderate';
    return 'Low';
};

const flattenRecommendations = (products = {}) => [
    ...(Array.isArray(products.diseaseControl) ? products.diseaseControl.map((product) => ({ ...product, sourceRole: 'treatment' })) : []),
    ...(Array.isArray(products.fertilizers) ? products.fertilizers.map((product) => ({ ...product, sourceRole: 'fertilizer' })) : []),
    ...(Array.isArray(products.supplements) ? products.supplements.map((product) => ({ ...product, sourceRole: 'supplement' })) : []),
];

const selectPlanProducts = (products = {}, selectedProductIds = []) => {
    const allProducts = flattenRecommendations(products);
    const selected = new Set(normalizeList(selectedProductIds).map(String));
    if (selected.size === 0) return allProducts;
    return allProducts.filter((product) => selected.has(String(product.id)));
};

const productLine = (product = {}, index) => {
    const name = textOrEmpty(product.name) || `Product ${index + 1}`;
    const role = textOrEmpty(product.recommendationRole || product.sourceRole);
    const score = Number(product.matchScore);
    const scoreText = Number.isFinite(score) && score > 0 ? `, match ${Math.round(score)}%` : '';
    const active = normalizeList(product.matchedActiveIngredients).length
        ? normalizeList(product.matchedActiveIngredients)
        : normalizeList(product.activeIngredients);
    const activeText = active.length ? `, active ingredient: ${active.slice(0, 3).join(', ')}` : '';
    const caution = textOrEmpty(product.cautionLevel || product.cautionNote);
    const cautionText = caution ? `, caution: ${caution}` : '';
    return `${index + 1}. ${name}${role ? ` (${role}` : ''}${role ? ')' : ''}${scoreText}${activeText}${cautionText}`;
};

const getActivityType = (products = [], diagnosis = {}) => {
    if (products.some((product) => ['treatment', 'disease-control'].includes(textOrEmpty(product.recommendationRole || product.sourceRole).toLowerCase()))) {
        return 'spray';
    }
    if (products.some((product) => ['fertilizer', 'supplement'].includes(textOrEmpty(product.recommendationRole || product.sourceRole).toLowerCase()))) {
        return 'fertilize';
    }
    if ([
        SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO,
        SCAN_RESULT_STATES.POSSIBLE_PEST,
        SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE,
        SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED,
    ].includes(textOrEmpty(diagnosis.resultState))) {
        return 'scout';
    }
    return 'inspect';
};

export const buildProductPlanDraftFromRecommendations = ({
    diagnosis = {},
    products = {},
    recommendationIntent = '',
    consultation = {},
    selectedProductIds = [],
} = {}) => {
    const planProducts = selectPlanProducts(products, selectedProductIds);
    const activityType = getActivityType(planProducts, diagnosis);
    const productNames = planProducts.map((product) => textOrEmpty(product.name)).filter(Boolean);
    const disease = textOrEmpty(diagnosis.disease);
    const resultState = textOrEmpty(diagnosis.resultState || diagnosis.status || recommendationIntent);
    const inspectionType = activityType === 'fertilize' ? 'Soil/Nutrient' : 'Pest/Disease';
    const scoutSeverity = severityForForm(diagnosis.severity);
    const consultationPhone = textOrEmpty(consultation.phone);

    const note = [
        'Product plan from scan result',
        `Linked scan: ${textOrEmpty(diagnosis.scanId) || textOrEmpty(diagnosis.id) || 'not recorded'}`,
        `Crop: ${textOrEmpty(diagnosis.plantType) || 'Crop'}`,
        disease ? `Disease/issue: ${disease}` : '',
        resultState ? `Result state: ${resultState}` : '',
        getConfidenceLine(diagnosis),
        recommendationIntent ? `Recommendation intent: ${recommendationIntent}` : '',
        planProducts.length
            ? ['Recommended products:', ...planProducts.map(productLine)].join('\n')
            : 'Recommended products: none selected yet',
        textOrEmpty(products.reasoning) ? `Selection note: ${textOrEmpty(products.reasoning)}` : '',
        consultationPhone ? `Consultation: ${consultationPhone}` : '',
        'Reminder: verify field signs, product registration, physical label rate, PHI, PPE, and crop safety before applying.',
    ].filter(Boolean).join('\n\n');

    return sanitizeDraft({
        activity_type: activityType,
        chemical_name: productNames.slice(0, 3).join(', '),
        chemical_qty: '',
        disease_name_observed: disease && disease.toLowerCase() !== 'none' ? disease : '',
        scout_severity: scoutSeverity,
        inspection_type: inspectionType,
        inspection_status: activityType === 'inspect' ? 'Good' : (scoutSeverity === 'High' ? 'Urgent' : 'Action Required'),
        expense_category: activityType === 'spray' ? 'Pesticide' : activityType === 'fertilize' ? 'Fertilizer' : 'Labor',
        note,
    });
};
