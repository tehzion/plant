import { assessScanDecision, confidencePercent, isNoIssueDiagnosis } from './scanResultPolicy.js';

// Structured, farmer-facing disease assessment shared by the server (which
// builds it) and the browser (which renders it). Model scores are estimates,
// so every confidence is expressed as a descriptive level rather than a
// calibrated probability.

export const CONFIDENCE_LEVELS = Object.freeze(['high', 'medium', 'low', 'insufficient_evidence']);
export const CONDITION_CATEGORIES = Object.freeze([
    'fungal_disease', 'bacterial_disease', 'viral_disease', 'pest_damage',
    'nutrient_deficiency', 'environmental_stress', 'healthy', 'unknown',
]);
export const ASSESSMENT_STATUSES = Object.freeze([
    'healthy', 'possible_disease', 'possible_pest', 'possible_nutrient_issue',
    'possible_environmental_stress', 'inconclusive', 'retake_required',
]);
export const IDENTIFICATION_STATUSES = Object.freeze(['confirmed', 'likely', 'uncertain', 'unknown']);
export const MAX_ALTERNATIVE_CONDITIONS = 3;
export const CONFIDENCE_LEVEL_FALLBACK_LABELS = Object.freeze({
    high: 'High', medium: 'Medium', low: 'Low', insufficient_evidence: 'Not enough evidence',
});

const LEVEL_RANK = { insufficient_evidence: 0, low: 1, medium: 2, high: 3 };
const text = (value) => (value == null ? '' : String(value).trim());
const list = (value, limit = 5) => (Array.isArray(value) ? value : value ? [value] : [])
    .map(text).filter(Boolean).slice(0, limit);
const key = (value) => text(value).normalize('NFKC').toLowerCase()
    .replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const normalizeLevel = (value) => {
    const level = text(value).toLowerCase().replace(/[\s-]+/g, '_');
    if (level === 'insufficient' || level === 'very_low' || level === 'none') return 'insufficient_evidence';
    return CONFIDENCE_LEVELS.includes(level) ? level : null;
};

export const confidenceLevelFromScore = (score) => {
    const value = confidencePercent(score);
    if (value === null) return 'insufficient_evidence';
    if (value >= 80) return 'high';
    if (value >= 60) return 'medium';
    if (value >= 40) return 'low';
    return 'insufficient_evidence';
};

// A model-reported level is accepted only when it is no more confident than
// the numeric estimate supports, and review/retake states cap it further.
export const resolveConfidenceLevel = ({ score, reported, requiresRetake = false, needsReview = false } = {}) => {
    if (requiresRetake) return 'insufficient_evidence';
    const fromScore = confidenceLevelFromScore(score);
    const claimed = normalizeLevel(reported);
    let level = claimed && LEVEL_RANK[claimed] < LEVEL_RANK[fromScore] ? claimed : fromScore;
    if (needsReview && level === 'high') level = 'medium';
    return level;
};

const CATEGORY_PATTERNS = [
    ['bacterial_disease', /bacter|xanthomonas|pseudomonas|erwinia|ralstonia|canker|bakteria|细菌/i],
    ['viral_disease', /virus|viral|mosaic|curl|ringspot|virus|病毒/i],
    ['pest_damage', /pest|insect|mite|aphid|mealybug|scale|thrip|whitefly|borer|caterpillar|beetle|weevil|nematode|perosak|serangga|kutu|害虫|螨|蚜|介壳|粉蚧/i],
    ['nutrient_deficiency', /deficien|nutrient|nutrition|chlorosis|nitrogen|potassium|magnesium|calcium|iron|zinc|boron|kekurangan|nutrien|缺|营养/i],
    ['environmental_stress', /environment|stress|sunburn|sunscald|scorch|drought|waterlog|overwater|heat|cold|herbicide|chemical injury|physiolog|abiotic|tekanan|cuaca|环境|日灼|干旱|涝/i],
    ['fungal_disease', /fung|blight|spot|rust|mildew|anthracnose|rot|wilt|mould|mold|scab|kulat|真菌|霉|锈|斑|疫|腐/i],
];

