import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Bell,
    Database,
    Globe,
    Lock,
    Mail,
    Shield,
    UserRoundCheck,
} from 'lucide-react';
import './LegalPages.css';

const LAST_UPDATED = '13 May 2026';

const sections = [
    {
        id: 'consent',
        icon: Shield,
        title: '1. Explicit Consent and Scope',
        points: [
            'By registering an account, submitting information, or uploading diagnostic media, you consent to the collection, use, processing, and storage of personal data as described in this notice.',
            'This notice applies to all users of the PRO-AGRO AI DETECTOR platform, including individual agropreneurs, farm operators, cooperatives, and business entities using the service for commercial agricultural purposes.',
        ],
    },
    {
        id: 'data-categories',
        icon: Database,
        title: '2. Categories of Data Collected',
        items: [
            {
                label: 'Registration Data',
                text: 'Name, contact number, email address, business entity name, and farm size.',
            },
            {
                label: 'Diagnostic Media',
                text: 'Photographs, videos, and other visual crop imagery uploaded for AI analysis of diseases, pests, or nutrient issues.',
            },
            {
                label: 'Spatial and Geolocation Data',
                text: 'GPS coordinates and related location information, including metadata embedded in uploaded media when available.',
            },
            {
                label: 'Telemetry and Usage Data',
                text: 'Device type, operating system, IP address, browser details, and session activity relevant to service delivery and security.',
            },
        ],
    },
    {
        id: 'purpose',
        icon: Bell,
        title: '3. Purpose of Processing and AI Training',
        points: [
            'To operate the platform, process uploaded images, and generate AI-assisted disease, pest, and nutrient recommendations.',
            'To improve, calibrate, test, and refine KANB’s machine learning models and supporting agronomic systems using uploaded agricultural imagery and associated outputs.',
            'To maintain business and compliance records where required under applicable Malaysian cooperative or agricultural regulatory frameworks.',
        ],
    },
    {
        id: 'disclosures',
        icon: Globe,
        title: '4. Third-Party Disclosures and Cross-Border Transfers',
        points: [
            'Data may be processed by cloud and infrastructure providers such as AWS, Azure, or Google Cloud to support storage, security, and AI-related computing workloads.',
            'Where personal data is transferred outside Malaysia, KANB will seek to ensure that such transfers comply with applicable Malaysian personal data protection requirements, including any relevant 2025 PDPA transfer guidance and equivalent protection standards.',
            'Data may also be disclosed to Malaysian regulatory or enforcement authorities where required by law, lawful directive, court order, or compliance obligation.',
        ],
    },
    {
        id: 'security',
        icon: Lock,
        title: '5. Data Security and Retention',
        points: [
            'KANB implements reasonable administrative, technical, and access-control safeguards to protect personal data from unauthorized access, misuse, disclosure, or loss.',
            'Personal data is retained only for as long as necessary to fulfill the purposes described in this notice, comply with legal obligations, and support legitimate operational needs.',
            'Where an account is deleted, KANB may permanently de-identify agricultural imagery and remove direct user associations, while retaining anonymized materials for historical analysis, research, and AI training purposes.',
        ],
    },
    {
        id: 'rights',
        icon: UserRoundCheck,
        title: '6. User Rights and Data Protection Officer (DPO)',
        points: [
            'Users may request access to their personal data, request corrections, and where applicable exercise portability or other statutory rights available under Malaysian law.',
            'In the event of a notifiable personal data breach, KANB will follow applicable notification duties to the relevant authority and affected individuals, where required.',
        ],
        contact: {
            title: 'Data Protection Officer, KANB',
            email: 'agropreneurnasional@gmail.com',
            whatsapp: '+60136667810',
        },
    },
];

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="page legal-page">
            <div className="container legal-container">
                <button onClick={() => navigate(-1)} className="back-button">
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>

                <div className="legal-page-header">
                    <span className="legal-kicker">PRO-AGRO AI DETECTOR</span>
                    <h2 className="page-title">Personal Data Protection Notice</h2>
                    <p className="page-subtitle">Last Updated: {LAST_UPDATED}</p>
                    <p className="legal-section-lead">
                        This notice explains how KANB collects, uses, stores, shares, and protects personal data in
                        connection with the PRO-AGRO AI DETECTOR platform.
                    </p>
                </div>

                <div className="legal-content-wrapper">
                    {sections.map(({ id, icon: Icon, title, points, items, contact }) => (
                        <div key={id} id={id} className="legal-section-card">
                            <div className="legal-section-header">
                                <div className="legal-icon-badge"><Icon size={20} /></div>
                                <h3 className="legal-section-title">{title}</h3>
                            </div>

                            {points && (
                                <ul className="legal-list">
                                    {points.map((point) => (
                                        <li key={point}>{point}</li>
                                    ))}
                                </ul>
                            )}

                            {items && (
                                <ul className="legal-list legal-list--detailed">
                                    {items.map((item) => (
                                        <li key={item.label}>
                                            <strong>{item.label}:</strong> {item.text}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {contact && (
                                <div className="legal-contact-card">
                                    <div className="legal-contact-header">
                                        <Mail size={18} />
                                        <strong>{contact.title}</strong>
                                    </div>
                                    <p className="legal-contact-row">
                                        <span>Email</span>
                                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                                    </p>
                                    <p className="legal-contact-row">
                                        <span>WhatsApp</span>
                                        <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                            {contact.whatsapp}
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="legal-footer">
                    <div className="footer-divider"></div>
                    <p className="footer-text">
                        Copyright {new Date().getFullYear()} KANB Agropreneur Nasional
                    </p>
                    <p className="footer-subtext">
                        Personal data handling is subject to Malaysian legal and regulatory requirements.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
