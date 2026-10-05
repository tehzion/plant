const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');

const matches = (prediction, expected, aliases = []) => {
    const predicted = normalize(prediction);
    const expectedText = normalize(expected);
    if (!predicted || !expectedText) return false;
    if (predicted === expectedText || predicted.includes(expectedText) || expectedText.includes(predicted)) return true;
    return aliases.some((alias) => {
        const normalized = normalize(alias);
        return normalized && (predicted.includes(normalized) || normalized.includes(predicted));
    });
};

export const evaluateExpertBenchmark = (cases = []) => {
    const rows = Array.isArray(cases) ? cases : [];
    const cropStats = new Map();
    let top1 = 0; let top3 = 0; let healthCorrect = 0; let confidentlyWrong = 0; let retake = 0; let review = 0;
    rows.forEach((item) => {
        const prediction = item.prediction || {};
        const expected = item.label || {};
        const candidates = [prediction.disease, ...(Array.isArray(prediction.differentialDiagnoses) ? prediction.differentialDiagnoses : [])];
        const aliases = Array.isArray(expected.approvedAliases) ? expected.approvedAliases : [];
        const isTop1 = matches(candidates[0], expected.diagnosis, aliases);
        const isTop3 = candidates.slice(0, 3).some((value) => matches(value, expected.diagnosis, aliases));
        const predictedHealth = normalize(prediction.healthStatus || prediction.healthState || prediction.resultState);
        const health = matches(predictedHealth, expected.healthState, []);
        if (isTop1) top1 += 1;
        if (isTop3) top3 += 1;
        if (health) healthCorrect += 1;
        const confidence = Number(prediction.confidence);
        if (!isTop1 && Number.isFinite(confidence) && confidence >= 80) confidentlyWrong += 1;
        if (prediction.requiresRetake || prediction.needsMoreEvidence) retake += 1;
        if (prediction.expertReviewRequired || prediction.resultState === 'expert_review_needed') review += 1;
        const crop = expected.crop || item.crop || 'unknown';
        const stat = cropStats.get(crop) || { cases: 0, top1: 0, top3: 0, healthCorrect: 0 };
        stat.cases += 1; stat.top1 += isTop1 ? 1 : 0; stat.top3 += isTop3 ? 1 : 0; stat.healthCorrect += health ? 1 : 0;
        cropStats.set(crop, stat);
    });
    const total = rows.length || 1;
    return {
        sampleSize: rows.length,
        top1Rate: top1 / total,
        top3Rate: top3 / total,
        healthStateAccuracy: healthCorrect / total,
        confidentlyWrongRate: confidentlyWrong / total,
        retakeRate: retake / total,
        reviewRate: review / total,
        cropResults: Object.fromEntries([...cropStats.entries()].map(([crop, stat]) => [crop, {
            ...stat, top1Rate: stat.top1 / stat.cases, top3Rate: stat.top3 / stat.cases, healthStateAccuracy: stat.healthCorrect / stat.cases,
        }])),
    };
};