export const normalizeConditionCategory = (value, fallbackName = '') => {
    const raw = text(value).toLowerCase().replace(/[\s-]+/g, '_');
    if (CONDITION_CATEGORIES.includes(raw)) return raw;
    const aliases = {
        fungal: 'fungal_disease', fungus: 'fungal_disease', bacterial: 'bacterial_disease', viral: 'viral_disease',
        virus: 'viral_disease', pest: 'pest_damage', insect: 'pest_damage', nutrient: 'nutrient_deficiency',
        nutritional: 'nutrient_deficiency', environmental: 'environmental_stress', abiotic: 'environmental_stress',
        physiological: 'environmental_stress', none: 'healthy', healthy: 'healthy',
    };
    if (aliases[raw]) return aliases[raw];
    const probe = `${raw} ${text(fallbackName)}`;
    return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(probe))?.[0] || 'unknown';
};

const GENERIC_CONDITION = /^(other|others|unknown|unknown disease|n\/?a|none|not sure|unclear|possible disease|leaf problem|further diagnosis needed|tidak diketahui|lain-lain|未知|其他)$/i;

const splitName = (value = '') => {
    const raw = text(value);
    const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    return match ? { name: match[1].trim(), scientificName: match[2].trim() } : { name: raw, scientificName: '' };
};

/**
 * Normalizes the model's differential list into at most three meaningful
 * alternatives. Entries are dropped rather than padded: an alternative must
 * have a real name, differ from the primary condition and explain why it is
 * still possible or how to tell it apart.
 */
export const normalizeAlternativeConditions = (entries = [], { primaryName = '' } = {}) => {
    if (!Array.isArray(entries)) return [];
    const seen = new Set([key(splitName(primaryName).name), key(primaryName)].filter(Boolean));
    const result = [];
    for (const entry of entries) {
        if (!entry || result.length >= MAX_ALTERNATIVE_CONDITIONS) continue;
        const source = typeof entry === 'string' ? { name: entry } : entry;
        const parsed = splitName(source.name || source.disease || source.diagnosis || source.condition);
        const name = parsed.name;
        const normalizedName = key(name);
        if (!name || GENERIC_CONDITION.test(name) || isNoIssueDiagnosis(name) || seen.has(normalizedName)) continue;
        const supportingEvidence = list(source.supportingEvidence || source.supporting_evidence || source.evidenceFor);
        const weakeningEvidence = list(source.weakeningEvidence || source.weakening_evidence || source.evidenceAgainst);
        const distinguishingFeatures = list(source.distinguishingFeatures || source.distinguishing_features);
        const reason = text(source.reason || source.why || source.reasoning);
        if (!supportingEvidence.length && !weakeningEvidence.length && !distinguishingFeatures.length && !reason) continue;
        const likelihoodValue = confidencePercent(source.likelihood ?? source.confidence);
        seen.add(normalizedName);
        result.push({
            name,
            scientificName: text(source.scientificName || source.scientific_name) || parsed.scientificName,
            category: normalizeConditionCategory(source.category, name),
            confidenceLevel: resolveConfidenceLevel({ score: likelihoodValue ?? 50, reported: source.confidenceLevel || source.confidence_level }),
            likelihood: likelihoodValue === null ? null : Math.round(likelihoodValue),
            reason: reason || supportingEvidence[0] || distinguishingFeatures[0] || '',
            supportingEvidence,
            weakeningEvidence,
            distinguishingFeatures,
        });
    }
    return result;
};

