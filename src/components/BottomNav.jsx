import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { Home as HomeIcon, ClipboardList, BookOpen, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BottomNav = () => {
    const location = useLocation();
    const { t } = useLanguage();
    const { user } = useAuth();
    const [showLegal, setShowLegal] = useState(false);

    // Initials for avatar
    const initials = user?.email
        ? user.email.split('@')[0].slice(0, 2).toUpperCase()
        : null;

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
                    <span className="nav-item-icon" style={{ position: 'relative' }}>
                        {initials ? (
                            <span className="bottom-nav-avatar">{initials}</span>
                        ) : (
                            <User size={20} strokeWidth={1.5} />
                        )}
                        {initials && <span className="bottom-nav-auth-dot" />}
                    </span>
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

                .bottom-nav-avatar {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: var(--color-primary);
                    color: white;
                    font-size: 0.6rem;
                    font-weight: 800;
                    letter-spacing: 0;
                }

                .bottom-nav-auth-dot {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #22c55e;
                    border: 1.5px solid white;
                }
            `}</style>
        </nav>
    );
};

export default BottomNav;
