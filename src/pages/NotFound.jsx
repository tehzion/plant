import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n';
import { Sprout, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <div className="not-found-page page fade-in">
            <div className="container center-content">
                <div className="error-card">
                    <div className="icon-wrapper bounce-in">
                        <Sprout size={64} className="error-icon" />
                    </div>

                    <h1 className="error-code">404</h1>
                    <h2 className="error-title">
                        Oops! Plant Not Found
                    </h2>

                    <p className="error-message">
                        The path you've taken seems to be overgrown or doesn't exist.
                        Let's get you back to the main farm.
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

            <style>{`
                .not-found-page {
                    min-height: calc(100vh - 70px);
                    background: #F9FAFB;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--space-lg);
                }

                .center-content {
                    width: 100%;
                    display: flex;
                    justify-content: center;
                }

                .error-card {
                    background: white;
                    border-radius: 24px;
                    padding: 48px 32px;
                    text-align: center;
                    width: 100%;
                    max-width: 480px;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
                    border: 1px solid rgba(0,0,0,0.02);
                }

                .icon-wrapper {
                    width: 100px;
                    height: 100px;
                    background: var(--color-primary-light);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 32px;
                    color: var(--color-primary);
                }

                .error-code {
                    font-size: 4rem;
                    font-weight: 800;
                    color: var(--color-primary);
                    margin: 0;
                    line-height: 1;
                    opacity: 0.2;
                    margin-bottom: -20px;
                    position: relative;
                    z-index: 0;
                }

                .error-title {
                    font-size: 1.75rem;
                    color: #1F2937;
                    font-weight: 700;
                    margin: 16px 0 12px;
                    position: relative;
                    z-index: 1;
                }

                .error-message {
                    color: #6B7280;
                    line-height: 1.6;
                    margin-bottom: 32px;
                    font-size: 1.05rem;
                }

                .action-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }

                .action-buttons .btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                }
                
                @media (max-width: 480px) {
                    .error-card {
                        padding: 32px 24px;
                    }
                    
                    .action-buttons {
                        flex-direction: column;
                    }
                    
                    .action-buttons .btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default NotFound;
