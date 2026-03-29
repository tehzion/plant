import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import {
    BookOpen,
    ClipboardList,
    Home as HomeIcon,
    ScanLine,
    Sprout,
    User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './BottomNav.css';

const BottomNav = () => {
    const location = useLocation();
    const { t, label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);
    const { user } = useAuth();
    const [showLegal, setShowLegal] = useState(false);

    const initials = user?.email
        ? user.email.split('@')[0].slice(0, 2).toUpperCase()
        : null;

    useEffect(() => {
        const handleScroll = () => {
            setShowLegal(window.scrollY > 50);
        };

        if (location.pathname === '/') {
            window.addEventListener('scroll', handleScroll, { passive: true });
            handleScroll();
        } else {
            setShowLegal(true);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [location.pathname]);

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/' && !location.search.includes('scan=true');
        }
        return location.pathname.startsWith(path);
    };

    const scanActive = location.pathname === '/' && location.search.includes('scan=true');

    return (
        <nav className="bottom-nav" aria-label={label('nav.primary', 'Primary navigation')}>
            <div className="bottom-nav-shell">
                <div className="bottom-nav-brandbar">
                    <span className="bottom-nav-brandpill">
                        <span className="bottom-nav-brandicon" aria-hidden="true">
                            <Sprout size={12} strokeWidth={2.1} />
                        </span>
                        KANB
                    </span>
                </div>

                <div className="bottom-nav-content">
                    <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                        <span className="nav-item-icon">
                            <HomeIcon size={20} strokeWidth={1.7} />
                        </span>
                        <span className="nav-item-label">{label('nav.home', 'Home')}</span>
                    </Link>

                    <Link to="/history" className={`nav-item ${isActive('/history') ? 'active' : ''}`}>
                        <span className="nav-item-icon">
                            <ClipboardList size={20} strokeWidth={1.7} />
                        </span>
                        <span className="nav-item-label">{label('nav.history', 'History')}</span>
                    </Link>

                    <Link to="/?scan=true" className={`nav-item nav-item--primary ${scanActive ? 'active' : ''}`}>
                        <span className="nav-item-icon">
                            <ScanLine size={24} strokeWidth={1.9} />
                        </span>
                        <span className="nav-item-label">{label('nav.scan', 'Scan')}</span>
                    </Link>

                    <Link to="/encyclopedia" className={`nav-item ${isActive('/encyclopedia') ? 'active' : ''}`}>
                        <span className="nav-item-icon">
                            <BookOpen size={20} strokeWidth={1.7} />
                        </span>
                        <span className="nav-item-label">{label('nav.encyclopedia', 'Guide')}</span>
                    </Link>

                    <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                        <span className="nav-item-icon nav-item-icon--profile">
                            {initials ? (
                                <span className="bottom-nav-avatar">{initials}</span>
                            ) : (
                                <User size={20} strokeWidth={1.7} />
                            )}
                            {initials && <span className="bottom-nav-auth-dot" />}
                        </span>
                        <span className="nav-item-label">{label('nav.profile', 'Profile')}</span>
                    </Link>
                </div>

                <div className="persistent-footer">
                    <div className={`mobile-legal-links ${showLegal ? 'visible' : ''}`}>
                        <Link to="/terms">{t('nav.terms')}</Link>
                        <span className="separator">•</span>
                        <Link to="/privacy">{t('nav.privacy')}</Link>
                    </div>
                    <p className="copyright-text">
                        &copy; {new Date().getFullYear()} {t('common.madeInMY')} <span className="my-badge">MY</span>
                    </p>
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
