import { useLanguage } from '../i18n/i18n.jsx';
import { Camera, CircleHelp, ShieldCheck, Stethoscope } from 'lucide-react';

export const nextScanStep = (result, copy) => result.requiresRetake ? copy.nextRetake
    : result.healthy ? copy.nextHealthy : result.treatmentEligible ? copy.nextTreat : copy.nextScout;

const ScanDecisionSummary = ({ result, expertReview = null, image }) => {
    const { t } = useLanguage();
    const state = result.requiresRetake ? 'retake' : result.healthy ? 'healthy' : result.needsReview ? 'review' : 'disease';
    const Icon = { retake: Camera, healthy: ShieldCheck, review: CircleHelp, disease: Stethoscope }[state];
    const headline = state === 'disease' ? result.disease || t('results.unknownDisease') : t(`results.headline${state}`);
    return <section className={`scan-decision app-surface scan-decision--${state}`} aria-label={result.healthy ? t('results.healthy') : headline}>
        <div className="scan-decision__identity">
            <div>
                <Icon size={28} aria-hidden="true" />
                <h1>{headline}</h1>
                <p>{result.plantType || result.category || t('common.unknown')}</p>
            </div>
            {image && <img className="scan-decision__photo" src={image} alt={t('results.plantPhoto')} />}
        </div>
        {result.requiresRetake && <p>{result.retakeReason || t('results.retakeHint')}</p>}
        {result.healthy && <p>{t('results.healthyRelief')}</p>}
        {!result.healthy && !result.needsReview && <p>{t('results.severity')}: <strong>{t(`results.${String(result.severity).toLowerCase()}`)}</strong></p>}
        {result.structuredAssessment?.assessment?.needs_expert_review && !expertReview && <p role="note">{t('assessment.expertReviewNote')}</p>}
        {expertReview && <div className="scan-decision__expert" role="note">
            <strong>{t('assessment.ux.expertReviewed')}</strong>
            <span>{expertReview.verdict === 'corrected' ? t('assessment.ux.expertCorrected').replace('{name}', expertReview.correctedDiagnosis || expertReview.correctedCrop || '') : t(expertReview.verdict === 'confirmed' ? 'assessment.ux.expertConfirmed' : 'assessment.ux.expertUncertain')}</span>
        </div>}
        {result.isDemo && <p>{t('results.demoModeDesc')}</p>}
    </section>;
};
export default ScanDecisionSummary;
