// Cache only translated analysis text: never images, auth tokens, locations or
// decision flags. Scope by account and source content so edited scans cannot
// silently reuse obsolete advice. Storage failures leave the source intact.
const KEY = 'plant_analysis_languages_v1';
const TEXT_FIELDS = ['disease', 'symptoms', 'immediateActions', 'treatments', 'prevention', 'additionalNotes', 'retakeReason', 'abstainReason', 'healthyCarePlan', 'diagnosticEvidence', 'differentialDiagnoses', 'structuredAssessment', 'nutritionalIssues'];
const LIST_FIELDS = ['symptoms', 'immediateActions', 'treatments', 'prevention'];
const list = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : typeof value === 'string' ? value.split(/\r?\n|•|;/).map(item => item.trim()).filter(Boolean) : null;
const pick = (value, strings = [], lists = []) => ({
    ...Object.fromEntries(strings.filter(key => typeof value?.[key] === 'string').map(key => [key, value[key]])),
    ...Object.fromEntries(lists.filter(key => list(value?.[key])).map(key => [key, list(value[key])])),
});
const condition = value => typeof value === 'string' ? { name: value } : pick(value, ['name', 'reason'], ['supporting_evidence', 'weakening_evidence', 'distinguishing_features', 'supportingEvidence', 'weakeningEvidence', 'distinguishingFeatures']);
export const localizedText = value => {
    const text = {};
    for (const key of TEXT_FIELDS) {
        if (LIST_FIELDS.includes(key)) { const items = list(value?.[key]); if (items) text[key] = items; }
        else if (key === 'diagnosticEvidence' && value?.[key]) text[key] = pick(value[key], ['leafAgeAffected', 'lesionShape', 'lesionBorderHalo', 'distributionPattern', 'colorPattern'], ['evidenceFor', 'evidenceAgainst']);
        else if (key === 'differentialDiagnoses' && Array.isArray(value?.[key])) text[key] = value[key].map(condition);
        else if (key === 'nutritionalIssues' && value?.[key]) text[key] = pick(value[key], ['reasoning'], ['symptoms']);
        else if (key === 'structuredAssessment' && value?.[key]?.assessment) {
            const assessment = value[key].assessment;
            text[key] = { assessment: { ...pick(assessment, [], ['follow_up_questions', 'additional_information_needed']),
                ...(assessment.primary_condition ? { primary_condition: condition(assessment.primary_condition) } : {}),
                ...(Array.isArray(assessment.alternative_conditions) ? { alternative_conditions: assessment.alternative_conditions.map(condition) } : {}),
            } };
        }
        else if (key === 'healthyCarePlan' && value?.[key] && typeof value[key] === 'object') {
            text[key] = Object.fromEntries(['dailyCare', 'weeklyCare', 'monthlyCare', 'bestPractices'].filter(field => list(value[key][field])).map(field => [field, list(value[key][field])]));
        } else if (typeof value?.[key] === 'string') text[key] = value[key];
    }
    return text;
};
export const applyScanTranslation = (source, translated) => {
    const text = localizedText(translated);
    const next = { ...source, ...text };
    for (const key of ['diagnosticEvidence', 'nutritionalIssues']) if (text[key]) next[key] = { ...source[key], ...text[key] };
    if (text.differentialDiagnoses) next.differentialDiagnoses = (source.differentialDiagnoses || []).map((item, i) => ({ ...(typeof item === 'string' ? { name: item } : item), ...text.differentialDiagnoses[i] }));
    if (text.structuredAssessment) {
        const original = source.structuredAssessment?.assessment || {};
        const translatedAssessment = text.structuredAssessment.assessment;
        next.structuredAssessment = { ...source.structuredAssessment, assessment: { ...original, ...translatedAssessment,
            ...(original.primary_condition ? { primary_condition: { ...original.primary_condition, ...translatedAssessment.primary_condition } } : {}),
            alternative_conditions: (original.alternative_conditions || []).map((item, i) => ({ ...item, ...translatedAssessment.alternative_conditions?.[i] })),
        } };
    }
    return next;
};
const fingerprint = source => {
    const text = JSON.stringify([source.id, source.analysisLanguage || source.language, localizedText(source)]);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(36);
};
const read = () => {
    try { const data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data : []; }
    catch { return []; }
};
const identity = (source, language, owner) => `${owner || 'guest'}:${source.id}:${fingerprint(source)}:${language}`;
export const getScanTranslation = (source, language, owner) => {
    if (!source?.id) return null;
    const entry = read().find(item => item.key === identity(source, language, owner));
    return entry ? { ...applyScanTranslation(source, entry.text), analysisLanguage: language } : null;
};
export const cacheScanTranslation = (source, translated, language, owner) => {
    if (!source?.id || translated?.analysisLanguage !== language) return false;
    const key = identity(source, language, owner);
    const entries = [{ key, text: localizedText(translated) }, ...read().filter(item => item.key !== key)].slice(0, 20);
    try { localStorage.setItem(KEY, JSON.stringify(entries)); return true; } catch { return false; }
};
