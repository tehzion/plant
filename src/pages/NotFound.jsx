import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n';
import { ScanLine, Home, ArrowLeft } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const canGoBack = typeof window.history.state?.idx === 'number' && window.history.state.idx > 0;

    return (
        <div className="not-found-page page">
            <section className="not-found-content" aria-labelledby="not-found-title">
                <svg className="not-found-garden" viewBox="0 0 360 180" fill="none" aria-hidden="true">
                    <path d="M35 158C107 148 245 148 325 158" stroke="var(--color-earth)" strokeWidth="3" strokeLinecap="round" />
                    <g stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M104 48 66 108h55M108 82v59M275 48l-38 60h55M279 82v59" />
                        <path d="M178 48c-23 0-30 22-30 47s7 47 30 47 30-22 30-47-7-47-30-47Z" />
                    </g>
                    <path className="not-found-sprout" d="M178 151v-43m0 18c-23 0-32-12-32-25 20-1 32 10 32 25Zm0-12c0-21 13-32 33-31 0 18-13 31-33 31Z" fill="var(--color-primary-light)" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                    <path d="m46 136 5-10m259 11-4-10" stroke="var(--color-earth)" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <h1 id="not-found-title">{t('common.notFoundTitle')}</h1>
                <p className="not-found-message">{t('common.notFoundMessage')}</p>
                <div className="not-found-actions">
                    <Link to="/" className="btn btn-primary"><Home size={18} aria-hidden="true" />{t('common.backToHome')}</Link>
                    <Link to="/?scan=true" className="btn btn-secondary"><ScanLine size={18} aria-hidden="true" />{t('common.notFoundScan')}</Link>
                </div>
                {canGoBack && <button type="button" className="not-found-back" onClick={() => navigate(-1)}><ArrowLeft size={16} aria-hidden="true" />{t('common.goBack')}</button>}
            </section>
        </div>
    );
};

export default NotFound;
