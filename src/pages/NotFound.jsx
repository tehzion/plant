import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n';
import { Sprout, Home, ArrowLeft } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <div className="not-found-page page">
            <div className="container center-content">
                <div className="error-card">
                    <div className="icon-wrapper" aria-hidden="true">
                        <Sprout size={40} className="error-icon" />
                    </div>

                    <h1 className="error-title">{t('common.notFoundTitle')}</h1>
                    <p className="error-message">{t('common.notFoundMessage')}</p>

                    <div className="action-buttons">
                        <button type="button" onClick={() => navigate('/')} className="btn btn-primary">
                            <Home size={18} aria-hidden="true" />
                            <span>{t('common.backToHome')}</span>
                        </button>

                        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
                            <ArrowLeft size={18} aria-hidden="true" />
                            <span>{t('common.goBack')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
