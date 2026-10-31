import { useLanguage } from '../i18n/i18n.jsx';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';
import { getDiagnosisStatusLabel } from '../utils/diagnosisStatusLabels.js';
import { CONFIDENCE_LEVEL_FALLBACK_LABELS } from '../../shared/diseaseAssessment.js';

export const nextScanStep = (result, copy) => result.requiresRetake ? copy.nextRetake
    : result.healthy ? copy.nextHealthy : result.treatmentEligible ? copy.nextTreat : copy.nextScout;

const ScanDecisionSummary = ({ result, expertReview = null }) => {
    const { language, t } = useLanguage();
    const copy = getScanQualityCopy(language);
    const observations = result.diagnosticEvidence?.evidenceFor?.length
        ? result.diagnosticEvidence.evidenceFor : result.symptoms || [];
    const limits = [result.abstainReason, result.retakeReason,
        ...(result.diagnosticEvidence?.evidenceAgainst || [])].filter(Boolean);
    const plantLabel = result.plantType || result.category || t('common.unknown');
    const severityKey = result.severity ? `results.${String(result.severity).toLowerCase()}` : '';
    const translatedSeverity = severityKey ? t(severityKey) : '';
    const severityLabel = translatedSeverity && translatedSeverity !== severityKey
        ? translatedSeverity
        : (result.severity || t('results.notRecorded'));
    const hasScore = result.confidence !== null && result.confidence !== undefined;
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    // Structured assessment (schema v1) adds descriptive confidence and the
    // follow-up evidence a farmer can collect; older scans simply omit them.
    const assessment = result.structuredAssessment?.assessment || null;
    const confidenceLevel = assessment?.confidence_level || result.confidenceLevel || null;
    const plantStatus = result.structuredAssessment?.plant?.identification_status;
    const reviewText = expertReview?.verdict === 'corrected'
        ? label('assessment.ux.expertCorrected', "The expert's diagnosis: {name}").replace('{name}', expertReview.correctedDiagnosis || expertReview.correctedCrop || '')
        : expertReview?.verdict === 'confirmed'
            ? label('assessment.ux.expertConfirmed', 'The expert agreed with this result.')
            : label('assessment.ux.expertUncertain', 'The expert needs more information to confirm this result.');
    const summaryLabel = result.healthy ? t('results.healthy') : copy.primary;
    return <section className={`scan-decision app-surface scan-decision--${result.tone}`} aria-label={summaryLabel}>
        <div className="scan-decision__header">
            <div>
                <p className="scan-decision__eyebrow">
                    {result.isDemo ? t('results.demoModeTitle') : summaryLabel}
                </p>
                <h2>{result.disease || t('results.unknownDisease')}</h2>
                <p className="scan-decision-status">{getDiagnosisStatusLabel(t, result.resultState)}</p>
            </div>
            <span className={`scan-decision__state scan-decision__state--${result.tone}`} aria-hidden="true">
                {result.healthy ? '01' : result.requiresRetake ? '03' : '02'}
            </span>
        </div>
        <div className="scan-decision__meta" role="list">
            <div role="listitem"><span>{t('results.plantType')}</span><strong>{plantLabel}
                {['uncertain', 'unknown'].includes(plantStatus) && <small className="scan-decision__plant-uncertain">{label('assessment.plantUncertain', 'Plant type not certain')}</small>}
            </strong></div>
            <div role="listitem"><span>{t('results.severity')}</span><strong>{severityLabel}</strong></div>
            {confidenceLevel ? (
                <div role="listitem"><span>{label('assessment.confidenceLabel', 'How sure')}</span><strong>
                    <span className={`confidence-chip confidence-chip--${confidenceLevel}`}>{label(`assessment.confidence.${confidenceLevel}`, CONFIDENCE_LEVEL_FALLBACK_LABELS[confidenceLevel] || confidenceLevel)}</span>
                    {hasScore && <small> {Math.round(Number(result.confidence))}% {t('results.estimate') || 'estimate'}</small>}
                </strong></div>
            ) : hasScore && <div role="listitem"><span>{t('results.confidence')}</span><strong>{Math.round(Number(result.confidence))}% <small>{t('results.estimate') || 'estimate'}</small></strong></div>}
        </div>
        {expertReview && (
            <div className={`scan-decision__expert scan-decision__expert--${expertReview.verdict}`} role="note">
                <strong>{label('assessment.ux.expertReviewed', 'Reviewed by an agricultural expert')}</strong>
                <span>{reviewText}</span>
            </div>
        )}
        <h3>{copy.observations}</h3>
        {observations.length ? <ul>{observations.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>{copy.noEvidence}</p>}
        {assessment?.needs_expert_review && !expertReview && <p className="scan-decision__review-note" role="note">{label('assessment.expertReviewNote', 'Ask an agricultural expert to check this result before buying or spraying any chemical.')}</p>}
        {limits.length > 0 && (
            <details className="scan-decision__why">
                <summary>{label('assessment.ux.whyTitle', 'Why we think this')}</summary>
                <h3>{copy.limits}</h3>
                <ul>{[...new Set(limits)].slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}</ul>
            </details>
        )}
        <p className="scan-score-note">{result.isDemo ? t('results.demoModeDesc') : copy.scoreNote}</p>
    </section>;
};
export default ScanDecisionSummary;
