import { confidencePercent } from '../../shared/scanResultPolicy.js';

export const validateDiagnosisStage = (stage) => {
    const diagnosis = stage?.diagnosis_assessment;
    const capture = stage?.capture_assessment;
    const issues = [];
    if (!diagnosis || typeof diagnosis !== 'object' || Array.isArray(diagnosis)) issues.push('missing_diagnosis');
    if (!capture || typeof capture !== 'object' || Array.isArray(capture)) issues.push('missing_capture_assessment');
    if (typeof diagnosis?.primaryDiagnosis !== 'string' || !diagnosis.primaryDiagnosis.trim()) issues.push('missing_diagnosis_label');
    if (!['healthy', 'unhealthy'].includes(diagnosis?.healthStatus)) issues.push('invalid_health_status');
    if (!['mild', 'moderate', 'severe', 'critical'].includes(diagnosis?.severity)) issues.push('invalid_severity');
    if (typeof diagnosis?.diagnosisConfidence !== 'number' || confidencePercent(diagnosis.diagnosisConfidence) === null) issues.push('missing_diagnosis_confidence');
    if (typeof capture?.imageQualityConfidence !== 'number' || confidencePercent(capture.imageQualityConfidence) === null) issues.push('missing_image_assessment');
    for (const field of ['requiresRetake']) {
        if (typeof capture?.[field] !== 'boolean') issues.push(`invalid_${field}`);
    }
    if (typeof (capture?.detailSufficient ?? capture?.leafDetailSufficient) !== 'boolean') issues.push('invalid_detailSufficient');
    for (const field of ['needsMoreEvidence']) {
        if (typeof diagnosis?.[field] !== 'boolean') issues.push(`invalid_${field}`);
    }
    if (!Array.isArray(diagnosis?.symptoms) || diagnosis.symptoms.some(item => typeof item !== 'string')) issues.push('invalid_symptoms');
    const evidence = diagnosis?.diagnosticEvidence;
    if (!evidence || !Array.isArray(evidence.evidenceFor) || !Array.isArray(evidence.evidenceAgainst)
        || [...evidence.evidenceFor, ...evidence.evidenceAgainst].some(item => typeof item !== 'string')) issues.push('missing_evidence');
    if (diagnosis?.healthStatus === 'unhealthy' && !evidence?.evidenceFor?.length) issues.push('missing_supporting_evidence');
    if (diagnosis?.healthStatus === 'healthy' && diagnosis?.diseaseCategory !== 'healthy') issues.push('conflicting_health_evidence');
    return issues;
};
