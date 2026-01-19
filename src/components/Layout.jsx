import React from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import Footer from './Footer';
import BottomNav from './BottomNav';
import { useScanContext } from '../context/ScanContext';
import NotificationToast from './NotificationToast';

function Layout({ children }) {
    const location = useLocation();
    const { notification, actions } = useScanContext();
    const isHome = location.pathname === '/';
    const isLegalPage = ['/terms', '/privacy'].some(path => location.pathname.startsWith(path));

    return (
        <div className="app">
            {!isLegalPage && <AppHeader isHome={isHome} />}
            <NotificationToast
                notification={notification}
                onClose={actions.dismissNotification}
                onAction={notification?.action}
            />
            <div className="main-content">
                {children}
            </div>
            {!isLegalPage && <Footer />}
            {!isLegalPage && <BottomNav />}
        </div>
    );
}

export default Layout;
