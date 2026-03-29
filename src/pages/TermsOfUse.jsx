import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, AlertCircle, Scale, RefreshCw, Mail } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import './LegalPages.css';

const TermsOfUse = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    return (
        <div className="page legal-page">
            <div className="container legal-container">
                <button onClick={() => navigate(-1)} className="back-button">
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>

                <div className="legal-page-header">
                    <span className="legal-kicker">KANB</span>
                    <h2 className="page-title">{t('terms.title')}</h2>
                    <p className="page-subtitle">
                        Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                <div className="legal-content-wrapper">
                    <div id="introduction" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><FileText size={20} /></div>
                            <h3 className="legal-section-title">{t('terms.introTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('terms.introContent')}</p>
                    </div>

                    <div id="eligibility" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><Shield size={20} /></div>
                            <h3 className="legal-section-title">{t('terms.eligibilityTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('terms.eligibilityContent')}</p>
                    </div>

                    <div id="use-of-service" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><AlertCircle size={20} /></div>
                            <h3 className="legal-section-title">{t('terms.useTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('terms.useContent')}</p>
                        <ul className="legal-list">
                            <li>{t('terms.useList1')}</li>
                            <li>{t('terms.useList2')}</li>
                            <li>{t('terms.useList3')}</li>
                        </ul>
                    </div>

                    <div id="intellectual-property" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><Scale size={20} /></div>
                            <h3 className="legal-section-title">{t('terms.ipTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('terms.ipContent')}</p>
                    </div>

                    <div id="limitation" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><AlertCircle size={20} /></div>
                            <h3 className="legal-section-title">{t('terms.liabilityTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('terms.liabilityContent')}</p>
                    </div>

                    <div id="changes" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><RefreshCw size={20} /></div>
                            <h3 className="legal-section-title">{t('terms.changesTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('terms.changesContent')}</p>
                    </div>

                    <div id="contact" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><Mail size={20} /></div>
                            <h3 className="legal-section-title">{t('terms.contactTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('terms.contactContent')}</p>
                    </div>
                </div>

                <div className="legal-footer">
                    <div className="footer-divider"></div>
                    <p className="footer-text">
                        Copyright {new Date().getFullYear()} KANB Agropreneur Nasional
                    </p>
                    <p className="footer-subtext">
                        {t('footer.copyright')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfUse;
