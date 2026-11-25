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

// Look-alike diseases that must be weighed before a treatment recommendation. Dataset evaluation
// found confident "Early Blight" calls on late-blight and leaf-mould leaves where the model never
// considered either. Names cover en/ms/zh plus language-neutral scientific names.
const EARLY_BLIGHT = { name: 'Early Blight', pattern: /early blight|hawar awal|早疫病|alternaria solani/i };
const LATE_BLIGHT = { name: 'Late Blight', pattern: /late blight|hawar lewat|晚疫病|phytophthora infestans/i };
const LEAF_MOLD = { name: 'Leaf Mold', pattern: /leaf mou?ld|kulapuk daun|叶霉病|passalora fulva|fulvia fulva|cladosporium fulvum/i };
// Padi: blast and brown spot both make brown leaf lesions; leaf blight and leaf streak are both
// bacterial streaks. Each pair needs different control, so a confident call must weigh the other.
const RICE_BLAST = { name: 'Rice Blast', pattern: /\bblast\b|karah|稻瘟病|pyricularia|magnaporthe/i };
const BROWN_SPOT = { name: 'Brown Spot', pattern: /brown spot|bintik perang|胡麻斑病|bipolaris|cochliobolus|helminthosporium/i };
const LEAF_BLIGHT = { name: 'Bacterial Leaf Blight', pattern: /bacterial (?:leaf )?blight|hawar daun bakteria|白叶枯病|pv\.? oryzae\b/i };
const LEAF_STREAK = { name: 'Bacterial Leaf Streak', pattern: /bacterial (?:leaf )?streak|jalur daun bakteria|细菌性条斑病|oryzicola/i };
// Chilli: fungal cercospora spots and bacterial leaf spots look alike but need fungicide vs copper.
const CERCOSPORA = { name: 'Cercospora Leaf Spot', pattern: /cercospora|frog.?eye|bintik mata katak|尾孢/i };
const BACTERIAL_SPOT = { name: 'Bacterial Leaf Spot', pattern: /bacterial (?:leaf )?spot|bintik daun bakteria|细菌性(?:叶)?斑点病|xanthomonas (?:campestris|euvesicatoria|vesicatoria)/i };
// Farmer-facing names for the look-alikes above, so a warning reads in the farmer's language.
const LOOK_ALIKE_LABELS = {
    'Early Blight': { ms: 'Hawar Awal', zh: '早疫病' },
    'Late Blight': { ms: 'Hawar Lewat', zh: '晚疫病' },
    'Leaf Mold': { ms: 'Kulapuk Daun', zh: '叶霉病' },
    'Rice Blast': { ms: 'Penyakit Karah', zh: '稻瘟病' },
    'Brown Spot': { ms: 'Bintik Perang', zh: '胡麻斑病' },
    'Bacterial Leaf Blight': { ms: 'Hawar Daun Bakteria', zh: '白叶枯病' },
    'Bacterial Leaf Streak': { ms: 'Jalur Daun Bakteria', zh: '细菌性条斑病' },
    'Cercospora Leaf Spot': { ms: 'Bintik Daun Cercospora', zh: '尾孢叶斑病' },
    'Bacterial Leaf Spot': { ms: 'Bintik Daun Bakteria', zh: '细菌性叶斑病' },
};
export const lookAlikeLabel = (name, language = 'en') => LOOK_ALIKE_LABELS[name]?.[language] || name;
const TOMATO = /tomato|tomat\b|番茄|lycopersic/i;
const POTATO = /potato|kentang|马铃薯|土豆|tuberosum/i;
const PADI = /\bpadi\b|paddy|\brice\b|\bberas\b|水稻|稻|oryza/i;
const CHILLI = /chil+i|\bcili\b|\bchile\b|辣椒|capsicum/i;
const LOOK_ALIKE_RULES = [
    { crop: (t) => TOMATO.test(t) || POTATO.test(t), diagnosis: EARLY_BLIGHT, mustConsider: [LATE_BLIGHT] },
    // Re-scoring the stored benchmark found "Early Blight" treatment on a tomato bacterial-spot leaf
    // the assessment never weighed; bacterial spot needs copper, not the blight fungicide. (Septoria
    // was left out: it shares the blight fungicides, and adding it sent twice as many correct calls
    // to review as the wrong ones it caught.)
    { crop: (t) => TOMATO.test(t), diagnosis: EARLY_BLIGHT, mustConsider: [LEAF_MOLD, BACTERIAL_SPOT] },
    { crop: (t) => TOMATO.test(t) || POTATO.test(t), diagnosis: LATE_BLIGHT, mustConsider: [EARLY_BLIGHT] },
    { crop: (t) => TOMATO.test(t), diagnosis: LEAF_MOLD, mustConsider: [EARLY_BLIGHT, LATE_BLIGHT] },
    { crop: (t) => PADI.test(t), diagnosis: RICE_BLAST, mustConsider: [BROWN_SPOT] },
    { crop: (t) => PADI.test(t), diagnosis: BROWN_SPOT, mustConsider: [RICE_BLAST] },
    { crop: (t) => PADI.test(t), diagnosis: LEAF_BLIGHT, mustConsider: [LEAF_STREAK] },
    { crop: (t) => PADI.test(t), diagnosis: LEAF_STREAK, mustConsider: [LEAF_BLIGHT] },
    { crop: (t) => CHILLI.test(t), diagnosis: CERCOSPORA, mustConsider: [BACTERIAL_SPOT] },
    { crop: (t) => CHILLI.test(t), diagnosis: BACTERIAL_SPOT, mustConsider: [CERCOSPORA] },
];

