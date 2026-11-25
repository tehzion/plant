import { Check } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';

// Each phase is reported by useScanLogic; there is no timer-based progress.
export default function AnalysisProgress({ step = 0 }) {
    const { t } = useLanguage();
    const activeStep = Math.min(Math.max(step, 0), 2);
    const stages = ['prepareStage', 'analyzeStage', 'saveStage'];
    const hints = ['stagePrepareHint', 'stageAnalyzeHint', 'stageSaveHint'];
    return <>
        <h2 className="loading-title" role="status" aria-live="polite" aria-atomic="true">{t(`common.${stages[activeStep]}`)}</h2>
        <p className="loading-description">{t(`common.${hints[activeStep]}`)}</p>
        <p className="analysis-progress-note">{t('common.analysisProgressHint')}</p>
        <ol className="analysis-steps">
            {stages.map((stage, index) => <li key={stage} className={`analysis-steps__item ${index < activeStep ? 'is-done' : ''} ${index === activeStep ? 'is-current' : ''}`} aria-current={index === activeStep ? 'step' : undefined}>
                <span className="analysis-steps__marker" aria-hidden="true">{index < activeStep ? <Check size={14} /> : index === activeStep ? <span className="loading-spinner-circle analysis-steps__spinner" /> : index + 1}</span>
                <span>{t(`common.${stage}`)}</span>
            </li>)}
        </ol>
    </>;
}
