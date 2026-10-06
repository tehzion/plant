import { assessScanDecision, confidencePercent } from '../../shared/scanResultPolicy.js';

// These labels come from a separately maintained expert file, never the public feedback API.
export const isExpertLabel = (label) => Boolean(label
    && label.reviewStatus === 'expert_verified'
    && typeof label.reviewedBy === 'string' && label.reviewedBy.trim() && label.reviewedBy.trim().toLowerCase() !== 'unknown'
    && Number.isFinite(Date.parse(label.reviewedAt))
    && typeof label.correctHealthy === 'boolean'
    && typeof label.correctDisease === 'string' && label.correctDisease.trim()
    && typeof label.correctCrop === 'string' && label.correctCrop.trim()
    && (!label.diseaseAliases || (Array.isArray(label.diseaseAliases) && label.diseaseAliases.every(name => typeof name === 'string' && name.trim())))
    && ['healthy', 'fungal', 'bacterial', 'viral', 'pest', 'nutrient', 'environmental', 'unknown'].includes(label.correctCauseCategory));

const normalize = (value) => String(value || '').normalize('NFKC').trim().toLowerCase();
export const evaluateScanQuality = (entries, minimum = 20) => {
    const verified = entries.filter(isExpertLabel);
    const seen = new Set();
    const cases = verified.filter(entry => {
        if (!entry.scanId || seen.has(entry.scanId)) return false;
        seen.add(entry.scanId); return true;
    });
    if (cases.length < minimum) return { status: 'awaiting_expert_labels', verifiedCases: cases.length, requiredCases: minimum };
    const byCrop = {};
    let correct = 0, top3 = 0, confident = 0, confidentlyWrong = 0, healthyCorrect = 0, retakes = 0, reviews = 0;
    const calibration = {};
    for (const entry of cases) {
        const scan = entry.result || { disease: entry.predictedDisease, healthStatus: entry.predictedHealthStatus,
            confidence: entry.confidence, status: entry.predictedStatus, diseaseCategory: entry.predictedPathogenType,
            resultState: entry.resultState, differentialDiagnoses: entry.differentialDiagnoses };
        const decision = assessScanDecision(scan);
        const acceptedNames = [entry.correctDisease, ...(entry.diseaseAliases || [])].map(normalize);
        const hit = acceptedNames.includes(normalize(scan.disease));
        const candidates = [...new Set([normalize(scan.disease), ...(scan.differentialDiagnoses || [])
            .map(item => normalize(typeof item === 'string' ? item : item?.name))].filter(Boolean))].slice(0, 3);
        correct += Number(hit);
        top3 += Number(candidates.some(name => acceptedNames.includes(name)));
        retakes += Number(decision.requiresRetake);
        reviews += Number(decision.needsReview);
        if (!decision.needsReview) {
            confident++; confidentlyWrong += Number(!hit);
            healthyCorrect += Number(decision.healthy === entry.correctHealthy);
        }
        const crop = entry.correctCrop;
        byCrop[crop] ||= { cases: 0, correct: 0, confidentlyWrong: 0 };
        byCrop[crop].cases++; byCrop[crop].correct += Number(hit);
        byCrop[crop].confidentlyWrong += Number(!decision.needsReview && !hit);
        const score = confidencePercent(scan.diagnosisConfidence ?? scan.confidence);
        if (score !== null) {
            const bucket = Math.min(90, Math.floor(score / 10) * 10);
            calibration[bucket] ||= { cases: 0, correct: 0 };
            calibration[bucket].cases++; calibration[bucket].correct += Number(hit);
        }
    }
    const rate = count => count / cases.length;
    return { status: 'evaluated', verifiedCases: cases.length, top1Accuracy: rate(correct),
        top3HitRate: rate(top3), healthyAccuracy: confident ? healthyCorrect / confident : null,
        confidentCases: confident, confidentlyWrongCases: confidentlyWrong,
        confidentlyWrongRate: confident ? confidentlyWrong / confident : null,
        retakeRate: rate(retakes), reviewRate: rate(reviews), byCrop, calibration,
        note: 'Results describe only these reviewed cases; use fresh predictions and a farm-separated holdout to compare releases.' };
};
