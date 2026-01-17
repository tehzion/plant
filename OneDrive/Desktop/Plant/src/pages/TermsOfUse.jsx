import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, AlertCircle, Scale, RefreshCw, Mail } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';

const TermsOfUse = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const sections = [
        {
            id: 'introduction',
            icon: <FileText size={20} />,
            title: '1. Introduction',
            content: 'Welcome to Smart Plant Diseases & Advisor. By accessing or using our application, you agree to be bound by these Terms of Use ("Terms"). These Terms are governed by and construed in accordance with the laws of Malaysia.'
        },
        {
            id: 'eligibility',
            icon: <Shield size={20} />,
            title: '2. Eligibility',
            content: 'This Service is intended for use by individuals located in Malaysia. If you access the Service from outside Malaysia, you do so at your own risk and are responsible for compliance with the laws of your jurisdiction.'
        },
        {
            id: 'use-of-service',
            icon: <AlertCircle size={20} />,
            title: '3. Use of Service',
            content: 'Our service provides AI-based plant disease analysis. While we strive for accuracy, the results are for informational purposes only and should not replace professional agricultural advice from certified agronomists in Malaysia.',
            list: [
                'You agree to use the app only for lawful purposes under Malaysian law.',
                'You will not use the service to diagnose regulated pests or diseases without reporting to the Department of Agriculture Malaysia if required.',
                'You are responsible for the images you upload and must own the rights to them.'
            ]
        },
        {
            id: 'intellectual-property',
            icon: <Scale size={20} />,
            title: '4. Intellectual Property',
            content: 'All content, features, and functionality of the App (including but not limited to AI models, design, and software) are the exclusive property of Smart Plant Diseases & Advisor and are protected by Malaysian copyright and intellectual property laws.'
        },
        {
            id: 'limitation',
            icon: <AlertCircle size={20} />,
            title: '5. Limitation of Liability',
            content: 'To the fullest extent permitted by Malaysian law, Smart Plant Diseases & Advisor shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Service.'
        },
        {
            id: 'changes',
            icon: <RefreshCw size={20} />,
            title: '6. Changes to Terms',
            content: 'We reserve the right to modify these terms at any time. We will notify users of any significant changes. Continued use of the app constitutes acceptance of new terms.'
        },
        {
            id: 'contact',
            icon: <Mail size={20} />,
            title: '7. Contact Us',
            content: 'For any inquiries regarding these Terms, please contact us at support@smartplant.my.'
        }
    ];

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
                    <h2 className="page-title">Terms of Use</h2>
                    <p className="page-subtitle">
                        Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                {/* Content Sections */}
                <div className="legal-content-wrapper">
                    {sections.map((section) => (
                        <div key={section.id} id={section.id} className="legal-section-card">
                            <div className="legal-section-header">
                                <div className="legal-icon-badge">{section.icon}</div>
                                <h3 className="legal-section-title">{section.title}</h3>
                            </div>
                            <p className="legal-section-text">{section.content}</p>
                            {section.list && (
                                <ul className="legal-list">
                                    {section.list.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="legal-footer">
                    <div className="footer-divider"></div>
                    <p className="footer-text">
                        © {new Date().getFullYear()} Smart Plant Diseases & Advisor
                    </p>
                    <p className="footer-subtext">
                        Dengan bangganya dibuat di MALAYSIA 🇲🇾
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

export default TermsOfUse;
