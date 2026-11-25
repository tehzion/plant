import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import Footer from './Footer';
import BottomNav from './BottomNav';
import SyncStatusBanner from './SyncStatusBanner';
import AssistantWidget from './AssistantWidget';
import { useLanguage } from '../i18n/i18n.jsx';
import { getPageTitle } from './navItems.js';

const APP_NAME = 'KANB Agropreneur Nasional';

function Layout({ children }) {
    const location = useLocation();
    const isHome = location.pathname === '/';
    const isLegalPage = ['/terms', '/privacy'].some(path => location.pathname.startsWith(path));
    const isScanFlow = location.pathname === '/' && location.search.includes('scan=true');
    const { label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);
    const pageTitle = getPageTitle(location);
    const pageName = pageTitle ? label(pageTitle.key, pageTitle.fallback) : null;

    useEffect(() => {
        document.title = pageName ? `${pageName} · ${APP_NAME}` : APP_NAME;
    }, [pageName]);

    return (
        <div className={`app ${isLegalPage || isScanFlow ? 'app--without-bottom-nav' : ''}`}>
            <a href="#main-content" className="skip-link">{label('nav.skipToContent', 'Skip to content')}</a>
            {!isLegalPage && <AppHeader isHome={isHome} />}
            {!isLegalPage && <SyncStatusBanner />}
            <main className="main-content" id="main-content">
                {children}
            </main>
            {!isLegalPage && !isScanFlow && <Footer />}
            {!isLegalPage && !isScanFlow && <BottomNav />}
            <AssistantWidget />
        </div>
    );
}

export default Layout;
