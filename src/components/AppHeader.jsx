import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import LanguageSelector from './LanguageSelector';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { checkServerHealth } from '../utils/diseaseDetection';
import './AppHeader.css';
import { getUiCopy } from '../utils/uiCopy.js';
import { NAV_ITEMS, getBackTarget, isNavItemActive } from './navItems.js';

const AppHeader = ({ isHome }) => {
    const { t, language, label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);
    const location = useLocation();
    const navigate = useNavigate();
    const [systemStatus, setSystemStatus] = useState(() => (
        typeof navigator !== 'undefined' && navigator.onLine ? 'checking' : 'offline'
    ));

    const refreshSystemStatus = useCallback(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setSystemStatus('offline');
            return;
        }

        setSystemStatus((current) => (current === 'online' ? current : 'checking'));

        try {
            await checkServerHealth();
            setSystemStatus('online');
        } catch {
            setSystemStatus(navigator.onLine ? 'unavailable' : 'offline');
        }
    }, []);

    useEffect(() => {
        refreshSystemStatus();

        const handleOnline = () => {
            setSystemStatus('checking');
            refreshSystemStatus();
        };
        const handleOffline = () => setSystemStatus('offline');
        const handleFocus = () => refreshSystemStatus();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshSystemStatus();
            }
        };

        const interval = window.setInterval(refreshSystemStatus, 60000);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshSystemStatus]);

    const statusLabel = systemStatus === 'online'
        ? label('nav.statusOnline', 'Connected')
        : systemStatus === 'unavailable' ? getUiCopy(language).service : systemStatus === 'offline'
            ? label('nav.statusOffline', 'Offline')
            : label('nav.statusChecking', 'Checking connection');

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
                        <span
                            className={`app-header__status app-header__status--${systemStatus}`}
                            role="status"
                            title={statusLabel}
                        >
                            <span className="app-header__status-dot" aria-hidden="true" />
                            <span className="app-header__status-text">{statusLabel}</span>
                        </span>
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
                                className={`app-header__nav-link ${item.primary ? 'app-header__nav-link--primary' : ''} ${active ? 'active' : ''}`}
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
