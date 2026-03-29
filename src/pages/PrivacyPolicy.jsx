import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Bell, Lock, Users, Mail } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import './LegalPages.css';

const PrivacyPolicy = () => {
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
                    <h2 className="page-title">{t('privacy.title')}</h2>
                    <p className="page-subtitle">
                        Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                <div className="legal-content-wrapper">
                    <div id="compliance" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><Shield size={20} /></div>
                            <h3 className="legal-section-title">{t('privacy.complianceTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('privacy.complianceContent')}</p>
                    </div>

                    <div id="information" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><Database size={20} /></div>
                            <h3 className="legal-section-title">{t('privacy.collectTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('privacy.collectContent')}</p>
                        <ul className="legal-list">
                            <li><strong>{t('privacy.collectImagesLabel')}</strong> {t('privacy.collectImagesText')}</li>
                            <li><strong>{t('privacy.collectDeviceLabel')}</strong> {t('privacy.collectDeviceText')}</li>
                            <li><strong>{t('privacy.collectUsageLabel')}</strong> {t('privacy.collectUsageText')}</li>
                        </ul>
                    </div>

                    <div id="usage" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><Bell size={20} /></div>
                            <h3 className="legal-section-title">{t('privacy.useTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('privacy.useContent')}</p>
                        <ul className="legal-list">
                            <li>{t('privacy.useList1')}</li>
                            <li>{t('privacy.useList2')}</li>
                            <li>{t('privacy.useList3')}</li>
                        </ul>
                    </div>

                    <div id="storage" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><Lock size={20} /></div>
                            <h3 className="legal-section-title">{t('privacy.storageTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('privacy.storageContent')}</p>
                    </div>

                    <div id="third-party" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><Users size={20} /></div>
                            <h3 className="legal-section-title">{t('privacy.thirdPartyTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('privacy.thirdPartyContent')}</p>
                    </div>

                    <div id="contact" className="legal-section-card">
                        <div className="legal-section-header">
                            <div className="legal-icon-badge"><Mail size={20} /></div>
                            <h3 className="legal-section-title">{t('privacy.contactTitle')}</h3>
                        </div>
                        <p className="legal-section-text">{t('privacy.contactContent')}</p>
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

export default PrivacyPolicy;
