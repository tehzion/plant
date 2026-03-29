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
            {!isLegalPage && <AppHeader isHome={isHome} />}
            <div className="main-content">
                {children}
            </div>
            {!isLegalPage && !isScanFlow && <Footer />}
            {!isLegalPage && !isScanFlow && <BottomNav />}
        </div>
    );
}

export default Layout;
