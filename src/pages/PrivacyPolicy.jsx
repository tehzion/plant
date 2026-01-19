import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Bell, Lock, Users, Mail } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();



    return (
        <div className="page legal-page">
            <div className="container legal-container">
                {/* Back Button */}
                <button onClick={() => navigate(-1)} className="back-button">
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>

                {/* Header */}
                <div className="legal-page-header">
                    <h2 className="page-title">{t('privacy.title')}</h2>
                    <p className="page-subtitle">
                        Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                {/* Content Sections */}
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

                {/* Footer */}
                <div className="legal-footer">
                    <div className="footer-divider"></div>
                    <p className="footer-text">
                        © {new Date().getFullYear()} Smart Plant Diseases & Advisor
                    </p>
                    <p className="footer-subtext">
                        {t('footer.copyright')} 🇲🇾
                    </p>
                </div>
            </div>

            <style>{`
                .legal-page {
                    background: #F9FAFB;
                    min-height: 100vh;
                }

                .legal-container {
                    max-width: 900px !important;
                    margin: 0 auto;
                    padding: 16px 16px 100px 16px;
                }

                .back-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: white;
                    border: 1px solid rgba(0,0,0,0.05);
                    border-radius: 12px;
                    padding: 10px 16px;
                    color: #4B5563;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-bottom: 16px;
                }

                .back-button:hover {
                    background: #F9FAFB;
                    border-color: #00B14F;
                    color: #00B14F;
                }

                .back-button:active {
                    transform: scale(0.98);
                }

                .legal-page-header {
                    text-align: center;
                    margin-bottom: 32px;
                    padding-top: 8px;
                }

                .page-title {
                    font-size: 1.75rem;
                    color: #1F2937;
                    margin-bottom: 12px;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                }

                .page-subtitle {
                    font-size: 0.9rem;
                    color: #6B7280;
                    margin: 0;
                }

                .legal-content-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .legal-section-card {
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    border: 1px solid rgba(0,0,0,0.03);
                }

                .legal-section-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .legal-icon-badge {
                    width: 40px;
                    height: 40px;
                    background: #E8F5E9;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #00B14F;
                    flex-shrink: 0;
                }

                .legal-section-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1F2937;
                    margin: 0;
                }

                .legal-section-text {
                    font-size: 0.95rem;
                    line-height: 1.7;
                    color: #4B5563;
                    margin: 0;
                }

                .legal-list {
                    margin: 16px 0 0 0;
                    padding-left: 0;
                    list-style: none;
                }

                .legal-list li {
                    font-size: 0.95rem;
                    line-height: 1.7;
                    color: #4B5563;
                    margin-bottom: 12px;
                    padding-left: 24px;
                    position: relative;
                }

                .legal-list li:before {
                    content: "•";
                    position: absolute;
                    left: 8px;
                    color: #00B14F;
                    font-weight: bold;
                    font-size: 1.2rem;
                }

                .legal-list li:last-child {
                    margin-bottom: 0;
                }

                .legal-footer {
                    margin-top: 48px;
                    padding: 24px 0 40px 0;
                    text-align: center;
                }

                .footer-divider {
                    height: 1px;
                    background: linear-gradient(to right, transparent, #E5E7EB 50%, transparent);
                    margin-bottom: 24px;
                }

                .footer-text {
                    font-size: 0.9rem;
                    color: #6B7280;
                    margin: 0 0 8px 0;
                    font-weight: 500;
                }

                .footer-subtext {
                    font-size: 0.85rem;
                    color: #9CA3AF;
                    margin: 0;
                }

                @media (min-width: 768px) {
                    .legal-container {
                        padding: 24px 24px 80px 24px;
                    }

                    .legal-section-card {
                        padding: 32px;
                    }

                    .page-title {
                        font-size: 2rem;
                    }

                    .back-button {
                        margin-bottom: 24px;
                    }
                }

                @media (max-width: 768px) {
                    .legal-container {
                        padding-bottom: 180px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default PrivacyPolicy;
