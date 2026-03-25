import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import LanguageSelector from './LanguageSelector';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AppHeader = ({ isHome }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const location = useLocation();

    // Derive initials from email for avatar
    const initials = user?.email
        ? user.email.split('@')[0].slice(0, 2).toUpperCase()
        : null;

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const isHistory = location.pathname === '/history';

    return (
        <div className={`app-header ${isHome ? 'is-home' : ''} ${isHistory ? 'is-history' : ''}`}>
            <div className="header-content">
                <Link to="/" className="logo-link">
                    <div className="logo-container">
                        <img
                            src="/assets/kanb-logo.png"
                            alt={t('common.appTitle')}
                            className="app-logo-image"
                        />
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
                        {initials ? (
                            <span className="header-avatar-badge">{initials}</span>
                        ) : (
                            t('nav.profile')
                        )}
                    </Link>
                </div>

                <div className="header-right">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="refresh-btn"
                        title="Refresh App"
                        aria-label="Refresh App"
                    >
                        <RefreshCw size={20} />
                    </button>
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
                    padding: 12px var(--space-lg); /* Slightly reduced padding */
                }

                /* Mobile: AppHeader is now visible on all pages including Home */

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
                    align-items: center;
                }

                .app-logo-image {
                    height: 80px; /* Reduced from 120px per user feedback */
                    width: auto;
                    object-fit: contain;
                    mix-blend-mode: multiply; /* Hides white background */
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                }

                .refresh-btn {
                    background: none;
                    border: none;
                    color: var(--color-text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--space-xs);
                    border-radius: 50%;
                    transition: all 0.2s;
                    opacity: 0.7;
                }

                .refresh-btn:hover {
                    background: rgba(0, 177, 79, 0.1);
                    color: var(--color-primary);
                    opacity: 1;
                    transform: rotate(30deg);
                }

                @media (max-width: 768px) {
                     .app-logo-image {
                        height: 60px; /* Smaller per user request */
                    }
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

                .header-avatar-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: var(--color-primary);
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 800;
                    letter-spacing: 0;
                    vertical-align: middle;
                    box-shadow: 0 2px 6px rgba(0,177,79,0.35);
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