// Matches explicit application rates and spray intervals. These must come
// from a registered product label, never from a model's assumption.
const DOSE_PATTERN = /(?:\b(?:at|pada|dengan|using)\s+|@\s*)?\b\d+(?:[.,]\d+)?\s*(?:-|–|to|hingga|至)?\s*\d*(?:[.,]\d+)?\s*(?:ml|mL|g|gm|gram|grams|kg|l|L|liter|litre|liters|litres|cc|oz|%)\s*(?:\/|per|setiap|bagi|每)\s*(?:\d+(?:[.,]\d+)?\s*)?[^\s,.;]+/gi;
const INTERVAL_PATTERN = /(?:\b(?:at|pada)\s+)?\b(?:every|setiap|each)\s+\d+\s*(?:-|–|to|hingga)?\s*\d*\s*(?:days?|hari|weeks?|minggu)\b|每\s*\d+\s*(?:天|日|周)/gi;
const LABEL_TEXT = {
    en: 'at the rate on the registered product label',
    ms: 'mengikut kadar pada label produk berdaftar',
    zh: '按已登记产品标签上的用量',
};
const INTERVAL_TEXT = {
    en: 'at the interval on the label',
    ms: 'mengikut selang pada label',
    zh: '按标签上的间隔',
};

export const redactDosageInstructions = (items = [], language = 'en') => (Array.isArray(items) ? items : [])
    .map((item) => {
        if (typeof item !== 'string') return item;
        return item
            .replace(DOSE_PATTERN, LABEL_TEXT[language] || LABEL_TEXT.en)
            .replace(INTERVAL_PATTERN, INTERVAL_TEXT[language] || INTERVAL_TEXT.en);
    });

const DEFAULT_INFO_NEEDED = {
    closeUp: { en: 'A sharp close-up of one affected leaf (top and underside)', ms: 'Gambar dekat yang jelas bagi satu daun terjejas (atas dan bawah)', zh: '一张清晰的受害叶片近照（正面和背面）' },
    leafAge: { en: 'Whether symptoms started on older or newer leaves', ms: 'Sama ada simptom bermula pada daun tua atau daun muda', zh: '症状是从老叶还是新叶开始' },
    spread: { en: 'How many plants are affected and whether it is spreading', ms: 'Berapa banyak pokok terjejas dan sama ada ia merebak', zh: '有多少植株受影响，是否在扩散' },
    retake: { en: 'A clearer photo in daylight, held steady and close to the symptom', ms: 'Foto yang lebih jelas pada waktu siang, dipegang stabil dan dekat dengan simptom', zh: '在日光下稳定拍摄、靠近症状的更清晰照片' },
};
const DEFAULT_QUESTIONS = {
    started: { en: 'When did you first notice these symptoms?', ms: 'Bilakah anda mula perasan simptom ini?', zh: '您第一次发现这些症状是什么时候？' },
    weather: { en: 'Has there been heavy rain, flooding or very hot weather recently?', ms: 'Adakah hujan lebat, banjir atau cuaca sangat panas baru-baru ini?', zh: '最近是否有大雨、积水或非常炎热的天气？' },
    applied: { en: 'Was any fertiliser or spray applied in the last two weeks?', ms: 'Adakah baja atau racun disembur dalam dua minggu lepas?', zh: '过去两周是否施过肥或喷过药？' },
};
const pick = (entry, language) => entry[language] || entry.en;

const plantIdentification = (scan = {}) => {
    const species = scan.speciesContext || {};
    const assessment = scan.speciesAssessment || {};
    const parsed = splitName(scan.plantType || '');
    const scientific = text(species.scientificName || assessment.scientificName || scan.identification?.scientificName) || parsed.scientificName;
    const common = parsed.name || text(species.primaryName || assessment.primaryName || scan.category);
    const confidence = confidencePercent(species.confidence ?? assessment.confidence);
    const confirmed = Boolean(species.confirmed ?? assessment.confirmed);
    let status = 'unknown';
    if (confirmed && confidence !== null && confidence >= 85) status = 'confirmed';
    else if (confirmed) status = 'likely';
    else if (common || scientific) status = 'uncertain';
    return {
        common_name: common || null,
        scientific_name: scientific || null,
        identification_status: status,
        source: text(species.source || assessment.source || scan.identificationSource) || null,
    };
};

