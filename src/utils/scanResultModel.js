import { assessScanDecision, confidencePercent, getScanSectionPolicy, isNoIssueDiagnosis } from '../../shared/scanResultPolicy.js';
import { normalizeNutritionalIssues, resolveScanNutrition } from './nutritionUtils.js';
import { getStandardizedSeverity } from './statusUtils.js';
import { getScanQualityCopy, scoutCheckLines } from '../../shared/scanQualityCopy.js';

const list = (value) => Array.isArray(value) ? value.filter(item => typeof item === 'string')
    : typeof value === 'string' ? value.split(/\r?\n|•|;/).map(item => item.trim()).filter(Boolean) : [];

export const buildScanResultModel = (input = {}, language = input.analysisLanguage || 'en') => {
    // A saved result re-checked under newer rules may become more cautious, never less: if it was
    // shown as needing review, it stays that way even if today's rules would allow treatment.
    const heldForReview = input.decisionSnapshot?.needsReview === true && !assessScanDecision(input).needsReview;
    const scan = heldForReview ? { ...input, needsReview: true } : input;
    const decision = assessScanDecision(scan);
    const copy = getScanQualityCopy(language);
    const nutritionalIssues = resolveScanNutrition(normalizeNutritionalIssues(scan.nutritionalIssues), scan, decision);
    const sectionPolicy = getScanSectionPolicy({ ...scan, nutritionalIssues });
    return {
        ...scan,
        ...decision,
        sectionPolicy,
        confidence: confidencePercent(scan.confidence) ?? decision.confidence,
        diagnosisConfidence: decision.confidence,
        disease: decision.needsReview && isNoIssueDiagnosis(scan.disease) ? copy.inconclusive : scan.disease,
        additionalNotes: scan.additionalNotes || scan.abstainReason || scan.retakeReason
            || (decision.healthy ? copy.nextHealthy : decision.treatmentEligible ? copy.nextTreat : copy.nextScout),
        symptoms: list(scan.symptoms),
        immediateActions: decision.needsReview
            ? [...(decision.urgent ? [copy.urgent] : []), ...(decision.requiresRetake ? [copy.nextRetake] : [copy.nextScout, ...scoutCheckLines(scan, language)])]
            : list(scan.immediateActions),
        prevention: decision.needsReview ? [] : list(scan.prevention),
        diagnosticEvidence: { ...scan.diagnosticEvidence,
            evidenceFor: list(scan.diagnosticEvidence?.evidenceFor),
            evidenceAgainst: list(scan.diagnosticEvidence?.evidenceAgainst),
        },
        healthStatus: decision.healthy ? 'healthy' : 'unhealthy',
        severity: getStandardizedSeverity(scan.severity),
        nutritionalIssues,
        // Uncertain records may contain old or speculative treatment text.
        treatments: decision.treatmentEligible ? list(scan.treatments) : [],
    };
};