// Viruses have no chemical cure. The name is checked as well as the category, because a
// mislabelled category ("fungal") must not unlock treatment for "Tomato spotted wilt virus".
const VIRUS_NAME = /virus|viral|virosis|病毒|tungro|mosaic|mozek|geminivir|begomovir/i;
const SEVERE = /severe|critical|high|teruk|serius|kritikal|tinggi|严重|危急/i;

/**
 * True when the crop itself is in doubt: the farmer did not state it and the species check
 * did not confirm it. Dataset evaluation found the crop misread in 25 of 70 such images, and
 * a disease named for the wrong crop must not unlock treatment. Only new scans carry the
 * farmerStatedCrop flag, so older saved results are unaffected.
 */
export const isCropUncertain = (scan = {}) => {
    const species = scan.speciesAssessment;
    return Boolean(species && species.farmerStatedCrop === false && species.confirmed !== true);
};

/** Returns the names of look-alike conditions the assessment never weighed (empty when none are required). */
export const getMissingLookAlikes = (scan = {}) => {
    const crop = [scan.plantType, scan.crop, scan.category, scan.identification?.scientificName].filter(Boolean).join(' ');
    const primary = [scan.disease, scan.primaryScientificName].filter(Boolean).join(' ');
    const evidence = scan.diagnosticEvidence || {};
    const considered = [
        ...(Array.isArray(scan.differentialDiagnoses) ? scan.differentialDiagnoses.flatMap((d) => [d?.name, d?.scientificName]) : []),
        evidence.rejectedDiagnosis,
        ...(Array.isArray(evidence.evidenceAgainst) ? evidence.evidenceAgainst : []),
    ].filter(Boolean).join(' ');
    return LOOK_ALIKE_RULES
        .filter((rule) => rule.crop(crop) && rule.diagnosis.pattern.test(primary))
        .flatMap((rule) => rule.mustConsider.filter((lookAlike) => !lookAlike.pattern.test(considered)))
        .map((lookAlike) => lookAlike.name);
};

/**
 * A "no issues" verdict below high confidence. Dataset evaluation found mites, powdery mildew,
 * citrus greening, scab and target spot called "No Issues" at medium confidence, so such a
 * verdict is not shown as healthy, nor one where the model reported any subtle sign as present
 * or unclear. Older scans without these fields are unaffected.
 */
