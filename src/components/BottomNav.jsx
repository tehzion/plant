import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { Home as HomeIcon, ClipboardList, BookOpen, User } from 'lucide-react';

const BottomNav = () => {
    const location = useLocation();
    const { t } = useLanguage();
    const [showLegal, setShowLegal] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setShowLegal(true);
            } else {
                setShowLegal(false);
            }
        };

        if (location.pathname === '/') {
            window.addEventListener('scroll', handleScroll, { passive: true });
            handleScroll(); // Check on initial render
        } else {
            setShowLegal(false); // Hide on other pages
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [location.pathname]);

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
                    <span className="nav-item-icon"><HomeIcon size={20} strokeWidth={1.5} /></span>
                    <span className="nav-item-label">{t('nav.home')}</span>
                </Link>
                <Link to="/history" className={`nav-item ${isActive('/history') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><ClipboardList size={20} strokeWidth={1.5} /></span>
                    <span className="nav-item-label">{t('nav.history')}</span>
                </Link>
                <Link to="/encyclopedia" className={`nav-item ${isActive('/encyclopedia') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><BookOpen size={20} strokeWidth={1.5} /></span>
                    <span className="nav-item-label">{t('nav.encyclopedia')}</span>
                </Link>
                <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><User size={20} strokeWidth={1.5} /></span>
                    <span className="nav-item-label">{t('nav.profile')}</span>
                </Link>
            </div>
            <div className="persistent-footer">
                {location.pathname === '/' && (
                    <div className={`mobile-legal-links ${showLegal ? 'visible' : ''}`}>
                        <Link to="/terms">{t('nav.terms')}</Link>
                        <span className="separator">•</span>
                        <Link to="/privacy">{t('nav.privacy')}</Link>
                    </div>
                )}
                <p className="copyright-text">&copy; {new Date().getFullYear()} {t('common.madeInMY')} <span className="my-badge">MY</span></p>
            </div>
            <style>{`
                .bottom-nav-content {
                    padding: 2px 0;
                }
                .nav-item-label {
                    font-size: 0.7rem;
                }
                .persistent-footer {
                    padding-bottom: 2px;
                }
                .copyright-text {
                    margin-top: 0;
                    margin-bottom: 2px;
                }
                .mobile-legal-links {
                    opacity: 0;
                    transition: opacity 0.3s ease-in-out;
                    height: 0;
                    overflow: hidden;
                    margin-bottom: 0;
                }
                .mobile-legal-links.visible {
                    opacity: 1;
                    height: auto;
                    margin-bottom: 4px;
                }
            `}</style>
        </nav>
    );
};

export default BottomNav;
