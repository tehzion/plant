export const SCAN_RESULT_STATES = Object.freeze({
    CONFIDENT_TREATMENT: 'confident_treatment',
    NEEDS_CLOSER_PHOTO: 'needs_closer_photo',
    POSSIBLE_NUTRIENT_ISSUE: 'possible_nutrient_issue',
    POSSIBLE_PEST: 'possible_pest',
    EXPERT_REVIEW_NEEDED: 'expert_review_needed',
    HEALTHY: 'healthy',
});

export const confidencePercent = (value) => {
    if (value == null || value === '' || typeof value === 'boolean') return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 100) return null;
    return number > 0 && number <= 1 ? number * 100 : number;
};

const normalized = (value) => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const reviewStates = new Set([
    'needs_closer_photo', 'possible_nutrient_issue', 'possible_pest', 'expert_review_needed',
]);
const reviewStatuses = new Set(['uncertain', 'possible', 'inconclusive', 'needs_more_evidence', 'needs_review', 'review_needed']);
const firstScore = (...values) => values.map(confidencePercent).find((value) => value !== null) ?? null;
export const isNoIssueDiagnosis = (value) => /^(healthy(?: plant)?|normal|none|no (?:major )?(?:issues?|disease)(?: detected)?|tiada (?:masalah|penyakit)(?: dikesan)?|sihat|pokok elok|未检测到问题|无问题)$/.test(String(value || '').trim().toLowerCase());

const nutritionPattern = /nutrient|nutrition|nutritional|nutrisi|deficien|kekurangan|nutrien|chlorosis|nitrogen|potassium|magnesium|calcium|kalium|营养|缺素|缺钾/i;
const actionableDiseasePattern = /fungal|fungus|bacter|viral|virus|pest|insect|mealybug|aphid|mite|thrip|whitefly|infestation|oomycete|nematode|blight|spot|rot|wilt|rust|mildew|kulat|病/i;

const normalizeNutritionStatus = (scan = {}) => {
    const source = scan.nutritionalIssues && typeof scan.nutritionalIssues === 'object'
        ? scan.nutritionalIssues
        : {};
    const explicit = normalized(source.status || scan.nutritionalStatus);
    if (explicit === 'confirmed' || source.hasDeficiency || Array.isArray(source.deficientNutrients) && source.deficientNutrients.length > 0) {
        return 'confirmed';
    }
    if (explicit === 'possible'
        || Array.isArray(source.possibleNutrients) && source.possibleNutrients.length > 0
        || source.reasoning || source.notes) {
        return 'possible';
    }
    return 'none';
};

const hasNutrientEvidence = (scan = {}) => {
    const source = scan.nutritionalIssues && typeof scan.nutritionalIssues === 'object'
        ? scan.nutritionalIssues
        : {};
    const differentialText = Array.isArray(scan.differentialDiagnoses)
        ? scan.differentialDiagnoses.map((item) => `${item?.name || ''} ${item?.reason || ''}`).join(' ')
        : '';
    const text = [
        scan.disease,
        scan.diseaseCategory,
        scan.pathogenType,
        scan.diagnosticEvidence?.likelyCauseCategory,
        differentialText,
        ...(Array.isArray(scan.productSearchTags) ? scan.productSearchTags : []),
    ].filter(Boolean).join(' ');
    const explicitStatus = normalized(source.status || scan.nutritionalStatus);
    const namedNutrient = (Array.isArray(source.deficientNutrients) && source.deficientNutrients.length > 0)
        || (Array.isArray(source.possibleNutrients) && source.possibleNutrients.length > 0);
    return nutritionPattern.test(text)
        || namedNutrient
        || explicitStatus === 'confirmed'
        || scan.resultState === SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE;
};

/**
 * Determines where diagnosis and product content belongs on the result page.
 * This is shared by the browser and server so a product cannot be rendered in
 * a different section from the decision that produced it.
 */
