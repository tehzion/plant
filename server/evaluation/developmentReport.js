import { assessScanDecision, confidencePercent, isNoIssueDiagnosis } from '../../shared/scanResultPolicy.js';
import { canonicalCrop } from './cropNames.js';
import { referenceTerms, compareCondition } from './datasetLabels.js';

const fraction = (numerator, denominator) => ({ numerator, denominator, value: denominator ? numerator / denominator : null });
const name = value => typeof value === 'string' ? value : value?.name;
const norm = value => String(value || '').toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();

export function summarizeDevelopment(rows) {
    if (!Array.isArray(rows)) throw Error('Expected assessment records');
    const seen = new Set();
    for (const row of rows) {
        if (!row.checksum || !row.runId || seen.has(`${row.runId}:${row.checksum}`)) throw Error('Missing or duplicate run/image identity');
        seen.add(`${row.runId}:${row.checksum}`);
    }
    const summarize = records => {
        const out = { attempted: records.length, completed: 0, failed: 0, reviewed: 0, retakes: 0, cropCorrect: 0,
            top1: 0, top3: 0, healthyReferences: 0, diseasedReferences: 0, missedDisease: 0, rawFalseHealthy: 0, healthyFalseAlarm: 0,
            incorrectTreatment: 0, treatmentEligible: 0, confidentWrong: 0, timedCases: 0, durationTotal: 0,
            costReported: 0, costUsd: 0, errors: [], safetyCases: [] };
        for (const row of records) {
            const p = row.prediction;
            if (row.completed !== true || !p?.disease || !p?.plantType || p.error) {
                out.failed++; out.errors.push({checksum:row.checksum, error:p?.error || 'Incomplete assessment'}); continue;
            }
            out.completed++;
            const d = assessScanDecision(p);
            const review = Boolean(d.needsReview || d.requiresRetake || p.needsReview || p.expertReviewRequired);
            out.reviewed += Number(review); out.retakes += Number(d.requiresRetake);
            const healthy = referenceTerms(row.originalLabel).healthy;
            out[healthy ? 'healthyReferences' : 'diseasedReferences']++;
            // Score the named diagnosis even on review cases; report operational coverage separately.
            const top1 = healthy ? isNoIssueDiagnosis(p.disease) && p.healthStatus === 'healthy' : compareCondition(row.originalLabel, p, false) === 'match';
            const candidates = [p.disease, ...(p.differentialDiagnoses || []).map(name)].filter(Boolean);
            const unique = [...new Set(candidates.map(norm))].slice(0,3);
            const top3 = healthy ? unique.some(isNoIssueDiagnosis) : unique.some(disease => compareCondition(row.originalLabel, {...p, disease,
                healthStatus: /^(healthy|no issues)$/.test(disease) ? 'healthy' : 'unhealthy'}, false) === 'match');
            const cropCorrect = canonicalCrop(row.crop) === canonicalCrop(p.plantType);
            out.cropCorrect += Number(cropCorrect); out.top1 += Number(top1); out.top3 += Number(top3);
            const missed = !healthy && d.healthy;
            const wrongTreatment = d.treatmentEligible && (!top1 || !cropCorrect || healthy);
            out.missedDisease += Number(missed);
            out.rawFalseHealthy += Number(!healthy && p.healthStatus === 'healthy');
            out.healthyFalseAlarm += Number(healthy && d.treatmentEligible);
            out.incorrectTreatment += Number(wrongTreatment);
            out.treatmentEligible += Number(d.treatmentEligible);
            const confidence = confidencePercent(p.diagnosisConfidence ?? p.confidence);
            out.confidentWrong += Number(!top1 && confidence !== null && confidence >= 80);
            if (missed || wrongTreatment) out.safetyCases.push({checksum:row.checksum, reference:row.originalLabel,
                predicted:p.disease, missedDisease:missed, incorrectTreatment:wrongTreatment});
            if (p.cached !== true && Number.isFinite(row.durationMs) && row.durationMs >= 0) {
                out.timedCases++; out.durationTotal += row.durationMs;
            }
            if (Number.isFinite(row.costUsd) && row.costUsd >= 0) {out.costReported++; out.costUsd += row.costUsd;}
        }
        return {...out, completion: fraction(out.completed,out.attempted), top1Agreement:fraction(out.top1,out.completed),
            top3Agreement:fraction(out.top3,out.completed), endToEndTop1:fraction(out.top1,out.attempted),
            cropAgreement:fraction(out.cropCorrect,out.completed), reviewRate:fraction(out.reviewed,out.completed),
            retakeRate:fraction(out.retakes,out.completed), missedDiseaseRate:fraction(out.missedDisease,out.diseasedReferences),
            incorrectTreatmentRate:fraction(out.incorrectTreatment,out.completed),
            incorrectAmongTreatments:fraction(out.incorrectTreatment,out.treatmentEligible),
            meanDurationMs:out.timedCases ? out.durationTotal/out.timedCases : null};
    };
    const group = fn => Object.fromEntries([...new Set(rows.map(fn))].sort().map(key => [key,summarize(rows.filter(r => fn(r)===key))]));
    return { schemaVersion:1, note:'Exploratory dataset-label agreement on development images; heuristic label aliases, unverified labels, no field-accuracy claim. Review cases remain in diagnosis denominators. Crop matching uses exact names plus explicit source naming equivalents (maize/corn, bell pepper and cherry). Stored predictions are re-scored under the current policy, not reconstructed historical treatment decisions. Repeated images across runs are not independent samples.',
        overall:summarize(rows), byRun:group(r=>r.runId), byCrop:group(r=>canonicalCrop(r.crop)),
        byCondition:group(r=>`${canonicalCrop(r.crop)} / ${r.originalLabel}`), bySource:group(r=>r.source),
        byModel:group(r=>r.prediction?.analysisMetadata?.model || 'unrecorded') };
}
const pct = metric => metric.denominator ? `${(100*metric.value).toFixed(1)}% (${metric.numerator}/${metric.denominator})` : 'N/A (0 cases)';
export function developmentReportMarkdown(report) {
    let text = `# Development diagnosis report\n\n${report.note}\n\nFailed requests remain in completion and end-to-end denominators. Review/retake cases are not removed from diagnosis agreement. Treatment metrics describe policy eligibility, not administered treatment or verified clinical suitability.\n`;
    for (const [section, groups] of Object.entries({Overall:{all:report.overall},Runs:report.byRun,Crops:report.byCrop,Conditions:report.byCondition,Sources:report.bySource,Models:report.byModel})) {
        text += `\n## ${section}\n\n| Group | Completed / attempted | Top 1 | Top 3 | Review | Missed disease | Incorrect treatment | Mean ms |\n|---|---:|---|---|---|---|---|---:|\n`;
        for (const [key,s] of Object.entries(groups)) text += `| ${key.replaceAll('|','/').replaceAll('\n',' ')} | ${s.completed}/${s.attempted} | ${pct(s.top1Agreement)} | ${pct(s.top3Agreement)} | ${pct(s.reviewRate)} | ${pct(s.missedDiseaseRate)} | ${pct(s.incorrectTreatmentRate)} | ${s.meanDurationMs === null ? 'N/A' : Math.round(s.meanDurationMs)} |\n`;
    }
    return text;
}

