import { useLanguage } from '../i18n/i18n.jsx';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';
import { getDiagnosisStatusLabel } from '../utils/diagnosisStatusLabels.js';

export const nextScanStep = (result, copy) => result.requiresRetake ? copy.nextRetake
    : result.healthy ? copy.nextHealthy : result.treatmentEligible ? copy.nextTreat : copy.nextScout;

const ScanDecisionSummary = ({ result }) => {
    const { language, t } = useLanguage();
    const copy = getScanQualityCopy(language);
    const observations = result.diagnosticEvidence?.evidenceFor?.length
        ? result.diagnosticEvidence.evidenceFor : result.symptoms || [];
    const limits = [result.abstainReason, result.retakeReason,
        ...(result.diagnosticEvidence?.evidenceAgainst || [])].filter(Boolean);
    return <section className={`scan-decision app-surface scan-decision--${result.tone}`} aria-label={copy.primary}>
        <h2>{result.disease || t('results.unknownDisease')}</h2>
        <p className="scan-decision-status">{getDiagnosisStatusLabel(t, result.resultState)}</p>
        <h3>{copy.observations}</h3>
        {observations.length ? <ul>{observations.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>{copy.noEvidence}</p>}
        {limits.length > 0 && <><h3>{copy.limits}</h3><ul>{[...new Set(limits)].slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}</ul></>}
        <h3>{copy.next}</h3><p>{nextScanStep(result, copy)}</p>
        <p className="scan-score-note">{copy.scoreNote}</p>
    </section>;
};
export default ScanDecisionSummary;
