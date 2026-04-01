import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import LanguageSelector from './LanguageSelector';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkServerHealth } from '../utils/diseaseDetection';
import './AppHeader.css';

const AppHeader = ({ isHome }) => {
    const { t, label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);
    const { user } = useAuth();
    const location = useLocation();
    const [systemStatus, setSystemStatus] = useState(() => (
        typeof navigator !== 'undefined' && navigator.onLine ? 'checking' : 'offline'
    ));

    const initials = user?.email
        ? user.email.split('@')[0].slice(0, 2).toUpperCase()
        : null;

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
            setSystemStatus('offline');
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

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const statusLabel = systemStatus === 'online'
        ? label('home.onlineStatus', 'Live')
        : systemStatus === 'offline'
            ? label('common.offline', 'Offline')
            : label('common.loading', 'Checking');

    return (
        <header className={`app-header ${isHome ? 'is-home' : ''}`}>
            <div className="app-header__shell">
                <div className="app-header__content">
                    <Link to="/" className="app-header__logo-link" aria-label={label('common.appTitle', 'KANB')}>
                        <div className="app-header__logo-wrap">
                            <img
                                src="/assets/kanb-logo.png"
                                alt={t('common.appTitle')}
                                className="app-header__logo-image"
                            />
                        </div>
                    </Link>

                    <nav className="app-header__nav" aria-label={label('nav.primary', 'Primary navigation')}>
                        <Link to="/" className={`app-header__nav-link ${isActive('/') ? 'active' : ''}`}>
                            {label('nav.home', 'Home')}
                        </Link>
                        <Link to="/history" className={`app-header__nav-link ${isActive('/history') ? 'active' : ''}`}>
                            {label('nav.history', 'History')}
                        </Link>
                        <Link to="/encyclopedia" className={`app-header__nav-link ${isActive('/encyclopedia') ? 'active' : ''}`}>
                            {label('nav.encyclopedia', 'Encyclopedia')}
                        </Link>
                        <Link to="/profile" className={`app-header__nav-link ${isActive('/profile') ? 'active' : ''}`}>
                            {initials ? (
                                <span className="app-header__avatar-badge">{initials}</span>
                            ) : (
                                label('nav.profile', 'Profile')
                            )}
                        </Link>
                    </nav>

                    <div className="app-header__actions">
                        <div className="app-header__status-cluster">
                            <button
                                onClick={() => window.location.reload()}
                                className="app-header__refresh-btn"
                                title={t('common.refreshApp')}
                                aria-label={t('common.refreshApp')}
                                type="button"
                            >
                                <RefreshCw size={19} />
                            </button>
                            <span
                                className={`app-header__status-dot app-header__status-dot--${systemStatus}`}
                                title={statusLabel}
                                aria-label={statusLabel}
                                role="status"
                            />
                        </div>
                        <div className="app-header__language-wrap">
                            <LanguageSelector />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
