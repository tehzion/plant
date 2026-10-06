import { assessScanDecision, confidencePercent } from '../../shared/scanResultPolicy.js';

// Exact matching preserves non-Latin labels and prevents healthy/unhealthy substring matches.
const normalize = value => typeof value === 'string'
    ? value.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ') : '';
const healthState = value => {
    const text = normalize(value);
    if (['healthy', 'sihat', '健康'].includes(text)) return 'healthy';
    if (['unhealthy', 'disease', 'diseased', 'sakit', 'tidak sihat', '异常', '不健康'].includes(text)) return 'unhealthy';
    return null;
};
const candidateName = value => normalize(typeof value === 'string' ? value : value?.name);
const matches = (prediction, expected, aliases = []) => {
    const predicted = candidateName(prediction);
    return Boolean(predicted && [expected, ...aliases].map(normalize).filter(Boolean).includes(predicted));
};
const verifiedLabel = item => {
    const label = item?.label;
    return Boolean(label && label.reviewStatus === 'expert_verified'
        && typeof label.reviewedBy === 'string' && label.reviewedBy.trim() && label.reviewedBy.trim().toLowerCase() !== 'unknown'
        && Number.isFinite(Date.parse(label.reviewedAt))
        && normalize(label.crop) && normalize(label.diagnosis) && healthState(label.healthState)
        && (!label.approvedAliases || (Array.isArray(label.approvedAliases) && label.approvedAliases.every(alias => normalize(alias))))
        && (typeof item.scanId === 'string' && item.scanId.trim())
        && item.prediction && typeof item.prediction === 'object' && !Array.isArray(item.prediction));
};

const wilsonInterval = (successes, total, z = 1.96) => {
    if (!total) return null;
    const p = successes / total;
    const denominator = 1 + ((z * z) / total);
    const centre = (p + ((z * z) / (2 * total))) / denominator;
    const margin = (z / denominator) * Math.sqrt((p * (1 - p) / total) + ((z * z) / (4 * total * total)));
    return { low: Math.max(0, centre - margin), high: Math.min(1, centre + margin) };
};

