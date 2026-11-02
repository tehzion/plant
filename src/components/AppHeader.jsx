import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import LanguageSelector from './LanguageSelector';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { useScanService } from '../hooks/useScanService.js';
import './AppHeader.css';
import { getUiCopy } from '../utils/uiCopy.js';
import { NAV_ITEMS, getBackTarget, isNavItemActive } from './navItems.js';

const AppHeader = ({ isHome }) => {
    const { t, language, label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);
    const location = useLocation();
    const navigate = useNavigate();
    const { status: systemStatus } = useScanService();

    const statusLabel = systemStatus === 'online'
        ? label('nav.statusOnline', 'Connected')
        : systemStatus === 'unavailable' ? getUiCopy(language).service : systemStatus === 'offline'
            ? label('nav.statusOffline', 'Offline')
            : label('nav.statusChecking', 'Checking connection');
    // Phones have room for a word or two next to the dot, not a sentence.
    const statusShortLabel = systemStatus === 'unavailable'
        ? label('nav.statusUnavailableShort', 'Down')
        : systemStatus === 'offline'
            ? label('nav.statusOfflineShort', 'Offline')
            : label('nav.statusCheckingShort', 'Checking…');

    const backTarget = getBackTarget(location.pathname);
    const handleBack = (event) => {
        if (backTarget?.to === -1) {
            event.preventDefault();
            navigate(-1);
        }
    };

    return (
        <header className={`app-header ${isHome ? 'is-home' : ''}`}>
            <div className="app-header__bar">
                <div className="app-header__content">
                    <Link to="/" className="app-header__logo-link" aria-label={label('nav.home', 'Home')}>
                        <img
                            src="/assets/kanb-logo.png"
                            alt={t('common.appTitle')}
                            className="app-header__logo-image"
                        />
                    </Link>

                    <div className="app-header__actions">
                        {['offline', 'unavailable'].includes(systemStatus) && <span
                            className={`app-header__status app-header__status--${systemStatus}`}
                            role="status"
                            title={statusLabel}
                        >
                            <span className="app-header__status-dot" aria-hidden="true" />
                            <span className="app-header__status-text">{statusLabel}</span>
                            {systemStatus !== 'online' && (
                                <span className="app-header__status-text-short">{statusShortLabel}</span>
                            )}
                        </span>}
                        <button
                            onClick={() => window.location.reload()}
                            className="app-header__refresh-btn"
                            title={label('nav.refresh', 'Reload app')}
                            aria-label={label('nav.refresh', 'Reload app')}
                            type="button"
                        >
                            <RefreshCw size={18} aria-hidden="true" />
                        </button>
                        <div className="app-header__language-wrap">
                            <LanguageSelector />
                        </div>
                    </div>
                </div>
            </div>

            <nav className="app-header__nav" aria-label={label('nav.primary', 'Main navigation')}>
                <div className="app-header__nav-inner">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        if (item.external) {
                            return (
                                <a
                                    key={item.id}
                                    href={item.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="app-header__nav-link app-header__nav-link--external"
                                    aria-label={label('nav.productsExternal', 'Products (opens KANB store)')}
                                >
                                    <Icon size={17} aria-hidden="true" />
                                    {label(item.labelKey, item.fallback)}
                                    <ExternalLink size={13} aria-hidden="true" className="app-header__external-icon" />
                                </a>
                            );
                        }
                        const active = isNavItemActive(item, location);
                        return (
                            <Link
                                key={item.id}
                                to={item.to}
                                className={`app-header__nav-link ${active ? 'active' : ''}`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <Icon size={17} aria-hidden="true" />
                                {label(item.labelKey, item.fallback)}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {backTarget && (
                <div className={`app-header__back ${backTarget.mobileOnly ? 'app-header__back--mobile' : ''}`}>
                    <Link
                        to={backTarget.to === -1 ? '/' : backTarget.to}
                        onClick={handleBack}
                        className="app-header__back-link"
                    >
                        <ArrowLeft size={18} aria-hidden="true" />
                        {label(backTarget.labelKey, backTarget.fallback)}
                    </Link>
                </div>
            )}
        </header>
    );
};

export default AppHeader;
