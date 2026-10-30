const normalize = (value) => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const fraction = (numerator, denominator, method, exclusions) => ({ numerator, denominator, value: denominator ? numerator / denominator : null, sampleSize: denominator, method, exclusions });

/** Aliases are explicit canonical mappings approved outside this module, never derived from predictions. */
export function compareCase(reference, prediction, aliases = {}) {
    if (prediction?.error || !prediction?.completed) return 'processing_failure';
    if (reference?.supported !== true) return 'unsupported_category';
    if (prediction.uncertain === true || prediction.abstained === true) return 'uncertain_or_abstained';
    const canonical = (label) => { const key = normalize(label); return normalize(Object.hasOwn(aliases, key) ? aliases[key] : key); };
    const cropRef = normalize(reference.crop); const cropPred = normalize(prediction.crop);
    const labelRef = normalize(reference.label); const labelPred = normalize(prediction.label);
    if (!cropRef || !cropPred || !labelRef || !labelPred) return 'unsupported_category';
    const sameCrop = canonical(cropRef) === canonical(cropPred);
    if (!sameCrop) return 'incorrect_prediction';
    if (labelRef === labelPred) return 'exact_match';
    if (canonical(labelRef) === canonical(labelPred)) return 'approved_synonym_match';
    return 'crop_match_condition_mismatch';
}

export function calculateMetrics(cases, { source = null, crop = null, aliases = {} } = {}) {
    if (!Array.isArray(cases)) throw new TypeError('Expected cases array');
    const rows = cases.filter((row) => (!source || row.source === source) && (!crop || normalize(row.reference?.crop) === normalize(crop))).map((row) => ({ ...row, match: compareCase(row.reference, row.prediction, aliases) }));
    const completed = rows.filter((row) => row.prediction?.completed && !row.prediction?.error);
    const evaluable = rows.filter((row) => ['exact_match', 'approved_synonym_match', 'crop_match_condition_mismatch', 'incorrect_prediction'].includes(row.match));
    const healthy = completed.filter((row) => row.reference?.supported === true && normalize(row.reference.label) === 'healthy' && ['healthy', 'unhealthy'].includes(normalize(row.prediction.healthStatus)));
    const cropEvaluable = completed.filter((row) => row.reference?.supported === true && normalize(row.reference.crop) && normalize(row.prediction.crop));
    const times = completed.filter((row) => row.prediction.cached !== true).map((row) => row.prediction.durationMs).filter((n) => Number.isFinite(n) && n >= 0);
    const costs = completed.map((row) => row.prediction.cost).filter((n) => Number.isFinite(n) && n >= 0);
    const matches = evaluable.filter((row) => ['exact_match', 'approved_synonym_match'].includes(row.match));
    const matrix = Object.create(null);
    for (const row of evaluable) { const truth = normalize(row.reference.label), predicted = normalize(row.prediction.label); matrix[truth] ??= Object.create(null); matrix[truth][predicted] = (matrix[truth][predicted] || 0) + 1; }
    return { source: source || 'all sources (interpret separately)', crop, attempted: rows.length, completed: completed.length,
        completion: fraction(completed.length, rows.length, 'completed / attempted', 'none'),
        coverage: fraction(evaluable.length, rows.length, 'evaluable / attempted', 'none'),
        diagnosticAgreement: fraction(matches.length, evaluable.length, 'exact or approved synonym / evaluable', 'failures, unsupported, abstained and uncertain'),
        cropAgreement: fraction(cropEvaluable.filter((r) => normalize(Object.hasOwn(aliases, normalize(r.reference.crop)) ? aliases[normalize(r.reference.crop)] : r.reference.crop) === normalize(Object.hasOwn(aliases, normalize(r.prediction.crop)) ? aliases[normalize(r.prediction.crop)] : r.prediction.crop)).length, cropEvaluable.length, 'matching crop / completed with supported and present crop labels', 'failures, unsupported and missing crop'),
        healthyFalseAlarm: fraction(healthy.filter((r) => normalize(r.prediction.healthStatus) === 'unhealthy').length, healthy.length, 'unhealthy prediction / supported healthy cases with known predicted health', 'failures and unknown predicted health'),
        uncertainty: fraction(completed.filter((r) => r.prediction.uncertain === true || r.prediction.abstained === true).length, completed.length, 'uncertain or abstained / completed', 'processing failures'),
        meanDurationMs: { numerator: times.reduce((a,b)=>a+b,0), denominator: times.length, value: times.length ? times.reduce((a,b)=>a+b,0)/times.length : null, method: 'sum duration / completed cases with duration', exclusions: 'cached responses and missing or invalid duration' },
        cost: { total: costs.length ? costs.reduce((a,b)=>a+b,0) : null, reportedCases: costs.length, currency: costs.length ? 'caller-supplied; ensure consistent currency' : null }, confusionMatrix: matrix,
        statuses: Object.fromEntries(['exact_match','approved_synonym_match','crop_match_condition_mismatch','incorrect_prediction','uncertain_or_abstained','unsupported_category','processing_failure'].map((status) => [status, rows.filter((r) => r.match === status).length])) };
}

export function calculateCropMetrics(cases, options = {}) {
    const crops = [...new Set(cases.map(row => normalize(row.reference?.crop)).filter(Boolean))].sort();
    return crops.map(crop => calculateMetrics(cases, { ...options, crop }));
}
