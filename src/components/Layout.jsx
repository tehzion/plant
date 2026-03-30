import React from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import Footer from './Footer';
import BottomNav from './BottomNav';

function Layout({ children }) {
    const location = useLocation();
    const isHome = location.pathname === '/';
    const isLegalPage = ['/terms', '/privacy'].some(path => location.pathname.startsWith(path));
    const isScanFlow = location.pathname === '/' && location.search.includes('scan=true');

    return (
        <div className="app">
            <a href="#main-content" className="skip-link">Skip to content</a>
            {!isLegalPage && <AppHeader isHome={isHome} />}
            <main className="main-content" id="main-content">
                {children}
            </main>
            {!isLegalPage && !isScanFlow && <Footer />}
            {!isLegalPage && !isScanFlow && <BottomNav />}
        </div>
    );
}

export default Layout;
