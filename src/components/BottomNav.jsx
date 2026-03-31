import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import {
    BookOpen,
    ClipboardList,
    Home as HomeIcon,
    ScanLine,
    User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './BottomNav.css';

const BottomNav = () => {
    const location = useLocation();
    const { t, label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);
    const { user } = useAuth();
    const initials = user?.email
        ? user.email.split('@')[0].slice(0, 2).toUpperCase()
        : null;

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
                <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`} aria-current={isActive('/') ? 'page' : undefined}>
                    <span className="nav-item-icon">
                        <HomeIcon size={20} strokeWidth={1.85} />
                    </span>
                    <span className="nav-item-label">{label('nav.home', 'Home')}</span>
                </Link>

                <Link to="/history" className={`nav-item ${isActive('/history') ? 'active' : ''}`} aria-current={isActive('/history') ? 'page' : undefined}>
                    <span className="nav-item-icon">
                        <ClipboardList size={20} strokeWidth={1.85} />
                    </span>
                    <span className="nav-item-label">{label('nav.history', 'History')}</span>
                </Link>

                <Link to="/?scan=true" className={`nav-item nav-item--scan ${scanActive ? 'active' : ''}`} aria-current={scanActive ? 'page' : undefined}>
                    <span className="nav-item-scan-ring" aria-hidden="true" />
                    <span className="nav-item-icon">
                        <ScanLine size={24} strokeWidth={2.05} />
                    </span>
                    <span className="nav-item-label">{label('nav.scan', 'Scan')}</span>
                </Link>

                <Link to="/encyclopedia" className={`nav-item ${isActive('/encyclopedia') ? 'active' : ''}`} aria-current={isActive('/encyclopedia') ? 'page' : undefined}>
                    <span className="nav-item-icon">
                        <BookOpen size={20} strokeWidth={1.85} />
                    </span>
                    <span className="nav-item-label">{label('nav.encyclopedia', 'Encyclopedia')}</span>
                </Link>

                <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`} aria-current={isActive('/profile') ? 'page' : undefined}>
                    <span className="nav-item-icon nav-item-icon--profile">
                        {initials ? (
                            <span className="bottom-nav-avatar">{initials}</span>
                        ) : (
                            <User size={20} strokeWidth={1.85} />
                        )}
                        {initials && <span className="bottom-nav-auth-dot" />}
                    </span>
                    <span className="nav-item-label">{label('nav.profile', 'Profile')}</span>
                </Link>
            </div>
        </nav>
    );
};

export default BottomNav;