export const evaluateExpertBenchmark = (cases = [], { minimumCases = 20 } = {}) => {
    if (!Array.isArray(cases)) throw new TypeError('Expected an array of expert-reviewed cases');
    if (!Number.isInteger(minimumCases) || minimumCases < 1) throw new TypeError('minimumCases must be a positive integer');
    const seen = new Set();
    const rows = cases.filter(item => {
        if (!verifiedLabel(item) || seen.has(item.scanId)) return false;
        seen.add(item.scanId); return true;
    });
    const base = { sampleSize: rows.length, submittedCases: cases.length,
        excludedCases: cases.length - rows.length, requiredCases: minimumCases,
        note: 'These metrics describe only expert-reviewed cases. Use fresh predictions and separate plants and farms between training examples and evaluation.' };
    if (rows.length < minimumCases) return { ...base, status: 'awaiting_expert_labels',
        top1Rate: null, top3Rate: null, healthStateAccuracy: null, confidentlyWrongRate: null,
        retakeRate: null, reviewRate: null, cropResults: {} };
    const cropStats = new Map();
    let top1 = 0, top3 = 0, healthCorrect = 0, healthAssessed = 0, confidentlyWrong = 0, retake = 0, review = 0, treatmentGatingFailures = 0;
    const modelVersions = new Set();
    const policyVersions = new Set();
    const caseMix = { healthy: 0, diseaseOrPest: 0, nutrientOrEnvironmental: 0, difficultPhoto: 0 };
    for (const item of rows) {
        const prediction = item.prediction;
        const expected = item.label;
        const candidates = [...new Set([prediction.disease, ...(Array.isArray(prediction.differentialDiagnoses) ? prediction.differentialDiagnoses : [])]
            .map(candidateName).filter(Boolean))].slice(0, 3);
        const isTop1 = matches(prediction.disease, expected.diagnosis, expected.approvedAliases);
        const isTop3 = candidates.some(value => matches(value, expected.diagnosis, expected.approvedAliases));
        const decision = assessScanDecision(prediction);
        const explicitReview = prediction.needsReview || prediction.needsMoreEvidence || prediction.expertReviewRequired;
        const requiresReview = Boolean(decision.needsReview || explicitReview);
        const predictedHealth = requiresReview ? null : healthState(prediction.healthStatus || prediction.healthState || prediction.resultState);
        const health = predictedHealth !== null && predictedHealth === healthState(expected.healthState);
        const confidence = confidencePercent(prediction.diagnosisConfidence ?? prediction.confidenceBreakdown?.diagnosisConfidence ?? prediction.confidence);
        const wrong = !isTop1 && confidence !== null && confidence >= 80;
        const metadata = prediction.analysisMetadata || {};
        if (metadata.model || item.modelVersion) modelVersions.add(String(metadata.model || item.modelVersion));
        if (metadata.policyVersion || item.policyVersion) policyVersions.add(String(metadata.policyVersion || item.policyVersion));
        if (healthState(expected.healthState) === 'healthy') caseMix.healthy += 1;
        else if (/nutrient|environment|abiotic/i.test(`${expected.causeCategory || ''} ${expected.diagnosis || ''}`)) caseMix.nutrientOrEnvironmental += 1;
        else caseMix.diseaseOrPest += 1;
        if (item.label.difficultPhoto || prediction.requiresRetake || prediction.needsMoreEvidence) caseMix.difficultPhoto += 1;
        if (decision.treatmentEligible && healthState(expected.healthState) === 'healthy') treatmentGatingFailures += 1;
        top1 += Number(isTop1); top3 += Number(isTop3);
        healthAssessed += Number(predictedHealth !== null); healthCorrect += Number(health);
        confidentlyWrong += Number(wrong); retake += Number(decision.requiresRetake); review += Number(requiresReview);
        const stat = cropStats.get(expected.crop) || { cases: 0, top1: 0, top3: 0, healthCorrect: 0, healthAssessed: 0 };
        stat.cases++; stat.top1 += Number(isTop1); stat.top3 += Number(isTop3);
        stat.healthCorrect += Number(health); stat.healthAssessed += Number(predictedHealth !== null);
        cropStats.set(expected.crop, stat);
    }
    const rate = count => count / rows.length;
    return { ...base, status: 'evaluated', top1Rate: rate(top1), top3Rate: rate(top3),
        healthStateAccuracy: healthAssessed ? healthCorrect / healthAssessed : null,
        healthAssessedCases: healthAssessed, healthCoverage: rate(healthAssessed),
        confidentlyWrongRate: rate(confidentlyWrong), retakeRate: rate(retake), reviewRate: rate(review),
        top1ConfidenceInterval: wilsonInterval(top1, rows.length),
        top3ConfidenceInterval: wilsonInterval(top3, rows.length),
        healthStateConfidenceInterval: wilsonInterval(healthCorrect, healthAssessed),
        confidentlyWrongConfidenceInterval: wilsonInterval(confidentlyWrong, rows.length),
        treatmentGatingFailures,
        treatmentGatingInvariantPassed: treatmentGatingFailures === 0,
        modelVersions: [...modelVersions],
        policyVersions: [...policyVersions],
        caseMix,
        cropResults: Object.fromEntries([...cropStats].map(([crop, stat]) => [crop, { ...stat,
            top1Rate: stat.top1 / stat.cases, top3Rate: stat.top3 / stat.cases,
            healthStateAccuracy: stat.healthAssessed ? stat.healthCorrect / stat.healthAssessed : null,
            top1ConfidenceInterval: wilsonInterval(stat.top1, stat.cases),
            top3ConfidenceInterval: wilsonInterval(stat.top3, stat.cases) }])) };
};