const assessmentStatus = (scan, decision, primaryCategory) => {
    if (decision.requiresRetake) return 'retake_required';
    if (decision.healthy) return 'healthy';
    if (!primaryCategory) return 'inconclusive';
    if (primaryCategory === 'pest_damage') return 'possible_pest';
    if (primaryCategory === 'nutrient_deficiency') return 'possible_nutrient_issue';
    if (primaryCategory === 'environmental_stress') return 'possible_environmental_stress';
    if (primaryCategory === 'unknown') return 'inconclusive';
    return 'possible_disease';
};

/** Builds the stable structured assessment that the UI, PDF and expert review read. */
export const buildStructuredAssessment = (scan = {}, { language = 'en', hasLeafImage = false } = {}) => {
    const decision = assessScanDecision(scan);
    const level = resolveConfidenceLevel({
        score: scan.diagnosisConfidence ?? scan.confidenceBreakdown?.diagnosisConfidence ?? scan.confidence,
        reported: scan.confidenceLevel,
        requiresRetake: decision.requiresRetake,
        needsReview: decision.needsReview,
    });
    const diseaseName = text(scan.disease);
    const parsed = splitName(diseaseName);
    const generic = !parsed.name || GENERIC_CONDITION.test(parsed.name) || isNoIssueDiagnosis(parsed.name)
        || /inconclusive|tidak muktamad|无法确定|assessment incomplete|penilaian belum lengkap/i.test(parsed.name);
    const showPrimary = !decision.healthy && !decision.requiresRetake && !generic;
    const category = showPrimary ? normalizeConditionCategory(scan.diseaseCategory || scan.pathogenType, parsed.name) : null;
    const alternatives = normalizeAlternativeConditions(scan.differentialDiagnoses, { primaryName: diseaseName })
        .map((item) => ({
            name: item.name,
            scientific_name: item.scientificName || null,
            category: item.category,
            confidence_level: LEVEL_RANK[item.confidenceLevel] > LEVEL_RANK[level] ? level : item.confidenceLevel,
            supporting_evidence: item.supportingEvidence.length ? item.supportingEvidence : (item.reason ? [item.reason] : []),
            weakening_evidence: item.weakeningEvidence,
            distinguishing_features: item.distinguishingFeatures,
        }));
    const lowConfidence = level === 'low' || level === 'insufficient_evidence';
    const infoNeeded = list(scan.additionalInformationNeeded, 4);
    const questions = list(scan.followUpQuestions, 3);
    if (!decision.healthy && (lowConfidence || decision.needsReview)) {
        if (decision.requiresRetake) infoNeeded.push(pick(DEFAULT_INFO_NEEDED.retake, language));
        if (!hasLeafImage) infoNeeded.push(pick(DEFAULT_INFO_NEEDED.closeUp, language));
        if (category === 'nutrient_deficiency' || alternatives.some((item) => item.category === 'nutrient_deficiency')) {
            infoNeeded.push(pick(DEFAULT_INFO_NEEDED.leafAge, language));
        }
        infoNeeded.push(pick(DEFAULT_INFO_NEEDED.spread, language));
        if (!questions.length) questions.push(...Object.values(DEFAULT_QUESTIONS).map((entry) => pick(entry, language)));
    }
    const evidenceFor = list(scan.diagnosticEvidence?.evidenceFor, 4);
    return {
        schemaVersion: 1,
        plant: plantIdentification(scan),
        assessment: {
            status: assessmentStatus(scan, decision, category),
            confidence_level: level,
            primary_condition: showPrimary ? {
                name: parsed.name,
                scientific_name: text(scan.primaryScientificName) || parsed.scientificName || null,
                category,
                confidence_level: level,
                visible_symptoms: list(scan.symptoms, 6),
                reasoning: text(scan.additionalNotes) || evidenceFor.join('; '),
            } : null,
            alternative_conditions: alternatives,
            symptoms_overlap: alternatives.length > 0 && level !== 'high',
            needs_expert_review: Boolean(decision.needsReview && !decision.healthy),
            additional_information_needed: [...new Set(infoNeeded)].slice(0, 4),
            follow_up_questions: [...new Set(questions)].slice(0, 3),
        },
        recommendations: {
            immediate_actions: list(scan.immediateActions, 5),
            preventive_actions: list(scan.prevention, 5),
            product_matching_eligible: Boolean(decision.treatmentEligible),
            chemical_treatment_withheld: !decision.treatmentEligible,
        },
    };
};

