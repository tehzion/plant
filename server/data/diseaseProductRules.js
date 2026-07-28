const DEFAULT_RULE_PRIORITY = 100;

const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value == null || value === '') return [];
    return [value];
};

export const normalizeRuleText = (value = '') => String(value ?? '')
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeRuleArray = (value) => (
    asArray(value)
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
);

const uniqueStrings = (values) => {
    const seen = new Set();
    const result = [];
    values.forEach((value) => {
        const text = String(value ?? '').trim();
        const key = normalizeRuleText(text);
        if (!text || seen.has(key)) return;
        seen.add(key);
        result.push(text);
    });
    return result;
};

export const DEFAULT_DISEASE_PRODUCT_RULES = Object.freeze([
    {
        id: 'fungal_leaf_spot_anthracnose',
        displayName: 'Fungal leaf spot / anthracnose',
        cropAliases: ['durian', 'mango', 'mangga', 'banana', 'pisang', 'papaya', 'betik', 'chilli', 'chili', 'cili'],
        diseaseAliases: ['leaf spot', 'fungal leaf spot', 'anthracnose', 'colletotrichum', 'black spot', 'fruit rot'],
        pathogenTypes: ['fungal', 'fungus'],
        productTags: ['fungicide', 'disease-control', 'leaf-spot', 'anthracnose', 'copper', 'mancozeb', 'chlorothalonil'],
        activeIngredients: ['copper', 'mancozeb', 'chlorothalonil'],
        recommendationRoles: ['treatment'],
        caution: 'Use only crop-registered fungicides, rotate active ingredient groups, and follow the physical label rate before spraying.',
        priority: 10,
    },
    {
        id: 'phytophthora_bud_rot',
        displayName: 'Phytophthora / bud rot',
        cropAliases: ['coconut', 'kelapa', 'durian', 'papaya', 'betik'],
        diseaseAliases: ['bud rot', 'phytophthora', 'root rot', 'stem rot', 'spear rot'],
        pathogenTypes: ['fungal', 'fungus', 'oomycete'],
        productTags: ['fungicide', 'disease-control', 'phytophthora', 'copper', 'phosphite', 'soil-treatment'],
        activeIngredients: ['copper', 'potassium phosphite', 'phosphorous acid'],
        recommendationRoles: ['treatment'],
        caution: 'For bud rot or stem/root rot, remove infected tissue and consult urgently before relying on chemical treatment alone.',
        priority: 20,
    },
    {
        id: 'mealybug_scale_soft_pests',
        displayName: 'Mealybug / scale insect',
        cropAliases: ['papaya', 'betik', 'citrus', 'limau', 'durian', 'chilli', 'chili', 'cili', 'mango', 'mangga'],
        diseaseAliases: ['mealybug', 'mealy bug', 'scale insect', 'soft scale', 'white scale', 'sap sucking pest'],
        pathogenTypes: ['pest', 'insect'],
        productTags: ['pest-control', 'insecticide', 'neem-oil', 'white-oil', 'mineral-oil', 'insecticidal-soap'],
        activeIngredients: ['neem oil', 'mineral oil', 'insecticidal soap'],
        recommendationRoles: ['treatment'],
        caution: 'Confirm live pests under leaves and avoid broad-spectrum sprays during pollinator activity.',
        priority: 30,
    },
    {
        id: 'thrips_mites',
        displayName: 'Thrips / mites',
        cropAliases: ['chilli', 'chili', 'cili', 'mango', 'mangga', 'papaya', 'betik', 'banana', 'pisang'],
        diseaseAliases: ['thrips', 'mite', 'mites', 'spider mite', 'silvering', 'leaf curling pest'],
        pathogenTypes: ['pest', 'insect', 'mite'],
        productTags: ['pest-control', 'insecticide', 'miticide', 'neem-oil', 'abamectin', 'sulfur'],
        activeIngredients: ['neem oil', 'abamectin', 'sulfur'],
        recommendationRoles: ['treatment'],
        caution: 'Check pest presence with a hand lens and rotate modes of action to reduce resistance.',
        priority: 40,
    },
    {
        id: 'rice_blast',
        displayName: 'Rice blast',
        cropAliases: ['padi', 'rice'],
        diseaseAliases: ['blast', 'rice blast', 'neck blast', 'leaf blast', 'pyricularia'],
        pathogenTypes: ['fungal', 'fungus'],
        productTags: ['fungicide', 'disease-control', 'rice-blast', 'blast', 'tricyclazole', 'azoxystrobin'],
        activeIngredients: ['tricyclazole', 'azoxystrobin', 'isoprothiolane'],
        recommendationRoles: ['treatment'],
        caution: 'Confirm blast symptoms and follow local padi label restrictions, especially around heading stage.',
        priority: 50,
    },
    {
        id: 'bacterial_leaf_spot_blight',
        displayName: 'Bacterial leaf spot / blight',
        cropAliases: ['chilli', 'chili', 'cili', 'rice', 'padi', 'mango', 'mangga', 'papaya', 'betik'],
        diseaseAliases: ['bacterial leaf spot', 'bacterial blight', 'leaf blight', 'xanthomonas', 'bacterial wilt'],
        pathogenTypes: ['bacterial', 'bacteria'],
        productTags: ['bactericide', 'copper', 'disease-control', 'sanitation', 'biofungicide'],
        activeIngredients: ['copper', 'bacillus subtilis'],
        recommendationRoles: ['treatment'],
        caution: 'Bacterial problems need sanitation and spread control; copper products are preventive, not a cure for advanced infection.',
        priority: 60,
    },
    {
        id: 'nutrient_deficiency_support',
        displayName: 'Nutrient deficiency support',
        cropAliases: ['durian', 'mango', 'mangga', 'banana', 'pisang', 'papaya', 'betik', 'chilli', 'chili', 'cili', 'padi', 'rice'],
        diseaseAliases: ['nutrient deficiency', 'deficiency', 'chlorosis', 'yellowing', 'potassium deficiency', 'magnesium deficiency', 'calcium deficiency'],
        pathogenTypes: ['nutrient', 'abiotic', 'physiological'],
        productTags: ['fertilizer', 'npk', 'trace-elements', 'magnesium', 'potassium', 'calcium', 'foliar-feed', 'micronutrient'],
        activeIngredients: ['NPK', 'magnesium', 'potassium', 'calcium', 'trace elements'],
        recommendationRoles: ['fertilizer', 'supplement'],
        caution: 'Use soil or leaf testing where possible; nutrient products should not be presented as pest or disease cures.',
        priority: 70,
    },
]);

