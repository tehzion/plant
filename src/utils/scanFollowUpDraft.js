import { getStandardizedSeverity, getStandardizedStatus } from './statusUtils';

export const SCAN_FOLLOW_UP_DRAFT_KEY = 'sea_plant_scan_follow_up_draft_v1';
export const SCAN_FOLLOW_UP_DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

const ACTIVITY_DRAFT_FIELDS = [
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

const compactLines = (lines) => lines.map(textOrEmpty).filter(Boolean);

const normalizeList = (value) => {
    if (Array.isArray(value)) return value.map(textOrEmpty).filter(Boolean);
    if (typeof value === 'string') {
        return value
            .split(/\r?\n|;|•|â€¢/g)
            .map((item) => item.replace(/^[-*\d.)\s]+/, '').trim())
            .filter(Boolean);
    }
    return [];
};

const normalizeSeverityForForm = (severity) => {
    const standardized = getStandardizedSeverity(severity);
    if (standardized === 'critical' || standardized === 'severe') return 'High';
    if (standardized === 'moderate') return 'Moderate';
    return 'Low';
};

const formatNumberedSection = (title, items) => {
    const normalized = normalizeList(items);
    if (!normalized.length) return '';
    return [
        title,
        ...normalized.map((item, index) => `${index + 1}. ${item}`),
    ].join('\n');
};

const isUncertainScan = (scan = {}) => {
    const status = textOrEmpty(scan.status || scan.healthStatus).toLowerCase();
    return Boolean(
        scan.needsMoreEvidence
        || scan.requiresRetake
        || scan.abstainReason
        || scan.retakeReason
        || ['uncertain', 'unknown', 'retake_required', 'needs_more_evidence'].some((keyword) => status.includes(keyword))
    );
};

const getDiseaseName = (scan = {}) => (
    textOrEmpty(scan.disease)
    || textOrEmpty(scan.fungusType)
    || textOrEmpty(scan.pathogenType)
    || textOrEmpty(scan.diagnosticEvidence?.likelyCauseCategory)
);

const getCropName = (scan = {}) => (
    textOrEmpty(scan.plantType)
    || textOrEmpty(scan.category)
    || 'Crop'
);

const getConfidenceLine = (scan = {}) => {
    if (scan.confidence === null || scan.confidence === undefined || scan.confidence === '') return '';
    const confidence = Number(scan.confidence);
    if (!Number.isFinite(confidence)) return '';
    return `Confidence: ${Math.round(confidence > 1 ? confidence : confidence * 100)}%`;
};

const buildHeader = (scan = {}, statusLabel) => compactLines([
    `Linked scan: ${textOrEmpty(scan.id) || 'not recorded'}`,
    `Crop: ${getCropName(scan)}`,
    statusLabel,
    textOrEmpty(scan.severity) ? `Severity: ${textOrEmpty(scan.severity)}` : '',
    getConfidenceLine(scan),
    textOrEmpty(scan.locationName) ? `Location: ${textOrEmpty(scan.locationName)}` : '',
]).join('\n');

const buildHealthyNote = (scan) => compactLines([
    buildHeader(scan, 'Status: Healthy'),
    formatNumberedSection('Routine care reminders:', [
        ...normalizeList(scan.healthyCarePlan?.dailyCare),
        ...normalizeList(scan.healthyCarePlan?.weeklyCare),
    ].slice(0, 4)),
    'Follow-up: Routine inspection completed from scan result. Confirm leaves, stems, irrigation, and pest pressure remain normal.',
]).join('\n\n');

const buildScoutNote = (scan, diseaseName) => compactLines([
    buildHeader(scan, `Follow-up type: Field scouting${diseaseName ? ` for ${diseaseName}` : ''}`),
    textOrEmpty(scan.retakeReason) ? `Retake reason: ${textOrEmpty(scan.retakeReason)}` : '',
    textOrEmpty(scan.abstainReason) ? `AI note: ${textOrEmpty(scan.abstainReason)}` : '',
    formatNumberedSection('Diagnostic evidence to verify:', scan.diagnosticEvidence?.supportingSymptoms || scan.diagnosticEvidence?.matches || scan.symptoms),
    formatNumberedSection('Possible alternatives:', scan.differentialDiagnoses),
    'Follow-up: Scout the affected plot, retake clear leaf photos if needed, and update incidence or severity after field confirmation.',
]).join('\n\n');

