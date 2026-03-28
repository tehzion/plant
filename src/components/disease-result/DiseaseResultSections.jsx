import {
    AlertCircle,
    AlertTriangle,
    Bug,
    Calendar,
    Info,
} from 'lucide-react';

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
        differentials,
    } = normalized;

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
                <div className="evidence-section">
                    <h4 className="subsection-title">
                        <Info size={18} className="subsection-icon" />
                        {t('results.diagnosticEvidence') || 'Diagnostic evidence'}
                    </h4>
                    <div className="evidence-grid">
                        <div className="evidence-item"><span>{t('results.leafAgeAffected') || 'Leaf age affected'}</span><strong>{diagnosticEvidence.leafAgeAffected}</strong></div>
                        <div className="evidence-item"><span>{t('results.lesionShape') || 'Lesion shape'}</span><strong>{diagnosticEvidence.lesionShape}</strong></div>
                        <div className="evidence-item"><span>{t('results.lesionBorderHalo') || 'Lesion border / halo'}</span><strong>{diagnosticEvidence.lesionBorderHalo}</strong></div>
                        <div className="evidence-item"><span>{t('results.distributionPattern') || 'Distribution'}</span><strong>{diagnosticEvidence.distributionPattern}</strong></div>
                        <div className="evidence-item"><span>{t('results.colorPattern') || 'Color pattern'}</span><strong>{diagnosticEvidence.colorPattern}</strong></div>
                        <div className="evidence-item"><span>{t('results.likelyCauseCategory') || 'Likely cause'}</span><strong>{diagnosticEvidence.likelyCauseCategory}</strong></div>
                    </div>
                </div>
            )}

            {differentials.length > 0 && (
                <div className="differentials-section">
                    <h4 className="subsection-title">
                        <AlertTriangle size={18} className="subsection-icon" />
                        {t('results.possibleAlternatives') || 'Possible alternatives'}
                    </h4>
                    <ul className="symptoms-list">
                        {differentials.map((item, index) => (
                            <li key={`${item.name}-${index}`} className="symptom-item">
                                <strong>{item.name}</strong>
                                {typeof item.likelihood === 'number' ? ` (${item.likelihood}%)` : ''}
                                {item.reason ? ` - ${item.reason}` : ''}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
};

export default DiseaseResultSections;