export const normalizeDiseaseProductRule = (rule = {}) => ({
    id: String(rule.id || '').trim(),
    displayName: String(rule.displayName || rule.display_name || rule.name || '').trim(),
    cropAliases: normalizeRuleArray(rule.cropAliases || rule.crop_aliases),
    diseaseAliases: normalizeRuleArray(rule.diseaseAliases || rule.disease_aliases),
    pathogenTypes: normalizeRuleArray(rule.pathogenTypes || rule.pathogen_types),
    productTags: normalizeRuleArray(rule.productTags || rule.product_tags),
    activeIngredients: normalizeRuleArray(rule.activeIngredients || rule.active_ingredients),
    recommendationRoles: normalizeRuleArray(rule.recommendationRoles || rule.recommendation_roles || ['treatment']),
    caution: String(rule.caution || '').trim(),
    priority: Number.isFinite(Number(rule.priority)) ? Number(rule.priority) : DEFAULT_RULE_PRIORITY,
    enabled: rule.enabled !== false,
});

const getDiagnosisText = (diagnosisInfo = {}) => {
    const diagnosticEvidence = diagnosisInfo.diagnosticEvidence && typeof diagnosisInfo.diagnosticEvidence === 'object'
        ? diagnosisInfo.diagnosticEvidence
        : {};

    return {
        crop: normalizeRuleText([
            diagnosisInfo.plantType,
            diagnosisInfo.cropType,
            diagnosisInfo.crop,
        ].filter(Boolean).join(' ')),
        disease: normalizeRuleText([
            diagnosisInfo.disease,
            diagnosisInfo.healthStatus,
            diagnosisInfo.diseaseCategory,
        ].filter(Boolean).join(' ')),
        pathogen: normalizeRuleText([
            diagnosisInfo.pathogenType,
            diagnosisInfo.diseaseCategory,
            diagnosticEvidence.likelyCauseCategory,
        ].filter(Boolean).join(' ')),
        context: normalizeRuleText([
            diagnosisInfo.disease,
            diagnosisInfo.pathogenType,
            diagnosisInfo.diseaseCategory,
            diagnosisInfo.nutritionalStatus,
            ...asArray(diagnosisInfo.productSearchTags),
            ...asArray(diagnosisInfo.symptoms),
            ...asArray(diagnosisInfo.treatments),
            ...asArray(diagnosisInfo.immediateActions),
            ...asArray(diagnosticEvidence.evidenceFor),
        ].filter(Boolean).join(' ')),
    };
};

