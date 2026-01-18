import React from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import Footer from './Footer';
import BottomNav from './BottomNav';

function Layout({ children }) {
    const location = useLocation();
    const isHome = location.pathname === '/';
    const isLegalPage = ['/terms', '/privacy'].some(path => location.pathname.startsWith(path));

    return (
        <div className="app">
            {!isLegalPage && <AppHeader isHome={isHome} />}
            <div className="main-content">
                {children}
            </div>
            {!isLegalPage && <Footer />}
            {!isLegalPage && <BottomNav />}
        </div>
    );
}

export default Layout;