export const isUnsureHealthy = (scan = {}) => {
    if (!isNoIssueDiagnosis(String(scan.disease || '').trim().toLowerCase())) return false;
    const level = normalized(scan.confidenceLevel);
    const signs = scan.subtleSigns && typeof scan.subtleSigns === 'object' ? Object.values(scan.subtleSigns) : [];
    return (Boolean(level) && level !== 'high') || signs.some((state) => ['present', 'unclear'].includes(normalized(state)));
};

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
const healthStatusOf = (scan = {}) => normalized(scan.healthStatus);

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
    // The second photo check did not back this result, so no product is suggested for it.
    const secondCheckVeto = Boolean(scan.secondCheck?.applied);

    return {
        nutritionStatus,
        nutritionPrimary,
        diseasePrimary: !decision.healthy && actionableDisease,
        showNutritionProducts: !secondCheckVeto && (decision.healthy || (nutritionEvidence && nutritionStatus !== 'none' && !nutritionUnconfirmed)),
        showDiseaseProducts: !secondCheckVeto && decision.treatmentEligible && actionableDisease,
        // Plant-health products beside a disease result: a sick plant, not a retake or an unclear photo.
        showRecoveryProducts: !secondCheckVeto && !decision.healthy && !decision.requiresRetake && healthStatusOf(scan) === 'unhealthy',
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
    const healthStatus = normalized(scan.healthStatus);
    const conflictingHealth = (['healthy', 'sihat', 'normal', '健康'].includes(healthStatus) && !noIssue && !unknownDisease)
        || (healthStatus === 'unhealthy' && noIssue);
    const healthySignal = (noIssue || unknownDisease)
        && (noIssue || ['healthy', 'sihat', 'normal', '健康'].includes(normalized(scan.healthStatus || status)) || explicit === 'healthy');
    const text = [scan.disease, scan.diseaseCategory, scan.pathogenType, scan.diagnosticEvidence?.likelyCauseCategory].join(' ').toLowerCase();
    const nutrient = /nutrient|nutritional|deficien|kekurangan|nutrien|缺素|缺钾/.test(text);
    const pest = /pest|insect|mealybug|aphid|mite|thrip|whitefly|infestation|kutu|serangga|粉蚧|虫/.test(text);
    const nonChemicalCause = ['environmental', 'nutrient', 'viral', 'healthy', 'unknown'].includes(normalized(scan.diseaseCategory))
        || VIRUS_NAME.test(`${scan.disease || ''} ${scan.primaryScientificName || ''} ${scan.pathogenType || ''}`);
    const actionable = !nonChemicalCause && (pest || /fungal|fungus|bacter|oomycete|nematode|blight|spot|rot|rust|mildew|kulat|病/.test(text));
    const cropUncertain = isCropUncertain(scan);
    const missingLookAlikes = getMissingLookAlikes(scan);
    const weak = Boolean(conflictingHealth || healthStatus === 'unknown' || missingLookAlikes.length || isUnsureHealthy(scan) || scan.needsMoreEvidence || scan.needsReview || scan.expertReviewRequired || scan.abstainReason || scan.validationIssues?.length
        || reviewStatuses.has(status) || reviewStates.has(explicit)
        || (confidence !== null && confidence < 70)
        || (confidencePercent(scan.confidence) !== null && confidencePercent(scan.confidence) < 70)
        || (scan.schemaVersion >= 2 && (confidence === null || imageQuality === null)));
    let resultState;
    if (retake || explicit === 'needs_closer_photo') resultState = SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO;
    else if (healthySignal && !weak) resultState = SCAN_RESULT_STATES.HEALTHY;
    else if (actionable && !weak && !cropUncertain && confidence !== null
        && ((confidence >= 80 && ['confirmed', 'high_confidence', 'confident_treatment'].includes(status || explicit))
            || (confidence >= 85 && status === 'likely'))) {
        resultState = SCAN_RESULT_STATES.CONFIDENT_TREATMENT;
    } else if (nutrient || explicit === 'possible_nutrient_issue') resultState = SCAN_RESULT_STATES.POSSIBLE_NUTRIENT_ISSUE;
    else if (pest || explicit === 'possible_pest') resultState = SCAN_RESULT_STATES.POSSIBLE_PEST;
    else resultState = SCAN_RESULT_STATES.EXPERT_REVIEW_NEEDED;
    const healthy = resultState === SCAN_RESULT_STATES.HEALTHY;
    const treatmentEligible = resultState === SCAN_RESULT_STATES.CONFIDENT_TREATMENT;
    const requiresRetake = resultState === SCAN_RESULT_STATES.NEEDS_CLOSER_PHOTO;
    const needsReview = !healthy && !treatmentEligible;
    return {
        resultState, healthy, treatmentEligible, confidence, missingLookAlikes, cropUncertain,
        needsReview,
        // A serious-looking problem the app cannot confirm: send the farmer to a person today
        // rather than leave them with "check again".
        urgent: needsReview && !requiresRetake && SEVERE.test(String(scan.severity || '')),
        requiresRetake,
        tone: healthy ? 'healthy' : treatmentEligible ? 'issue' : 'review',
        followUpActivity: healthy ? 'inspect' : treatmentEligible ? 'note' : 'scout',
    };
};