const collectMatches = (haystack, values = []) => (
    values
        .map((value) => ({ raw: value, normalized: normalizeRuleText(value) }))
        .filter(({ normalized }) => normalized.length >= 3 && haystack.includes(normalized))
        .map(({ raw }) => raw)
);

export const getDiseaseProductRuleMatches = (diagnosisInfo = {}, rules = DEFAULT_DISEASE_PRODUCT_RULES) => {
    const diagnosisText = getDiagnosisText(diagnosisInfo);
    const normalizedRules = (Array.isArray(rules) ? rules : [])
        .map(normalizeDiseaseProductRule)
        .filter((rule) => rule.enabled && rule.id);

    return normalizedRules
        .map((rule) => {
            const diseaseMatches = collectMatches(`${diagnosisText.disease} ${diagnosisText.context}`, rule.diseaseAliases);
            const cropMatches = collectMatches(diagnosisText.crop, rule.cropAliases);
            const pathogenMatches = collectMatches(`${diagnosisText.pathogen} ${diagnosisText.context}`, rule.pathogenTypes);
            const productTagMatches = collectMatches(diagnosisText.context, rule.productTags);
            const activeIngredientMatches = collectMatches(diagnosisText.context, rule.activeIngredients);

            let score = 0;
            score += diseaseMatches.length > 0 ? 38 : 0;
            score += cropMatches.length > 0 ? 14 : 0;
            score += pathogenMatches.length > 0 ? 10 : 0;
            score += productTagMatches.length * 8;
            score += activeIngredientMatches.length * 6;

            const hasRuleAnchor = diseaseMatches.length > 0 || productTagMatches.length > 0 || activeIngredientMatches.length > 0;
            const hasCropOrPathogenSupport = cropMatches.length > 0 || pathogenMatches.length > 0;

            return {
                rule,
                score,
                matchedTerms: uniqueStrings([
                    ...diseaseMatches,
                    ...cropMatches,
                    ...pathogenMatches,
                    ...productTagMatches,
                    ...activeIngredientMatches,
                ]),
                hasRuleAnchor,
                hasCropOrPathogenSupport,
            };
        })
        .filter((match) => match.hasRuleAnchor && match.score >= 30 && (match.hasCropOrPathogenSupport || match.score >= 44))
        .sort((left, right) => (
            right.score - left.score
            || left.rule.priority - right.rule.priority
            || left.rule.displayName.localeCompare(right.rule.displayName)
        ));
};

export const buildDiseaseProductRuleContext = (diagnosisInfo = {}, recommendationRole = 'treatment', rules = DEFAULT_DISEASE_PRODUCT_RULES) => {
    const role = String(recommendationRole || 'treatment').trim().toLowerCase();
    const matches = getDiseaseProductRuleMatches(diagnosisInfo, rules)
        .filter(({ rule }) => rule.recommendationRoles.map((item) => item.toLowerCase()).includes(role))
        .slice(0, 3);

    const selectedRules = matches.map(({ rule }) => rule);

    return {
        matched: selectedRules.length > 0,
        rules: matches.map(({ rule, score, matchedTerms }) => ({
            id: rule.id,
            displayName: rule.displayName,
            score,
            matchedTerms,
            productTags: rule.productTags,
            activeIngredients: rule.activeIngredients,
            caution: rule.caution,
        })),
        primaryRule: selectedRules[0] || null,
        productTags: uniqueStrings(selectedRules.flatMap((rule) => rule.productTags)),
        activeIngredients: uniqueStrings(selectedRules.flatMap((rule) => rule.activeIngredients)),
        cautionNotes: uniqueStrings(selectedRules.map((rule) => rule.caution).filter(Boolean)),
        matchTerms: uniqueStrings(selectedRules.flatMap((rule) => [
            ...rule.diseaseAliases,
            ...rule.productTags,
            ...rule.activeIngredients,
        ])),
    };
};
