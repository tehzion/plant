export function summarizeDecisionShadow(records) {
    const report = { records: records.length, checked: 0, unavailable: 0, skipped: 0, unobserved: 0,
        wouldAddReview: 0, baselineHealthy: 0, shadowHealthy: 0, baselineTreatment: 0, shadowTreatment: 0,
        knownCostUsd: 0, pricedRequests: 0, unpricedRequests: 0, timedRequests: 0, durationMs: 0, reasons: {} };
    for (const row of records) {
        const shadow = row.metadata?.decisionShadow;
        if (!shadow) {report.unobserved++; continue;}
        if (shadow.status === 'skipped') {report.skipped++; continue;}
        if (!['checked','unavailable'].includes(shadow.status)) {report.unobserved++; continue;}
        report[shadow.status]++;
        if (typeof shadow.costUsd === 'number' && Number.isFinite(shadow.costUsd) && shadow.costUsd >= 0) {
            report.knownCostUsd += shadow.costUsd;report.pricedRequests++;
        } else report.unpricedRequests++;
        if (Number.isFinite(shadow.durationMs) && shadow.durationMs >= 0) {report.durationMs += shadow.durationMs;report.timedRequests++;}
        if (shadow.status !== 'checked') continue;
        report.wouldAddReview += Number(shadow.wouldAddReview === true);
        report.baselineHealthy += Number(shadow.baselineState === 'healthy');report.shadowHealthy += Number(shadow.shadowState === 'healthy');
        report.baselineTreatment += Number(shadow.baselineState === 'confident_treatment');report.shadowTreatment += Number(shadow.shadowState === 'confident_treatment');
        for (const reason of shadow.reasons || []) report.reasons[reason] = (report.reasons[reason] || 0)+1;
    }
    return {...report,meanAddedLatencyMs:report.timedRequests ? report.durationMs/report.timedRequests : null,
        note:'Hypothetical routing and coverage only. No accuracy or treatment-safety conclusion is possible without independent labels. Limits and costs are per process, not global.'};
}
