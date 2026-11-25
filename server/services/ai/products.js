// Matching store products to a diagnosis, and the consultation fallback.
// Split out of aiService.js; aiService.js re-exports everything for existing callers.
import { assessScanDecision, SCAN_RESULT_STATES, getScanSectionPolicy } from '../../../shared/scanResultPolicy.js';
import { DEFAULT_DISEASE_PRODUCT_RULES, buildDiseaseProductRuleContext, normalizeRuleText } from '../../data/diseaseProductRules.js';
import { normalizeArray, normalizeScanStateText, translateText } from './shared.js';

/**
 * Deterministic product recommendation helpers
 * Match diagnosis keywords to available WooCommerce tags & categories without
 * sending catalog data to a second AI call.
 * @param {Object} diagnosisInfo - { disease, healthStatus, pathogenType, plantType, symptoms, treatments }
 * @param {Array} availableTags - Array of { id, name } from WooCommerce
 * @param {Array} availableCategories - Array of { id, name } from WooCommerce
 * @returns {Promise<Object>} { treatmentTagIds, treatmentCategoryIds, nutritionTagIds, nutritionCategoryIds, reasoning }
 */
const normalizeRecommendedCatalogIds = (ids, validIds) => {
    if (!Array.isArray(ids)) return [];

    const unique = new Set();
    ids.forEach((value) => {
        const numeric = Number.parseInt(value, 10);
        if (Number.isInteger(numeric) && validIds.has(numeric)) {
            unique.add(numeric);
        }
    });

    return [...unique];
};
export const validateProductRecommendationSelection = (recommendation = {}, availableTags = [], availableCategories = []) => {
    const validTagIds = new Set((availableTags || []).map((tag) => Number(tag.id)).filter(Number.isInteger));
    const validCategoryIds = new Set((availableCategories || []).map((category) => Number(category.id)).filter(Number.isInteger));

    return {
        treatmentTagIds: normalizeRecommendedCatalogIds(recommendation.treatmentTagIds, validTagIds),
        treatmentCategoryIds: normalizeRecommendedCatalogIds(recommendation.treatmentCategoryIds, validCategoryIds),
        fertilizerTagIds: normalizeRecommendedCatalogIds(recommendation.fertilizerTagIds, validTagIds),
        fertilizerCategoryIds: normalizeRecommendedCatalogIds(recommendation.fertilizerCategoryIds, validCategoryIds),
        supplementTagIds: normalizeRecommendedCatalogIds(recommendation.supplementTagIds, validTagIds),
        supplementCategoryIds: normalizeRecommendedCatalogIds(recommendation.supplementCategoryIds, validCategoryIds),
        reasoning: recommendation.reasoning || '',
    };
};
const normalizeCacheFragment = (value, fallback = 'none') => {
    const normalized = String(value ?? fallback)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._-]/g, '')
        .slice(0, 120);
    return normalized || fallback;
};
const normalizeCacheNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? String(Math.round(number)) : 'unknown';
};
export const buildProductRecommendationCacheKey = (diagnosisInfo = {}, language = 'en') => {
    const safeLanguage = language === 'ms' ? 'ms' : language === 'zh' ? 'zh' : 'en';
    const diagnosticEvidence = diagnosisInfo.diagnosticEvidence && typeof diagnosisInfo.diagnosticEvidence === 'object'
        ? diagnosisInfo.diagnosticEvidence
        : {};
    const safeSearchTags = Array.isArray(diagnosisInfo.productSearchTags)
        ? diagnosisInfo.productSearchTags.map((tag) => normalizeCacheFragment(tag)).filter(Boolean).join('-')
        : normalizeCacheFragment(diagnosisInfo.productSearchTags, 'no-tags');

    return [
        'rec',
        safeLanguage,
        normalizeCacheFragment(diagnosisInfo.plantType, 'unknown'),
        normalizeCacheFragment(diagnosisInfo.disease, 'none'),
        normalizeCacheFragment(diagnosisInfo.healthStatus, 'unknown'),
        normalizeCacheFragment(diagnosisInfo.pathogenType, 'none'),
        normalizeCacheFragment(diagnosisInfo.status, 'unknown'),
        normalizeCacheFragment(diagnosisInfo.resultState, 'unknown-state'),
        normalizeCacheFragment(diagnosisInfo.diseaseCategory, 'unknown'),
        normalizeCacheNumber(diagnosisInfo.confidence),
        normalizeCacheNumber(diagnosisInfo.diagnosisConfidence),
        diagnosisInfo.needsMoreEvidence ? 'needs-evidence' : 'evidence-ok',
        diagnosisInfo.requiresRetake ? 'retake' : 'no-retake',
        normalizeCacheFragment(diagnosisInfo.nutritionalStatus, 'none'),
        normalizeCacheFragment(diagnosticEvidence.likelyCauseCategory, 'unknown'),
        safeSearchTags || 'no-tags',
    ].join('_');
};
export const PRODUCT_RECOMMENDATION_INTENTS = Object.freeze({
    TREATMENT_READY: 'treatment_ready',
    HEALTHY_MAINTENANCE: 'healthy_maintenance',
    SUPPORT_ONLY: 'support_only',
    CONSULTATION_NEEDED: 'consultation_needed',
});
export const APP_CONSULTATION_WHATSAPP = '+60146193328';
const PRODUCT_RECOMMENDATION_STOPWORDS = new Set([
    'a',
    'an',
    'and',
    'apply',
    'are',
    'before',
    'for',
    'from',
    'in',
    'of',
    'on',
    'or',
    'plant',
    'plants',
    'the',
    'to',
    'use',
    'with',
    'yang',
    'dan',
    'untuk',
    'pada',
    'dengan',
    'atau',
]);
const normalizeRecommendationText = (value = '') => String(value ?? '')
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const pushWeightedTerm = (terms, value, weight = 8) => {
    const normalized = normalizeRecommendationText(value);
    if (!normalized) return;

    const addTerm = (term, termWeight) => {
        if (!term || term.length < 3 || PRODUCT_RECOMMENDATION_STOPWORDS.has(term)) return;
        const existing = terms.get(term) || 0;
        terms.set(term, Math.max(existing, termWeight));
    };

    addTerm(normalized, weight);
    normalized
        .split(' ')
        .filter((word) => word.length >= 4 && !PRODUCT_RECOMMENDATION_STOPWORDS.has(word))
        .forEach((word) => addTerm(word, Math.max(4, Math.round(weight * 0.72))));
};
const CONTROLLED_RECOMMENDATION_SYNONYMS = Object.freeze({
    aphid: ['plant lice', 'plant louse'],
    'plant lice': ['aphid'],
    'plant louse': ['aphid'],
    mealybug: ['mealy bug'],
    'mealy bug': ['mealybug'],
    fungal: ['fungus', 'fungicide'],
    fungus: ['fungal', 'fungicide'],
    fungicide: ['fungal', 'fungus'],
    pest: ['insect', 'pest control'],
    insect: ['pest', 'pest control'],
    'nutrient deficiency': ['deficiency', 'plant nutrition'],
    deficiency: ['nutrient deficiency', 'plant nutrition'],
    fertilizer: ['plant nutrition'],
    'plant nutrition': ['fertilizer'],
    chilli: ['chili', 'cili'],
    chili: ['chilli', 'cili'],
    cili: ['chilli', 'chili'],
    leafspot: ['leaf spot'],
    'leaf spot': ['leafspot'],
});
const expandControlledRecommendationTerms = (terms = [], recommendationRole = 'treatment') => {
    const expanded = new Map();
    const add = (term, weight) => {
        const normalized = normalizeRecommendationText(term);
        if (!normalized || normalized.length < 3 || PRODUCT_RECOMMENDATION_STOPWORDS.has(normalized)) return;
        expanded.set(normalized, Math.max(expanded.get(normalized) || 0, weight));
    };

    terms.forEach(({ term, weight }) => {
        add(term, weight);
        const aliases = CONTROLLED_RECOMMENDATION_SYNONYMS[normalizeRecommendationText(term)] || [];
        aliases.forEach((alias) => {
            // Keep disease-control aliases out of nutrition sections. A nutrient
            // product must never be surfaced as a treatment through a synonym.
            if ((recommendationRole === 'fertilizer' || recommendationRole === 'supplement')
                && ['fungicide', 'fungal', 'fungus', 'pest', 'insect', 'pest control'].includes(normalizeRecommendationText(alias))) return;
            if (recommendationRole === 'treatment'
                && ['fertilizer', 'plant nutrition'].includes(normalizeRecommendationText(alias))) return;
            add(alias, Math.max(4, Math.round(Number(weight || 0) * 0.88)));
        });
    });

    return [...expanded.entries()]
        .map(([term, weight]) => ({ term, weight }))
        .sort((left, right) => right.weight - left.weight || left.term.localeCompare(right.term));
};
const getDiagnosisConfidenceValue = (diagnosisInfo = {}) => {
    const primary = Number(diagnosisInfo.diagnosisConfidence);
    if (Number.isFinite(primary)) return primary;
    const fallback = Number(diagnosisInfo.confidence);
    return Number.isFinite(fallback) ? fallback : null;
};
export const isHealthyProductDiagnosis = (diagnosisInfo = {}) => {
    return assessScanDecision(diagnosisInfo).healthy;
};
export const isWeakProductDiagnosis = (diagnosisInfo = {}) => {
    if (assessScanDecision(diagnosisInfo).needsReview) return true;
    const resultState = normalizeScanStateText(diagnosisInfo.resultState);
    const status = normalizeRecommendationText(diagnosisInfo.status);
    const confidence = getDiagnosisConfidenceValue(diagnosisInfo);

    if ([
        SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO,
        SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE,
        SCAN_RESULT_STATES.POSSIBLE_PEST,
        SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED,
    ].includes(resultState)) {
        return true;
    }

    if (diagnosisInfo.requiresRetake || diagnosisInfo.needsMoreEvidence || diagnosisInfo.abstainReason) {
        return true;
    }

    if (['uncertain', 'retake required', 'retake_required', 'possible', 'inconclusive'].includes(status)) {
        return true;
    }

    return confidence !== null && confidence < 70;
};
export const canRecommendTreatmentProducts = (diagnosisInfo = {}) => assessScanDecision(diagnosisInfo).treatmentEligible;
export const getProductRecommendationIntent = (diagnosisInfo = {}, counts = {}) => {
    if (isHealthyProductDiagnosis(diagnosisInfo)) {
        return PRODUCT_RECOMMENDATION_INTENTS.HEALTHY_MAINTENANCE;
    }

    if (isWeakProductDiagnosis(diagnosisInfo)) {
        return PRODUCT_RECOMMENDATION_INTENTS.SUPPORT_ONLY;
    }

    if (canRecommendTreatmentProducts(diagnosisInfo) && Number(counts.treatmentCount || 0) > 0) {
        return PRODUCT_RECOMMENDATION_INTENTS.TREATMENT_READY;
    }

    return PRODUCT_RECOMMENDATION_INTENTS.CONSULTATION_NEEDED;
};
const getProductSearchTerms = (diagnosisInfo = {}, recommendationRole = 'treatment', diseaseProductRules = DEFAULT_DISEASE_PRODUCT_RULES) => {
    const weighted = new Map();
    const curatedContext = buildDiseaseProductRuleContext(diagnosisInfo, recommendationRole, diseaseProductRules);

    pushWeightedTerm(weighted, diagnosisInfo.disease, recommendationRole === 'treatment' ? 22 : 10);
    pushWeightedTerm(weighted, diagnosisInfo.primaryScientificName, recommendationRole === 'treatment' ? 18 : 6);
    pushWeightedTerm(weighted, diagnosisInfo.pathogenType, recommendationRole === 'treatment' ? 18 : 7);
    pushWeightedTerm(weighted, diagnosisInfo.diseaseCategory, recommendationRole === 'treatment' ? 18 : 7);
    curatedContext.productTags.forEach((tag) => pushWeightedTerm(weighted, tag, recommendationRole === 'treatment' ? 34 : 22));
    curatedContext.activeIngredients.forEach((ingredient) => pushWeightedTerm(weighted, ingredient, recommendationRole === 'treatment' ? 30 : 18));
    curatedContext.matchTerms.forEach((term) => pushWeightedTerm(weighted, term, recommendationRole === 'treatment' ? 24 : 14));
    normalizeArray(diagnosisInfo.productSearchTags).forEach((tag) => pushWeightedTerm(weighted, tag, 30));
    normalizeArray(diagnosisInfo.treatments).forEach((item) => pushWeightedTerm(weighted, item, recommendationRole === 'treatment' ? 16 : 8));
    normalizeArray(diagnosisInfo.immediateActions).forEach((item) => pushWeightedTerm(weighted, item, 10));
    normalizeArray(diagnosisInfo.symptoms).forEach((item) => pushWeightedTerm(weighted, item, 8));
    normalizeArray(diagnosisInfo.prevention).forEach((item) => pushWeightedTerm(weighted, item, 6));

    const evidence = diagnosisInfo.diagnosticEvidence && typeof diagnosisInfo.diagnosticEvidence === 'object'
        ? diagnosisInfo.diagnosticEvidence
        : {};
    pushWeightedTerm(weighted, evidence.likelyCauseCategory, 12);
    normalizeArray(evidence.evidenceFor).forEach((item) => pushWeightedTerm(weighted, item, 9));

    if (recommendationRole === 'fertilizer' || recommendationRole === 'supplement') {
        pushWeightedTerm(weighted, diagnosisInfo.nutritionalStatus, 12);
        normalizeArray(diagnosisInfo.nutritionalIssues?.deficientNutrients).forEach((item) => (
            pushWeightedTerm(weighted, item?.nutrient || item?.name || item, 18)
        ));

        const maintenanceTerms = recommendationRole === 'fertilizer'
            ? ['fertilizer', 'NPK', 'compost', 'plant nutrition']
            : ['supplement', 'trace elements', 'seaweed', 'humic', 'booster'];
        maintenanceTerms.forEach((term) => pushWeightedTerm(weighted, term, isHealthyProductDiagnosis(diagnosisInfo) ? 24 : 10));
    }

    return [...weighted.entries()]
        .map(([term, weight]) => ({ term, weight }))
        .sort((left, right) => right.weight - left.weight);
};
export const extractProductRecommendationKeywords = (
    diagnosisInfo = {},
    recommendationRole = 'treatment',
    diseaseProductRules = DEFAULT_DISEASE_PRODUCT_RULES,
) => expandControlledRecommendationTerms(
    getProductSearchTerms(diagnosisInfo, recommendationRole, diseaseProductRules),
    recommendationRole,
).map(({ term }) => term).slice(0, 12);
const findCatalogMatchesForTerms = (catalog = [], terms = [], maxCount = 4) => {
    const normalizedTerms = normalizeArray(terms)
        .map((term) => normalizeRuleText(term))
        .filter((term) => term.length >= 3)
        .filter((term, index, all) => all.indexOf(term) === index);

    if (normalizedTerms.length === 0) return [];

    return (Array.isArray(catalog) ? catalog : [])
        .map((item) => {
            const name = normalizeRuleText(item?.name);
            const id = Number.parseInt(item?.id, 10);
            if (!name || !Number.isInteger(id)) return null;

            let score = 0;
            const matchedTerms = [];
            normalizedTerms.forEach((term) => {
                if (name === term) {
                    score += 8;
                    matchedTerms.push(term);
                } else if (name.includes(term)) {
                    score += 5;
                    matchedTerms.push(term);
                } else if (term.includes(name) && name.length >= 4) {
                    score += 3;
                    matchedTerms.push(term);
                }
            });

            return score > 0 ? { id, name: item.name, score, matchedTerms } : null;
        })
        .filter(Boolean)
        .sort((left, right) => right.score - left.score || left.id - right.id)
        .slice(0, maxCount);
};
const findCatalogIdsForCuratedTerms = (catalog = [], terms = [], maxCount = 4) => (
    findCatalogMatchesForTerms(catalog, terms, maxCount).map((item) => item.id)
);
const mergeCatalogIds = (existing = [], curated = [], maxCount = 4) => {
    const merged = [];
    [...curated, ...existing].forEach((id) => {
        const numeric = Number.parseInt(id, 10);
        if (!Number.isInteger(numeric) || merged.includes(numeric)) return;
        merged.push(numeric);
    });
    return merged.slice(0, maxCount);
};
const getUniqueCuratedRules = (contexts = []) => {
    const seen = new Set();
    return contexts
        .flatMap((context) => context.rules || [])
        .filter((rule) => {
            if (!rule?.id || seen.has(rule.id)) return false;
            seen.add(rule.id);
            return true;
        });
};
export const applyCuratedProductRulesToRecommendation = (
    recommendation = {},
    availableTags = [],
    availableCategories = [],
    diagnosisInfo = {},
    diseaseProductRules = DEFAULT_DISEASE_PRODUCT_RULES,
) => {
    const output = validateProductRecommendationSelection(recommendation, availableTags, availableCategories);
    const sectionPolicy = getScanSectionPolicy(diagnosisInfo);
    const contexts = [];
    const roleConfigs = [
        {
            role: 'treatment',
            tagField: 'treatmentTagIds',
            categoryField: 'treatmentCategoryIds',
            tagLimit: 4,
            categoryLimit: 2,
            allowed: sectionPolicy.showDiseaseProducts,
        },
        {
            role: 'fertilizer',
            tagField: 'fertilizerTagIds',
            categoryField: 'fertilizerCategoryIds',
            tagLimit: 3,
            categoryLimit: 2,
            allowed: sectionPolicy.showNutritionProducts,
        },
        {
            role: 'supplement',
            tagField: 'supplementTagIds',
            categoryField: 'supplementCategoryIds',
            tagLimit: 3,
            categoryLimit: 2,
            allowed: sectionPolicy.showNutritionProducts,
        },
    ];

    roleConfigs.forEach((config) => {
        if (!config.allowed) {
            output[config.tagField] = [];
            output[config.categoryField] = [];
            return;
        }

        const context = buildDiseaseProductRuleContext(diagnosisInfo, config.role, diseaseProductRules);
        if (!context.matched) return;

        contexts.push(context);
        const catalogTerms = [
            ...context.productTags,
            ...context.activeIngredients,
            ...context.matchTerms,
        ];

        output[config.tagField] = mergeCatalogIds(
            output[config.tagField],
            findCatalogIdsForCuratedTerms(availableTags, catalogTerms, config.tagLimit),
            config.tagLimit,
        );
        output[config.categoryField] = mergeCatalogIds(
            output[config.categoryField],
            findCatalogIdsForCuratedTerms(availableCategories, catalogTerms, config.categoryLimit),
            config.categoryLimit,
        );
    });

    const curatedRules = getUniqueCuratedRules(contexts);
    if (curatedRules.length > 0) {
        const ruleNames = curatedRules.map((rule) => rule.displayName).slice(0, 2).join(', ');
        output.reasoning = [
            output.reasoning,
            `Curated crop-disease rule applied: ${ruleNames}.`,
        ].filter(Boolean).join(' ');
    }

    return {
        ...output,
        curatedRules,
    };
};
const PRODUCT_RECOMMENDATION_ROLE_CONFIGS = Object.freeze([
    {
        role: 'treatment',
        tagField: 'treatmentTagIds',
        categoryField: 'treatmentCategoryIds',
        tagLimit: 4,
        categoryLimit: 2,
        allowed: 'showDiseaseProducts',
    },
    {
        role: 'fertilizer',
        tagField: 'fertilizerTagIds',
        categoryField: 'fertilizerCategoryIds',
        tagLimit: 3,
        categoryLimit: 2,
        allowed: 'showNutritionProducts',
    },
    {
        role: 'supplement',
        tagField: 'supplementTagIds',
        categoryField: 'supplementCategoryIds',
        tagLimit: 3,
        categoryLimit: 2,
        allowed: 'showNutritionProducts',
    },
]);
export const buildKeywordProductRecommendation = (
    diagnosisInfo = {},
    availableTags = [],
    availableCategories = [],
    language = 'en',
    diseaseProductRules = DEFAULT_DISEASE_PRODUCT_RULES,
) => {
    const sectionPolicy = getScanSectionPolicy(diagnosisInfo);
    const baseRecommendation = {
        treatmentTagIds: [],
        treatmentCategoryIds: [],
        fertilizerTagIds: [],
        fertilizerCategoryIds: [],
        supplementTagIds: [],
        supplementCategoryIds: [],
        reasoning: '',
    };
    const keywordMap = {};
    const matchedCatalog = [];

    PRODUCT_RECOMMENDATION_ROLE_CONFIGS.forEach((config) => {
        const treatmentEvidenceAllowsProducts = config.role !== 'treatment' || canRecommendTreatmentProducts(diagnosisInfo);
        if (!sectionPolicy[config.allowed] || !treatmentEvidenceAllowsProducts) {
            keywordMap[config.role] = [];
            return;
        }

        const terms = expandControlledRecommendationTerms(
            getProductSearchTerms(diagnosisInfo, config.role, diseaseProductRules),
            config.role,
        );
        const keywords = terms.map(({ term }) => term).slice(0, 12);
        keywordMap[config.role] = keywords;

        const tagMatches = findCatalogMatchesForTerms(availableTags, keywords, config.tagLimit);
        const categoryMatches = findCatalogMatchesForTerms(availableCategories, keywords, config.categoryLimit);
        baseRecommendation[config.tagField] = tagMatches.map((item) => item.id);
        baseRecommendation[config.categoryField] = categoryMatches.map((item) => item.id);

        tagMatches.forEach((item) => matchedCatalog.push(`tag "${item.name}"`));
        categoryMatches.forEach((item) => matchedCatalog.push(`category "${item.name}"`));
    });

    const curatedRecommendation = applyCuratedProductRulesToRecommendation(
        baseRecommendation,
        availableTags,
        availableCategories,
        diagnosisInfo,
        diseaseProductRules,
    );
    const matchedKeywords = [...new Set(Object.values(keywordMap).flat())].slice(0, 8);
    const catalogReason = matchedCatalog.length > 0
        ? `Matched WooCommerce ${matchedCatalog.slice(0, 4).join(', ')} using ${matchedKeywords.slice(0, 4).join(', ')}.`
        : `No direct WooCommerce tag or category match was found for ${matchedKeywords.slice(0, 4).join(', ') || 'this scan'}.`;

    return {
        ...curatedRecommendation,
        keywords: keywordMap,
        searchTerms: keywordMap,
        reasoning: [catalogReason, curatedRecommendation.reasoning]
            .filter(Boolean)
            .join(' '),
        language: language === 'ms' || language === 'zh' ? language : 'en',
    };
};
const PRODUCT_MATCH_FIELD_WEIGHTS = Object.freeze({
    tags: 40,
    categories: 25,
    name: 20,
    description: 15,
});
const normalizeProductFieldValues = (value) => normalizeArray(value)
    .map((item) => (typeof item === 'object' ? item.name : item))
    .map((item) => normalizeRecommendationText(item))
    .filter(Boolean);