const buildTreatmentNote = (scan, diseaseName) => compactLines([
    buildHeader(scan, `Diagnosis: ${diseaseName || 'Disease or pest issue'}`),
    formatNumberedSection('Suggested immediate actions:', scan.immediateActions),
    formatNumberedSection('Suggested treatment steps:', scan.treatments || scan.result_json?.treatments || scan.result_json?.treatment),
    formatNumberedSection('Prevention reminders:', scan.prevention),
    'Follow-up: Review field signs and product label before applying any pesticide or treatment. Record final product name and quantity before saving.',
]).join('\n\n');

const sanitizeDraft = (draft) => ACTIVITY_DRAFT_FIELDS.reduce((cleaned, key) => {
    cleaned[key] = textOrEmpty(draft[key]);
    return cleaned;
}, {});

export const buildFollowUpDraftFromScan = (scan = {}) => {
    const explicitStatus = textOrEmpty(scan.healthStatus || scan.status);
    const healthy = explicitStatus
        ? getStandardizedStatus(explicitStatus) === 'healthy'
        : getStandardizedStatus(scan) === 'healthy';
    const uncertain = isUncertainScan(scan);
    const diseaseName = getDiseaseName(scan);
    const scoutSeverity = normalizeSeverityForForm(scan.severity);

    if (uncertain) {
        return sanitizeDraft({
            activity_type: 'scout',
            chemical_name: '',
            chemical_qty: '',
            disease_name_observed: diseaseName,
            scout_severity: scoutSeverity,
            inspection_type: 'Pest/Disease',
            inspection_status: 'Action Required',
            expense_category: 'Labor',
            note: buildScoutNote(scan, diseaseName),
        });
    }

    if (healthy) {
        return sanitizeDraft({
            activity_type: 'inspect',
            chemical_name: '',
            chemical_qty: '',
            disease_name_observed: '',
            scout_severity: 'Low',
            inspection_type: 'Pest/Disease',
            inspection_status: 'Good',
            expense_category: 'Labor',
            note: buildHealthyNote(scan),
        });
    }

    return sanitizeDraft({
        activity_type: 'spray',
        chemical_name: '',
        chemical_qty: '',
        disease_name_observed: diseaseName,
        scout_severity: scoutSeverity,
        inspection_type: 'Pest/Disease',
        inspection_status: scoutSeverity === 'High' ? 'Urgent' : 'Action Required',
        expense_category: 'Pesticide',
        note: buildTreatmentNote(scan, diseaseName),
    });
};

export const saveFollowUpDraft = (draft) => {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    try {
        window.sessionStorage.setItem(SCAN_FOLLOW_UP_DRAFT_KEY, JSON.stringify({
            createdAt: Date.now(),
            draft: sanitizeDraft(draft),
        }));
        return true;
    } catch {
        return false;
    }
};

export const peekFollowUpDraft = () => {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    try {
        const raw = window.sessionStorage.getItem(SCAN_FOLLOW_UP_DRAFT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.draft || Date.now() - Number(parsed.createdAt || 0) > SCAN_FOLLOW_UP_DRAFT_MAX_AGE_MS) {
            window.sessionStorage.removeItem(SCAN_FOLLOW_UP_DRAFT_KEY);
            return null;
        }
        return sanitizeDraft(parsed.draft);
    } catch {
        window.sessionStorage.removeItem(SCAN_FOLLOW_UP_DRAFT_KEY);
        return null;
    }
};

export const consumeFollowUpDraft = () => {
    const draft = peekFollowUpDraft();
    if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(SCAN_FOLLOW_UP_DRAFT_KEY);
    }
    return draft;
};
