import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle, AlertTriangle, Info, Lightbulb } from 'lucide-react';

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

            <style>{`
                .guide-page {
                    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
                    min-height: 100vh;
                }

                .guide-header {
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                    margin-bottom: 32px;
                    padding-top: 24px;
                }

                .back-btn {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                    border: 1px solid #e5e7eb;
                    background: white;
                    color: #111827;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.05);
                    flex-shrink: 0;
                }

                .guide-header h1 {
                    margin: 0 0 8px;
                    font-size: 2rem;
                    color: #0f172a;
                }

                .guide-intro {
                    margin: 0;
                    color: #64748b;
                    max-width: 700px;
                    line-height: 1.6;
                }

                .guide-content {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .guide-section {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 24px;
                    padding: 24px;
                    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.04);
                }

                .section-header {
                    margin-bottom: 20px;
                }

                .section-header h2 {
                    margin: 0 0 6px;
                    font-size: 1.35rem;
                    color: #111827;
                }

                .section-subtitle {
                    margin: 0;
                    color: #64748b;
                    font-size: 0.95rem;
                }

                .educational-card,
                .treatment-card {
                    border-radius: 20px;
                    padding: 20px;
                    border: 1px solid #e5e7eb;
                }

                .educational-card + .educational-card {
                    margin-top: 16px;
                }

                .educational-card.healthy,
                .treatment-card.success {
                    background: #f0fdf4;
                    border-color: #bbf7d0;
                }

                .educational-card.unhealthy,
                .treatment-card.urgent {
                    background: #fff7ed;
                    border-color: #fed7aa;
                }

                .card-header {
                    display: flex;
                    gap: 14px;
                    align-items: flex-start;
                    margin-bottom: 14px;
                }

                .status-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.75);
                    color: #111827;
                    flex-shrink: 0;
                }

                .card-header h3,
                .tips-header h3,
                .treatment-card h4,
                .severity-card h4 {
                    margin: 0 0 6px;
                    color: #111827;
                }

                .card-meaning,
                .severity-desc,
                .treatment-card p {
                    margin: 0;
                    color: #475569;
                    line-height: 1.6;
                }

                .when-label {
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0 0 10px;
                }

                .indicator-list,
                .steps-list {
                    margin: 0;
                    padding-left: 0;
                    list-style: none;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .indicator-list li,
                .steps-list li {
                    display: flex;
                    gap: 10px;
                    align-items: flex-start;
                    color: #334155;
                    line-height: 1.5;
                }

                .steps-list {
                    list-style: decimal;
                    padding-left: 18px;
                }

                .steps-list li {
                    display: list-item;
                    padding-left: 4px;
                }

                .action-box,
                .example-box,
                .tip-box {
                    margin-top: 14px;
                    border-radius: 14px;
                    padding: 12px 14px;
                    display: flex;
                    gap: 10px;
                    align-items: flex-start;
                    line-height: 1.5;
                }

                .action-box.success,
                .tip-box {
                    background: rgba(255, 255, 255, 0.75);
                    color: #166534;
                }

                .action-box.warning,
                .action-box {
                    background: rgba(255, 255, 255, 0.75);
                    color: #9a3412;
                }

                .example-box {
                    background: #eff6ff;
                    color: #1e3a8a;
                }

                .severity-timeline,
                .treatment-grid,
                .tips-grid {
                    display: grid;
                    gap: 16px;
                }

                .severity-timeline {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }

                .treatment-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .severity-card {
                    border-radius: 20px;
                    padding: 18px;
                    border: 1px solid #e5e7eb;
                    background: #f8fafc;
                }

                .severity-card.mild { border-color: #d9f99d; }
                .severity-card.moderate { border-color: #fde68a; }
                .severity-card.high { border-color: #fecaca; }

                .severity-badge {
                    display: inline-flex;
                    padding: 5px 10px;
                    border-radius: 999px;
                    font-size: 0.72rem;
                    font-weight: 800;
                    margin-bottom: 12px;
                    background: white;
                    color: #334155;
                }

                .tips-section {
                    background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
                    border-radius: 20px;
                    padding: 20px;
                    border: 1px solid #bfdbfe;
                }

                .tips-header {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    color: #1d4ed8;
                    margin-bottom: 16px;
                }

                .tips-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .tip-card {
                    background: white;
                    border: 1px solid #dbeafe;
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }

                .tip-number {
                    width: 28px;
                    height: 28px;
                    border-radius: 999px;
                    background: #dbeafe;
                    color: #1d4ed8;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .tip-card p {
                    margin: 0;
                    color: #334155;
                    line-height: 1.55;
                }

                @media (max-width: 900px) {
                    .severity-timeline,
                    .treatment-grid,
                    .tips-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 640px) {
                    .guide-header {
                        flex-direction: column;
                    }

                    .guide-section {
                        padding: 18px;
                        border-radius: 20px;
                    }

                    .guide-header h1 {
                        font-size: 1.65rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default UserGuide;
