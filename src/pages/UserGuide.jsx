import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import './UserGuide.css';

const UserGuide = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const getList = (key) => {
        const value = t(key);
        return Array.isArray(value) ? value : [];
    };

    const guide = {
        title: t('userGuide.title'),
        intro: t('userGuide.intro'),
        healthTitle: t('userGuide.healthTitle'),
        healthSubtitle: t('userGuide.healthSubtitle'),
        healthy: {
            title: t('userGuide.healthy.title'),
            meaning: t('userGuide.healthy.meaning'),
            when: t('userGuide.healthy.when'),
            points: getList('userGuide.healthy.points'),
            action: t('userGuide.healthy.action'),
        },
        unhealthy: {
            title: t('userGuide.unhealthy.title'),
            meaning: t('userGuide.unhealthy.meaning'),
            when: t('userGuide.unhealthy.when'),
            points: getList('userGuide.unhealthy.points'),
            action: t('userGuide.unhealthy.action'),
        },
        riskTitle: t('userGuide.riskTitle'),
        riskSubtitle: t('userGuide.riskSubtitle'),
        mild: {
            title: t('userGuide.mild.title'),
            meaning: t('userGuide.mild.meaning'),
            description: t('userGuide.mild.description'),
            example: t('userGuide.mild.example'),
            action: t('userGuide.mild.action'),
        },
        moderate: {
            title: t('userGuide.moderate.title'),
            meaning: t('userGuide.moderate.meaning'),
            description: t('userGuide.moderate.description'),
            example: t('userGuide.moderate.example'),
            action: t('userGuide.moderate.action'),
        },
        high: {
            title: t('userGuide.high.title'),
            meaning: t('userGuide.high.meaning'),
            description: t('userGuide.high.description'),
            example: t('userGuide.high.example'),
            action: t('userGuide.high.action'),
        },
        treatmentTitle: t('userGuide.treatmentTitle'),
        treatmentSubtitle: t('userGuide.treatmentSubtitle'),
        noTreatment: {
            title: t('userGuide.noTreatment.title'),
            description: t('userGuide.noTreatment.description'),
            tips: t('userGuide.noTreatment.tips'),
        },
        immediate: {
            title: t('userGuide.immediate.title'),
            description: t('userGuide.immediate.description'),
            steps: getList('userGuide.immediate.steps'),
        },
        tipTitle: t('userGuide.tipTitle'),
        tips: getList('userGuide.tips'),
    };

    return (
        <div className="page guide-page">
            <div className="container" style={{ paddingBottom: '100px' }}>
                <div className="guide-header">
                    <button onClick={() => navigate(-1)} className="back-btn">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1>{guide.title}</h1>
                        <p className="guide-intro">{guide.intro}</p>
                    </div>
                </div>

                <div className="guide-content">
                    <div className="guide-section">
                        <div className="section-header">
                            <h2>{guide.healthTitle}</h2>
                            <p className="section-subtitle">{guide.healthSubtitle}</p>
                        </div>

                        <div className="educational-card healthy">
                            <div className="card-header">
                                <div className="status-icon"><CheckCircle size={24} /></div>
                                <div>
                                    <h3>{guide.healthy.title}</h3>
                                    <p className="card-meaning">{guide.healthy.meaning}</p>
                                </div>
                            </div>
                            <div className="card-body">
                                <p className="when-label">{guide.healthy.when}</p>
                                <ul className="indicator-list">
                                    {guide.healthy.points.map((point, index) => (
                                        <li key={`healthy-${index}`}><CheckCircle size={14} /> {point}</li>
                                    ))}
                                </ul>
                                <div className="action-box success">
                                    <Lightbulb size={16} />
                                    <span>{guide.healthy.action}</span>
                                </div>
                            </div>
                        </div>

                        <div className="educational-card unhealthy">
                            <div className="card-header">
                                <div className="status-icon"><XCircle size={24} /></div>
                                <div>
                                    <h3>{guide.unhealthy.title}</h3>
                                    <p className="card-meaning">{guide.unhealthy.meaning}</p>
                                </div>
                            </div>
                            <div className="card-body">
                                <p className="when-label">{guide.unhealthy.when}</p>
                                <ul className="indicator-list">
                                    {guide.unhealthy.points.map((point, index) => (
                                        <li key={`unhealthy-${index}`}><AlertCircle size={14} /> {point}</li>
                                    ))}
                                </ul>
                                <div className="action-box warning">
                                    <AlertTriangle size={16} />
                                    <span>{guide.unhealthy.action}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="guide-section">
                        <div className="section-header">
                            <h2>{guide.riskTitle}</h2>
                            <p className="section-subtitle">{guide.riskSubtitle}</p>
                        </div>

                        <div className="severity-timeline">
                            {['mild', 'moderate', 'high'].map((level) => (
                                <div key={level} className={`severity-card ${level}`}>
                                    <div className="severity-badge">{guide[level].title}</div>
                                    <h4>{guide[level].meaning}</h4>
                                    <p className="severity-desc">{guide[level].description}</p>
                                    <div className="example-box">
                                        <Info size={14} />
                                        <span><strong>{t('common.example')}:</strong> {guide[level].example}</span>
                                    </div>
                                    <div className="action-box">
                                        <AlertTriangle size={14} />
                                        <span>{guide[level].action}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="guide-section">
                        <div className="section-header">
                            <h2>{guide.treatmentTitle}</h2>
                            <p className="section-subtitle">{guide.treatmentSubtitle}</p>
                        </div>

                        <div className="treatment-grid">
                            <div className="treatment-card success">
                                <CheckCircle size={20} />
                                <h4>{guide.noTreatment.title}</h4>
                                <p>{guide.noTreatment.description}</p>
                                <div className="tip-box">
                                    <Lightbulb size={14} />
                                    <span>{guide.noTreatment.tips}</span>
                                </div>
                            </div>

                            <div className="treatment-card urgent">
                                <AlertTriangle size={20} />
                                <h4>{guide.immediate.title}</h4>
                                <p>{guide.immediate.description}</p>
                                <ol className="steps-list">
                                    {guide.immediate.steps.map((step, index) => (
                                        <li key={`step-${index}`}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>

                    <div className="guide-section">
                        <div className="tips-section">
                            <div className="tips-header">
                                <Lightbulb size={24} />
                                <h3>{guide.tipTitle}</h3>
                            </div>
                            <div className="tips-grid">
                                {guide.tips.map((tip, index) => (
                                    <div key={`tip-${index}`} className="tip-card">
                                        <div className="tip-number">{index + 1}</div>
                                        <p>{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserGuide;