export const getScanSectionPolicy = (scan = {}) => {
    const decision = assessScanDecision(scan);
    const nutritionStatus = normalizeNutritionStatus(scan);
    const text = [
        scan.disease,
        scan.diseaseCategory,
        scan.pathogenType,
        scan.diagnosticEvidence?.likelyCauseCategory,
    ].filter(Boolean).join(' ');
    const diseaseCategory = normalized(scan.diseaseCategory);
    const actionableDisease = actionableDiseasePattern.test(text)
        && !['environmental', 'nutrient', 'healthy', 'unknown', 'physiological'].includes(diseaseCategory);
    const nutritionPrimary = !decision.healthy && (
        normalized(scan.resultState) === SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE
        || (nutritionStatus !== 'none' && !actionableDisease)
        || (nutritionPattern.test(text) && !actionableDisease)
    );
    const nutritionEvidence = hasNutrientEvidence(scan);
    const nutritionUnconfirmed = Boolean(scan.nutritionalIssues?.unconfirmedDueToEvidence);

    return {
        nutritionStatus,
        nutritionPrimary,
        diseasePrimary: !decision.healthy && actionableDisease,
        showNutritionProducts: decision.healthy || (nutritionEvidence && nutritionStatus !== 'none' && !nutritionUnconfirmed),
        showDiseaseProducts: decision.treatmentEligible && actionableDisease,
    };
};

export const assessScanDecision = (scan = {}) => {
    if (!scan || typeof scan !== 'object') scan = {};
    const status = normalized(scan.status);
    const explicit = normalized(scan.resultState);
    const confidence = firstScore(scan.diagnosisConfidence, scan.confidenceBreakdown?.diagnosisConfidence, scan.confidence);
    const imageQuality = firstScore(scan.captureAssessment?.imageQualityConfidence, scan.confidenceBreakdown?.imageQualityConfidence);
    const retake = Boolean(scan.requiresRetake || scan.captureAssessment?.requiresRetake
        || scan.captureAssessment?.detailSufficient === false
        || scan.captureAssessment?.leafDetailSufficient === false || scan.retakeReason
        || status === 'retake_required' || (imageQuality !== null && imageQuality < 50));
    const disease = String(scan.disease || '').trim().toLowerCase();
    const noIssue = isNoIssueDiagnosis(disease);
    const unknownDisease = !disease || /^(unknown|n\/a|unknown disease|tidak diketahui)$/.test(disease);
    const healthySignal = (noIssue || unknownDisease)
        && (noIssue || ['healthy', 'sihat', 'normal', '健康'].includes(normalized(scan.healthStatus || status)) || explicit === 'healthy');
    const text = [scan.disease, scan.diseaseCategory, scan.pathogenType, scan.diagnosticEvidence?.likelyCauseCategory].join(' ').toLowerCase();
    const nutrient = /nutrient|nutritional|deficien|kekurangan|nutrien|缺素|缺钾/.test(text);
    const pest = /pest|insect|mealybug|aphid|mite|thrip|whitefly|infestation|kutu|serangga|粉蚧|虫/.test(text);
    const nonChemicalCause = ['environmental', 'nutrient', 'viral', 'healthy', 'unknown'].includes(normalized(scan.diseaseCategory));
    const actionable = !nonChemicalCause && (pest || /fungal|fungus|bacter|oomycete|nematode|blight|spot|rot|rust|mildew|kulat|病/.test(text));
    const weak = Boolean(scan.needsMoreEvidence || scan.abstainReason || scan.validationIssues?.length
        || reviewStatuses.has(status) || reviewStates.has(explicit)
        || (confidence !== null && confidence < 70)
        || (confidencePercent(scan.confidence) !== null && confidencePercent(scan.confidence) < 70)
        || (scan.schemaVersion >= 2 && (confidence === null || imageQuality === null)));
    let resultState;
    if (retake || explicit === 'needs_closer_photo') resultState = SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO;
    else if (healthySignal && !weak) resultState = SCAN_RESULT_STATES.HEALTHY;
    else if (actionable && !weak && confidence !== null
        && ((confidence >= 80 && ['confirmed', 'high_confidence', 'confident_treatment'].includes(status || explicit))
            || (confidence >= 85 && status === 'likely'))) {
        resultState = SCAN_RESULT_STATES.CONFIDENT_TREATMENT;
    } else if (nutrient || explicit === 'possible_nutrient_issue') resultState = SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE;
    else if (pest || explicit === 'possible_pest') resultState = SCAN_RESULT_STATES.POSSIBLE_PEST;
    else resultState = SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED;
    const healthy = resultState === SCAN_RESULT_STATES.HEALTHY;
    const treatmentEligible = resultState === SCAN_RESULT_STATES.CONFIDENT_TREATMENT;
    return {
        resultState, healthy, treatmentEligible, confidence,
        needsReview: !healthy && !treatmentEligible,
        requiresRetake: resultState === SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO,
        tone: healthy ? 'healthy' : treatmentEligible ? 'issue' : 'review',
        followUpActivity: healthy ? 'inspect' : treatmentEligible ? 'note' : 'scout',
    };
};
