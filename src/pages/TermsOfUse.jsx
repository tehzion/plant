import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    Beaker,
    FileText,
    Scale,
    Shield,
    Stethoscope,
} from 'lucide-react';
import './LegalPages.css';

const LAST_UPDATED = '13 May 2026';

const sections = [
    {
        id: 'acceptance',
        icon: FileText,
        title: '1. Acceptance of Terms and Legal Capacity',
        points: [
            'By accessing, downloading, or using the PRO-AGRO AI DETECTOR application, you agree to be bound by these Terms and Conditions.',
            'If you access the application on behalf of an agricultural enterprise, cooperative, or company, you represent that you have authority to bind that entity to these terms.',
            'Users must have the legal capacity to enter into binding contracts under Malaysian law.',
        ],
    },
    {
        id: 'scope',
        icon: Shield,
        title: '2. Definition and Scope of AI Service',
        points: [
            'The application is a digital decision-support tool that uses artificial intelligence and computer vision to identify patterns that may be consistent with plant diseases, pests, or nutrient issues.',
            'The application does not provide professional agronomic consulting and does not replace localized laboratory analysis, field inspections, or tissue and soil testing.',
            'All outputs are informational support generated from algorithmic analysis and historical data patterns, not guaranteed scientific conclusions.',
        ],
    },
    {
        id: 'disclaimer',
        icon: AlertCircle,
        title: '3. Comprehensive Agronomic Disclaimer',
        points: [
            'All diagnoses, classifications, and recommendations are probabilistic assessments and not deterministic facts.',
            'Accuracy depends heavily on image quality, lighting, environmental conditions, crop stage, and symptom visibility at the time of capture.',
            'The AI may not identify atypical disease presentations, rare pathogen variants, mixed conditions, or localized pest strains that are not sufficiently represented in the training data.',
        ],
    },
    {
        id: 'treatment',
        icon: Stethoscope,
        title: '4. Treatment and Nutrient Recommendations',
        points: [
            'Treatment, nutrient, and care suggestions are derived from broad agronomic references and standard-practice guidance.',
            'The user remains fully responsible for reviewing product labels, active ingredients, dosage instructions, withholding periods, and all applicable environmental and agricultural regulations before applying any recommendation.',
            'KANB does not guarantee that any suggested product, treatment sequence, or application rate is registered, lawful, or suitable for use in the user’s specific location or operational context.',
        ],
    },
    {
        id: 'liability',
        icon: Scale,
        title: '5. Limitation of Liability',
        points: [
            'Subject to mandatory provisions of Malaysian law, KANB, its officers, developers, and affiliates are not liable for indirect, incidental, special, or consequential losses arising from the use of the application.',
            'This includes, without limitation, crop damage, yield reduction, harvest loss, contamination, operational disruption, reputational harm, or economic loss.',
            'Any cumulative liability that cannot lawfully be excluded is limited to the amount paid by the user for access to the application during the preceding twelve months or RM100.00, whichever amount is lower.',
        ],
    },
    {
        id: 'ip',
        icon: Beaker,
        title: '6. Intellectual Property and Data Usage',
        points: [
            'The application, its source code, interface design, AI workflows, trained models, and supporting materials remain the exclusive intellectual property of KANB unless otherwise stated.',
            'By using the application, you consent to KANB using uploaded crop imagery and associated diagnostic outputs to improve, calibrate, validate, and train its machine learning systems, subject to the applicable privacy notice.',
            'Personal data handling remains subject to the Personal Data Protection Act 2010 and any applicable amendments, regulations, or binding guidelines in force in Malaysia.',
        ],
    },
    {
        id: 'law',
        icon: Scale,
        title: '7. Governing Law and Jurisdiction',
        points: [
            'These Terms and Conditions are governed by and construed in accordance with the laws of Malaysia.',
            'The courts of Malaysia have exclusive jurisdiction over any dispute, claim, or proceeding arising from or relating to the application and its use.',
        ],
    },
];

const TermsOfUse = () => {
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
                    <h2 className="page-title">Terms and Conditions</h2>
                    <p className="page-subtitle">Last Updated: {LAST_UPDATED}</p>
                    <p className="legal-section-lead">
                        These Terms and Conditions govern access to and use of the PRO-AGRO AI DETECTOR application and
                        apply to all users, whether acting in an individual capacity or on behalf of an agricultural
                        organization.
                    </p>
                </div>

                <div className="legal-content-wrapper">
                    {sections.map(({ id, icon: Icon, title, points }) => (
                        <div key={id} id={id} className="legal-section-card">
                            <div className="legal-section-header">
                                <div className="legal-icon-badge"><Icon size={20} /></div>
                                <h3 className="legal-section-title">{title}</h3>
                            </div>
                            <ul className="legal-list">
                                {points.map((point) => (
                                    <li key={point}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="legal-footer">
                    <div className="footer-divider"></div>
                    <p className="footer-text">
                        Copyright {new Date().getFullYear()} KANB Agropreneur Nasional
                    </p>
                    <p className="footer-subtext">
                        PRO-AGRO AI DETECTOR legal terms are governed by Malaysian law.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfUse;
