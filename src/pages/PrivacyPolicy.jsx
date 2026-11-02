import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { privacyNotice } from '../../shared/privacyNotice.js';
import { PRIVACY_EMAIL } from '../../shared/privacy.js';
import './LegalPages.css';

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const [noticeLanguage, setNoticeLanguage] = useState(language === 'ms' ? 'ms' : 'en');
    const copy = privacyNotice[noticeLanguage];
    return <div className="page legal-page" lang={noticeLanguage}><div className="container legal-container">
        <button onClick={() => navigate(-1)} className="back-button"><ArrowLeft size={20} aria-hidden="true" /><span>{copy.back}</span></button>
        <header className="legal-page-header">
            <span className="legal-kicker">KANB Agropreneur Nasional</span><h1 className="page-title">{copy.title}</h1>
            <p>{copy.updated}</p><p className="legal-section-lead">{copy.intro}</p>
            <label>{noticeLanguage === 'ms' ? 'Bahasa notis' : 'Notice language'}{' '}
                <select value={noticeLanguage} onChange={event => setNoticeLanguage(event.target.value)}><option value="ms">Bahasa Malaysia</option><option value="en">English</option></select>
            </label>
            <p><Link to="/privacy-controls">{copy.controls}</Link> · <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a></p>
        </header>
        <div className="legal-content-wrapper">{copy.sections.map(([title, paragraph]) => <section className="legal-section-card" key={title}><h2 className="legal-section-title">{title}</h2><p className="legal-section-lead">{paragraph}</p></section>)}</div>
        <div className="legal-footer"><p>KANB · <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a></p></div>
    </div></div>;
};
export default PrivacyPolicy;
