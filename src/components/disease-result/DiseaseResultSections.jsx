import {
    AlertCircle,
    AlertTriangle,
    Bug,
    Calendar,
    Info,
} from 'lucide-react';

import { CONFIDENCE_LEVEL_FALLBACK_LABELS } from '../../../shared/diseaseAssessment.js';

const DETAIL_ICON_MAP = {
    calendar: Calendar,
    bug: Bug,
    'alert-circle': AlertCircle,
};

const DiseaseResultSections = ({ normalized, t }) => {
    const {
        healthy,
        showDemoModeWarning,
        detailItems,
        symptomsList,
        diagnosticEvidence,
        alternatives = [],
    } = normalized;
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };

    return (
        <>
            {showDemoModeWarning && (
                <div className="demo-mode-warning">
                    <AlertCircle size={18} />
                    <div className="demo-mode-content">
                        <strong>{t('results.demoModeTitle')}</strong>
                        <span>{t('results.demoModeDesc')}</span>
                    </div>
                </div>
            )}

            {detailItems.length > 0 && (
                <div className="details-section">
                    <div className="details-grid">
                        {detailItems.map((item) => {
                            const Icon = DETAIL_ICON_MAP[item.icon];
                            return (
                                <div key={item.key} className="detail-item">
                                    <div className={`detail-icon ${item.iconClassName}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="detail-text">
                                        <span className="detail-label">{item.label}</span>
                                        <span className="detail-value">{item.value}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!healthy && symptomsList.length > 0 && (
                <div className="symptoms-section">
                    <h4 className="subsection-title">
                        <AlertCircle size={18} className="subsection-icon" />
                        {t('results.symptoms')}
                    </h4>
                    <ul className="symptoms-list">
                        {symptomsList.map((symptom, index) => (
                            <li key={`${symptom}-${index}`} className="symptom-item">{symptom}</li>
                        ))}
                    </ul>
                </div>
            )}

            {diagnosticEvidence && (
                <details className="evidence-section results-why">
                    <summary className="subsection-title">
                        <Info size={18} className="subsection-icon" />
                        {label('assessment.ux.whyTitle', 'Why we think this')}
                    </summary>
                    <div className="evidence-grid">
                        <div className="evidence-item"><span>{t('results.leafAgeAffected') || 'Leaf age affected'}</span><strong>{diagnosticEvidence.leafAgeAffected}</strong></div>
                        <div className="evidence-item"><span>{t('results.lesionShape') || 'Lesion shape'}</span><strong>{diagnosticEvidence.lesionShape}</strong></div>
                        <div className="evidence-item"><span>{t('results.lesionBorderHalo') || 'Lesion border / halo'}</span><strong>{diagnosticEvidence.lesionBorderHalo}</strong></div>
                        <div className="evidence-item"><span>{t('results.distributionPattern') || 'Distribution'}</span><strong>{diagnosticEvidence.distributionPattern}</strong></div>
                        <div className="evidence-item"><span>{t('results.colorPattern') || 'Color pattern'}</span><strong>{diagnosticEvidence.colorPattern}</strong></div>
                        <div className="evidence-item"><span>{t('results.likelyCauseCategory') || 'Likely cause'}</span><strong>{diagnosticEvidence.likelyCauseCategory}</strong></div>
                    </div>
                </details>
            )}

            {alternatives.length > 0 && (
                <div className="differentials-section">
                    <h4 className="subsection-title">
                        <AlertTriangle size={18} className="subsection-icon" />
                        {label('assessment.alternativesTitle', 'Other conditions that look similar')}
                    </h4>
                    <p className="differentials-intro">{label('assessment.alternativesIntro', 'These can look alike. Check the differences before acting.')}</p>
                    <ul className="alternative-list">
                        {alternatives.map((item, index) => (
                            <li key={`${item.name}-${index}`} className="alternative-card">
                                <div className="alternative-card__header">
                                    <strong>{item.name}</strong>
                                    {item.confidence_level && (
                                        <span className={`confidence-chip confidence-chip--${item.confidence_level}`}>
                                            {label(`assessment.confidence.${item.confidence_level}`, CONFIDENCE_LEVEL_FALLBACK_LABELS[item.confidence_level] || item.confidence_level)}
                                        </span>
                                    )}
                                </div>
                                {item.scientific_name && <em className="alternative-card__science">{item.scientific_name}</em>}
                                {[
                                    ['supporting_evidence', 'assessment.supports', 'Signs that fit'],
                                    ['weakening_evidence', 'assessment.weakens', 'Signs against'],
                                    ['distinguishing_features', 'assessment.tellApart', 'How to tell apart'],
                                ].map(([field, key, fallback]) => (item[field]?.length > 0 && (
                                    <div key={field} className="alternative-card__row">
                                        <span>{label(key, fallback)}</span>
                                        <p>{item[field].join('; ')}</p>
                                    </div>
                                )))}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
};

export default DiseaseResultSections;
