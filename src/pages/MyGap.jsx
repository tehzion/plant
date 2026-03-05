import React from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { ShieldCheck, Sprout, HeartHandshake, Globe, AlertTriangle, ExternalLink } from 'lucide-react';

const MyGapPage = () => {
    const { t } = useLanguage();

    const pillars = [
        { icon: <ShieldCheck size={28} className="pillar-icon" />, title: t('mygap.pillar1'), description: t('mygap.pillar1Desc') },
        { icon: <Sprout size={28} className="pillar-icon" />, title: t('mygap.pillar2'), description: t('mygap.pillar2Desc') },
        { icon: <Globe size={28} className="pillar-icon" />, title: t('mygap.pillar3'), description: t('mygap.pillar3Desc') },
        { icon: <HeartHandshake size={28} className="pillar-icon" />, title: t('mygap.pillar4'), description: t('mygap.pillar4Desc') },
    ];

    return (
        <div className="mygap-page-container">
            <div className="page-header">
                <h1 className="page-title">{t('mygap.title')}</h1>
                <p className="page-subtitle">{t('mygap.subtitle')}</p>
            </div>

            <div className="disclaimer-card">
                <AlertTriangle size={20} className="disclaimer-icon" />
                <p>{t('mygap.disclaimer')}</p>
            </div>

            <div className="content-card">
                <h2 className="section-title">{t('mygap.whatIsMyGap')}</h2>
                <p className="section-content">{t('mygap.whatIsMyGapContent')}</p>
            </div>

            <div className="content-card">
                <h2 className="section-title">{t('mygap.keyPillars')}</h2>
                <div className="pillars-grid">
                    {pillars.map((pillar, index) => (
                        <div key={index} className="pillar-card">
                            <div className="pillar-icon-wrapper">{pillar.icon}</div>
                            <h3 className="pillar-title">{pillar.title}</h3>
                            <p className="pillar-description">{pillar.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <a href="http://mygap.doa.gov.my/" target="_blank" rel="noopener noreferrer" className="official-link-button">
                {t('mygap.officialLink')}
                <ExternalLink size={16} />
            </a>

            <style>{`
                .mygap-page-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: var(--space-lg) var(--space-md);
                }
                .page-header {
                    text-align: center;
                    margin-bottom: var(--space-xl);
                }
                .page-title {
                    font-size: var(--font-size-3xl);
                    font-weight: 700;
                    color: var(--color-primary-dark);
                }
                .page-subtitle {
                    font-size: var(--font-size-md);
                    color: var(--color-text-secondary);
                    margin-top: var(--space-xs);
                }
                .disclaimer-card {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--space-md);
                    background-color: #FFFBEB;
                    color: #B45309;
                    padding: var(--space-lg);
                    border-radius: var(--radius-lg);
                    border: 1px solid #FDE68A;
                    margin-bottom: var(--space-xl);
                }
                .disclaimer-icon {
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .content-card {
                    background: #fff;
                    padding: var(--space-xl);
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--space-xl);
                    box-shadow: var(--shadow-md);
                }
                .section-title {
                    font-size: var(--font-size-xl);
                    font-weight: 600;
                    color: var(--color-primary-dark);
                    margin-bottom: var(--space-md);
                }
                .section-content {
                    line-height: 1.6;
                    color: var(--color-text-secondary);
                }
                .pillars-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: var(--space-lg);
                }
                .pillar-card {
                    background-color: var(--color-bg-light);
                    padding: var(--space-lg);
                    border-radius: var(--radius-md);
                    text-align: center;
                }
                .pillar-icon-wrapper {
                    display: inline-flex;
                    padding: var(--space-md);
                    background-color: var(--color-primary-light);
                    color: var(--color-primary);
                    border-radius: 50%;
                    margin-bottom: var(--space-md);
                }
                .pillar-title {
                    font-size: var(--font-size-lg);
                    font-weight: 600;
                    margin-bottom: var(--space-xs);
                }
                .pillar-description {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    line-height: 1.5;
                }
                .official-link-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-sm);
                    width: 100%;
                    padding: var(--space-md) var(--space-lg);
                    background-color: var(--color-primary);
                    color: white;
                    font-weight: 600;
                    border-radius: var(--radius-md);
                    text-decoration: none;
                    transition: background-color 0.2s;
                }
                .official-link-button:hover {
                    background-color: var(--color-primary-dark);
                }
            `}</style>
        </div>
    );
};

export default MyGapPage;