/** Returns a list of schema problems; an empty list means the object is valid. */
export const validateStructuredAssessment = (value) => {
    const issues = [];
    const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);
    const isStringList = (item) => Array.isArray(item) && item.every((entry) => typeof entry === 'string');
    if (!isObject(value)) return ['not_an_object'];
    if (!isObject(value.plant) || !IDENTIFICATION_STATUSES.includes(value.plant.identification_status)) issues.push('invalid_plant');
    const assessment = value.assessment;
    if (!isObject(assessment)) return [...issues, 'missing_assessment'];
    if (!ASSESSMENT_STATUSES.includes(assessment.status)) issues.push('invalid_status');
    if (!CONFIDENCE_LEVELS.includes(assessment.confidence_level)) issues.push('invalid_confidence_level');
    const primary = assessment.primary_condition;
    if (primary !== null) {
        if (!isObject(primary) || !text(primary.name)) issues.push('invalid_primary_condition');
        else {
            if (!CONDITION_CATEGORIES.includes(primary.category)) issues.push('invalid_primary_category');
            if (!CONFIDENCE_LEVELS.includes(primary.confidence_level)) issues.push('invalid_primary_confidence');
            if (!isStringList(primary.visible_symptoms)) issues.push('invalid_visible_symptoms');
        }
    }
    if (['possible_disease', 'possible_pest', 'possible_nutrient_issue', 'possible_environmental_stress'].includes(assessment.status) && !primary) {
        issues.push('status_without_primary_condition');
    }
    if (!Array.isArray(assessment.alternative_conditions) || assessment.alternative_conditions.length > MAX_ALTERNATIVE_CONDITIONS) {
        issues.push('invalid_alternative_conditions');
    } else {
        const names = new Set(primary?.name ? [key(primary.name)] : []);
        assessment.alternative_conditions.forEach((item, index) => {
            if (!isObject(item) || !text(item.name)) { issues.push(`invalid_alternative_${index}`); return; }
            if (names.has(key(item.name))) issues.push(`duplicate_alternative_${index}`);
            names.add(key(item.name));
            if (!CONFIDENCE_LEVELS.includes(item.confidence_level)) issues.push(`invalid_alternative_confidence_${index}`);
            if (![item.supporting_evidence, item.weakening_evidence, item.distinguishing_features].every(isStringList)
                || ![...item.supporting_evidence, ...item.weakening_evidence, ...item.distinguishing_features].length) {
                issues.push(`alternative_without_comparison_${index}`);
            }
        });
    }
    if (typeof assessment.needs_expert_review !== 'boolean') issues.push('invalid_needs_expert_review');
    if (!isStringList(assessment.additional_information_needed)) issues.push('invalid_additional_information');
    const recommendations = value.recommendations;
    if (!isObject(recommendations) || typeof recommendations.product_matching_eligible !== 'boolean') issues.push('invalid_recommendations');
    else if (recommendations.product_matching_eligible && ['low', 'insufficient_evidence'].includes(assessment.confidence_level)) {
        issues.push('products_eligible_with_low_confidence');
    }
    return issues;
};
