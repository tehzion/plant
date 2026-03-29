import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n';
import { Sprout, Home, ArrowLeft } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <div className="not-found-page page fade-in">
            <div className="container center-content">
                <div className="error-card">
                    <span className="error-kicker">KANB</span>
                    <div className="icon-wrapper bounce-in">
                        <Sprout size={64} className="error-icon" />
                    </div>

                    <h1 className="error-code">404</h1>
                    <h2 className="error-title">
                        Oops! Plant Not Found
                    </h2>

                    <p className="error-message">
                        The path you&apos;ve taken seems to be overgrown or doesn&apos;t exist.
                        Let&apos;s get you back to the main farm.
                    </p>

                    <div className="action-buttons">
                        <button onClick={() => navigate(-1)} className="btn btn-secondary">
                            <ArrowLeft size={18} />
                            <span>Go Back</span>
                        </button>

                        <button onClick={() => navigate('/')} className="btn btn-primary">
                            <Home size={18} />
                            <span>Back to Home</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
