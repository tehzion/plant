import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { Home as HomeIcon, ClipboardList, BookOpen, User } from 'lucide-react';

const BottomNav = () => {
    const location = useLocation();
    const { t } = useLanguage();

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-content">
                <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><HomeIcon size={24} strokeWidth={1.5} /></span>
                    <span>{t('nav.home')}</span>
                </Link>
                <Link to="/history" className={`nav-item ${isActive('/history') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><ClipboardList size={24} strokeWidth={1.5} /></span>
                    <span>{t('nav.history')}</span>
                </Link>
                <Link to="/encyclopedia" className={`nav-item ${isActive('/encyclopedia') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><BookOpen size={24} strokeWidth={1.5} /></span>
                    <span>{t('nav.encyclopedia')}</span>
                </Link>
                <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><User size={24} strokeWidth={1.5} /></span>
                    <span>{t('nav.profile')}</span>
                </Link>
            </div>
            <div className="persistent-footer">
                {location.pathname === '/' && (
                    <div className="mobile-legal-links">
                        <Link to="/terms">{t('nav.terms')}</Link>
                        <span className="separator">•</span>
                        <Link to="/privacy">{t('nav.privacy')}</Link>
                    </div>
                )}
                <p>&copy; {new Date().getFullYear()} Dengan bangganya dibuat di MALAYSIA <span className="my-badge">MY</span></p>
            </div>
        </nav>
    );
};

export default BottomNav;