const productFieldContainsTerm = (fieldValue, term) => {
    const normalizedField = normalizeRecommendationText(fieldValue);
    const normalizedTerm = normalizeRecommendationText(term);
    if (!normalizedField || !normalizedTerm) return false;
    return ` ${normalizedField} `.includes(` ${normalizedTerm} `);
};
export const scoreProductMatch = (product = {}, diagnosisInfo = {}, recommendationRole = 'treatment', diseaseProductRules = DEFAULT_DISEASE_PRODUCT_RULES) => {
    const terms = expandControlledRecommendationTerms(
        getProductSearchTerms(diagnosisInfo, recommendationRole, diseaseProductRules),
        recommendationRole,
    );
    const curatedContext = buildDiseaseProductRuleContext(diagnosisInfo, recommendationRole, diseaseProductRules);
    const fields = {
        tags: normalizeProductFieldValues(product.tags),
        categories: normalizeProductFieldValues(product.categories),
        name: normalizeProductFieldValues(product.name),
        description: normalizeProductFieldValues(product.description),
    };
    const matchedFields = Object.fromEntries(Object.entries(fields).map(([field, values]) => [
        field,
        terms
            .filter(({ term }) => values.some((value) => productFieldContainsTerm(value, term)))
            .map(({ term }) => term)
            .filter((term, index, all) => all.indexOf(term) === index)
            .slice(0, 6),
    ]));
    const matchedTerms = Object.values(matchedFields).flat().filter((term, index, all) => all.indexOf(term) === index);
    const matchScore = Math.max(0, Math.min(100, Object.entries(matchedFields).reduce(
        (total, [field, matches]) => total + (matches.length > 0 ? PRODUCT_MATCH_FIELD_WEIGHTS[field] : 0),
        0,
    )));
    const searchable = Object.values(fields).flat().join(' ');
    const matchedActiveIngredients = curatedContext.activeIngredients
        .filter((ingredient) => productFieldContainsTerm(searchable, ingredient));
    const uniqueMatchedTerms = matchedTerms.slice(0, 6);
    const matchedFieldSummary = Object.entries(matchedFields)
        .filter(([, matches]) => matches.length > 0)
        .map(([field, matches]) => `${field}: ${matches.slice(0, 2).join(', ')}`)
        .join('; ');
    const matchReason = curatedContext.matched
        ? `Curated ${curatedContext.primaryRule.displayName} rule matched ${matchedFieldSummary || uniqueMatchedTerms.slice(0, 3).join(', ') || curatedContext.productTags.slice(0, 2).join(', ')}.`
        : uniqueMatchedTerms.length > 0
            ? `Matched ${matchedFieldSummary || uniqueMatchedTerms.slice(0, 3).join(', ')} from the scan result.`
            : 'No meaningful keyword match was found in the product metadata.';

    return {
        matchScore,
        matchedTerms: uniqueMatchedTerms,
        matchedFields,
        matchReason,
        curatedRuleId: curatedContext.primaryRule?.id || '',
        curatedRuleName: curatedContext.primaryRule?.displayName || '',
        activeIngredients: recommendationRole === 'treatment' || recommendationRole === 'fertilizer' || recommendationRole === 'supplement'
            ? curatedContext.activeIngredients.slice(0, 4)
            : [],
        matchedActiveIngredients: matchedActiveIngredients.slice(0, 4),
        cautionNote: curatedContext.cautionNotes[0] || '',
    };
};
export const getProductCautionLevel = (diagnosisInfo = {}, recommendationRole = 'treatment') => {
    if (recommendationRole !== 'treatment') return 'maintenance';
    if (!canRecommendTreatmentProducts(diagnosisInfo)) return 'consult_first';

    const status = normalizeRecommendationText(diagnosisInfo.status);
    const confidence = getDiagnosisConfidenceValue(diagnosisInfo);
    if (status === 'confirmed' && confidence !== null && confidence >= 85) return 'standard';
    return 'confirm_before_use';
};
export const enrichRecommendedProducts = (products = [], diagnosisInfo = {}, recommendationRole = 'treatment', diseaseProductRules = DEFAULT_DISEASE_PRODUCT_RULES) => (
    (Array.isArray(products) ? products : []).map((product) => {
        const match = scoreProductMatch(product, diagnosisInfo, recommendationRole, diseaseProductRules);
        return {
            ...product,
            ...match,
            recommendationRole,
            cautionLevel: getProductCautionLevel(diagnosisInfo, recommendationRole),
        };
    }).filter((product) => Number(product.matchScore || 0) >= 20)
        .sort((left, right) => Number(right.matchScore || 0) - Number(left.matchScore || 0))
);
const getConsultationReason = (intent, language = 'en') => {
    if (intent === PRODUCT_RECOMMENDATION_INTENTS.SUPPORT_ONLY) {
        return translateText(language, {
            en: 'The scan needs stronger field evidence before choosing treatment products.',
            ms: 'Imbasan ini memerlukan bukti lapangan yang lebih kukuh sebelum memilih produk rawatan.',
            zh: '在选择治疗产品前，此扫描需要更明确的现场证据。',
        });
    }

    if (intent === PRODUCT_RECOMMENDATION_INTENTS.CONSULTATION_NEEDED) {
        return translateText(language, {
            en: 'No safe disease-specific product match was found in the live catalog.',
            ms: 'Tiada padanan produk khusus penyakit yang selamat ditemui dalam katalog langsung.',
            zh: '实时目录中没有找到安全的病害专用产品匹配。',
        });
    }

    return translateText(language, {
        en: 'Send the scan details to our agronomy team before applying treatment.',
        ms: 'Hantar butiran imbasan kepada pasukan agronomi kami sebelum membuat rawatan.',
        zh: '用药前可将扫描详情发送给我们的农艺团队确认。',
    });
};
export const buildProductConsultation = (diagnosisInfo = {}, intent = PRODUCT_RECOMMENDATION_INTENTS.CONSULTATION_NEEDED, language = 'en') => {
    const scanId = diagnosisInfo.scanId || diagnosisInfo.id || 'not recorded';
    const plant = diagnosisInfo.plantType || 'Unknown crop';
    const disease = diagnosisInfo.disease || 'Unknown issue';
    const confidence = getDiagnosisConfidenceValue(diagnosisInfo);
    const severity = diagnosisInfo.severity || diagnosisInfo.status || 'not recorded';
    const location = diagnosisInfo.locationName || diagnosisInfo.location_name || '';
    const symptoms = normalizeArray(diagnosisInfo.symptoms).slice(0, 3).join(', ');
    const phoneDigits = APP_CONSULTATION_WHATSAPP.replace(/\D/g, '');
    const message = [
        'Hi MojoSense team, I need consultation for this plant scan.',
        `Scan ID: ${scanId}`,
        `Crop/plant: ${plant}`,
        `Disease/issue: ${disease}`,
        confidence !== null ? `Confidence: ${Math.round(confidence)}%` : '',
        `Severity/status: ${severity}`,
        location ? `Location: ${location}` : '',
        symptoms ? `Symptoms: ${symptoms}` : '',
    ].filter(Boolean).join('\n');

    return {
        phone: APP_CONSULTATION_WHATSAPP,
        url: `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`,
        message,
        label: translateText(language, {
            en: 'Contact us for consultation',
            ms: 'Hubungi kami untuk konsultasi',
            zh: '联系我们咨询',
        }),
        priority: [
            PRODUCT_RECOMMENDATION_INTENTS.SUPPORT_ONLY,
            PRODUCT_RECOMMENDATION_INTENTS.CONSULTATION_NEEDED,
        ].includes(intent) ? 'primary' : 'secondary',
        reason: getConsultationReason(intent, language),
    };
};
