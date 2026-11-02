import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';
import { Camera, CircleHelp, ShieldCheck, Stethoscope } from 'lucide-react';

export const nextScanStep = (result, copy) => result.requiresRetake ? copy.nextRetake
    : result.healthy ? copy.nextHealthy : result.treatmentEligible ? copy.nextTreat : copy.nextScout;

const ScanDecisionSummary = ({ result, expertReview = null, image, adviceReadable = true }) => {
    const [photoFailed, setPhotoFailed] = useState(false);
    useEffect(() => setPhotoFailed(false), [image]);
    const { t, language } = useLanguage();
    const crop = result.plantType || result.category || t('common.unknown');
    const cropKeys = { padi: 'home.categoryRice', rice: 'home.categoryRice', cili: 'home.cropChilli', chilli: 'home.cropChilli', chili: 'home.cropChilli', vegetables: 'home.categoryVegetables', 'sayur-sayuran': 'home.categoryVegetables', fruits: 'home.categoryFruits', 'buah-buahan': 'home.categoryFruits', durian: 'home.categoryDurian' };
    const cropLabel = cropKeys[String(crop).toLowerCase()] ? t(cropKeys[String(crop).toLowerCase()]) : crop;
    const state = result.requiresRetake ? 'retake' : result.healthy ? 'healthy' : result.needsReview ? 'review' : 'disease';
    const Icon = { retake: Camera, healthy: ShieldCheck, review: CircleHelp, disease: Stethoscope }[state];
    const headline = state === 'disease' ? (!adviceReadable ? t('results.savedFindingTitle') : result.disease) || t('results.unknownDisease') : t(`results.headline${state}`);
    return <section className={`scan-decision app-surface scan-decision--${state}`} aria-label={result.healthy ? t('results.healthy') : headline}>
        <div className="scan-decision__identity">
            <div>
                <Icon size={28} aria-hidden="true" />
                <h1>{headline}</h1>
                <p>{cropLabel}</p>
            </div>
            {image && !photoFailed ? <a className="scan-decision__photo-link" href={image} target="_blank" rel="noopener noreferrer" aria-label={t('results.openPhoto')}><img className="scan-decision__photo" src={image} onError={() => setPhotoFailed(true)} alt={t('results.photoOf').replace('{crop}', cropLabel)} /></a> : <span className="scan-decision__photo-missing">{t('results.photoUnavailable')}</span>}
        </div>
        {result.requiresRetake && adviceReadable && result.retakeReason && <p>{result.retakeReason}</p>}
        {result.healthy && <p>{t('results.healthyRelief')}</p>}
        {!result.healthy && !result.needsReview && <p>{t('results.severity')}: <strong>{t(`results.${String(result.severity).toLowerCase()}`)}</strong></p>}
        {result.structuredAssessment?.assessment?.needs_expert_review && !expertReview && <p role="note">{t('assessment.expertReviewNote')}</p>}
        {expertReview && <div className="scan-decision__expert" role="note">
            <strong>{t('assessment.ux.expertReviewed')}</strong>
            <span>{expertReview.verdict === 'corrected' ? t('assessment.ux.expertCorrected').replace('{name}', expertReview.correctedDiagnosis || expertReview.correctedCrop || '') : t(expertReview.verdict === 'confirmed' ? 'assessment.ux.expertConfirmed' : 'assessment.ux.expertUncertain')}</span>
        </div>}
        {result.urgent && !expertReview && <p className="scan-decision__urgent" role="alert">{getScanQualityCopy(language).urgent}</p>}
        {result.isDemo && <p>{t('results.demoModeDesc')}</p>}
    </section>;
};
export default ScanDecisionSummary;