/** Pair by checksum, never compare unequal cohorts as if they were paired. */
export function compareDevelopmentRuns(rows, baselineRun, candidateRun) {
    const baseline=new Map(rows.filter(r=>r.runId===baselineRun).map(r=>[r.checksum,r]));
    const candidate=new Map(rows.filter(r=>r.runId===candidateRun).map(r=>[r.checksum,r]));
    if(baseline.size!==rows.filter(r=>r.runId===baselineRun).length || candidate.size!==rows.filter(r=>r.runId===candidateRun).length) throw Error('Duplicate paired records');
    const paired=[...baseline.keys()].filter(k=>candidate.has(k));
    const differences=[];
    for(const checksum of paired) {
        const a=baseline.get(checksum),b=candidate.get(checksum);
        if(a.crop!==b.crop || a.originalLabel!==b.originalLabel || a.source!==b.source) throw Error('Paired reference mismatch');
        const sa=summarizeDevelopment([a]).overall,sb=summarizeDevelopment([b]).overall;
        differences.push({checksum,baselineCompleted:sa.completed===1,candidateCompleted:sb.completed===1,
            top1Change:sb.top1-sa.top1,top3Change:sb.top3-sa.top3,reviewChange:sb.reviewed-sa.reviewed,
            missedDiseaseChange:sb.missedDisease-sa.missedDisease,incorrectTreatmentChange:sb.incorrectTreatment-sa.incorrectTreatment});
    }
    return {baselineRun,candidateRun,pairedImages:paired.length,
        missingCandidate:[...baseline.keys()].filter(k=>!candidate.has(k)),missingBaseline:[...candidate.keys()].filter(k=>!baseline.has(k)),
        baseline:summarizeDevelopment(paired.map(k=>baseline.get(k))).overall,candidate:summarizeDevelopment(paired.map(k=>candidate.get(k))).overall,
        wins:differences.filter(d=>d.top1Change>0).length,losses:differences.filter(d=>d.top1Change<0).length,differences};
}
