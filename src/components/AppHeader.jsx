import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import LanguageSelector from './LanguageSelector';

const AppHeader = ({ isHome }) => {
    const { t } = useLanguage();
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <div className={`app-header ${isHome ? 'is-home' : ''}`}>
            <div className="header-content">
                <Link to="/" className="logo-link">
                    <div className="logo-container">
                        <h1 className="app-logo">🌿 {t('common.appTitle')}</h1>
                        <span className="app-slogan">{t('common.appSlogan')}</span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="desktop-nav">
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                        {t('nav.home')}
                    </Link>
                    <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
                        {t('nav.history')}
                    </Link>
                    <Link to="/encyclopedia" className={`nav-link ${isActive('/encyclopedia') ? 'active' : ''}`}>
                        {t('nav.encyclopedia')}
                    </Link>
                    <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
                        {t('nav.profile')}
                    </Link>
                </div>

                <div className="header-right">
                    <LanguageSelector />
                </div>
            </div>
            <style>{`
                .app-header {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    background: white;
                    border-bottom: 2px solid var(--color-border-light);
                    padding: var(--space-md) var(--space-lg);
                }

                /* Mobile: Hide header on Home page */
                @media (max-width: 768px) {
                    .app-header.is-home {
                        display: none;
                    }
                }

                .header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .logo-link {
                    text-decoration: none;
                }

                .logo-container {
                    display: flex;
                    flex-direction: column;
                }

                .app-logo {
                    font-size: var(--font-size-xl);
                    font-weight: 700;
                    color: var(--color-primary-dark);
                    margin: 0;
                    white-space: nowrap;
                    line-height: 1.1;
                }

                .app-slogan {
                    font-size: var(--font-size-xs);
                    color: var(--color-text-secondary);
                    font-weight: 500;
                    margin-left: 2.2rem; /* Align with text after emoji */
                    letter-spacing: 0.5px;
                }

                .desktop-nav {
                    display: flex;
                    gap: var(--space-xl);
                    margin: 0 var(--space-xl);
                }

                .nav-link {
                    text-decoration: none;
                    color: var(--color-text-secondary);
                    font-weight: 600;
                    font-size: var(--font-size-base);
                    transition: color 0.2s;
                    padding: var(--space-xs) 0;
                    position: relative;
                }

                .nav-link:hover {
                    color: var(--color-primary);
                }

                .nav-link.active {
                    color: var(--color-primary);
                }

                .nav-link.active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: var(--color-primary);
                    border-radius: 2px;
                }

                @media (max-width: 768px) {
                    .app-header {
                        padding: var(--space-sm) var(--space-md);
                    }

                    .app-logo {
                        font-size: var(--font-size-lg);
                    }

                    .desktop-nav {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default AppHeader;
