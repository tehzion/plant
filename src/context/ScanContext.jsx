import { createContext, useContext, useEffect, useRef, useMemo } from 'react';
import { useScanLogic } from '../hooks/useScanLogic';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { useNotifications } from './NotificationProvider.jsx';

const ScanContext = createContext();

export const ScanProvider = ({ children }) => {
    const { state, actions: logicActions } = useScanLogic();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();
    const { notify, dismissNotification } = useNotifications();

    // Track location for async operations
    const locationRef = useRef(location);
    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    // Track the background notification ID
    const backgroundNotifId = useRef(null);

    // Background Scan Notification
    useEffect(() => {
        // If loading and NOT on home page scan view, show or update background notification
        const searchParams = new URLSearchParams(location.search);
        const isScanView = location.pathname === '/' && searchParams.get('scan') === 'true';

        if (state.loading && !isScanView) {
            if (!backgroundNotifId.current) {
                backgroundNotifId.current = notify({
                    type: 'info',
                    message: t('home.analyzingInBackground') || 'Analysis running in background...',
                    duration: 0 // Persistent
                });
            }
        } else if (!state.loading && backgroundNotifId.current) {
            dismissNotification(backgroundNotifId.current);
            backgroundNotifId.current = null;
        }
    }, [location.pathname, location.search, notify, state.loading, t, dismissNotification]);

    // Enhanced Actions wrapper
    const wrappedActions = useMemo(() => ({
        ...logicActions,
        performAnalyze: async (loc, locName) => {
            try {
                const id = await logicActions.performAnalyze(loc, locName);

                // Dismiss any background notification immediately
                if (backgroundNotifId.current) {
                    dismissNotification(backgroundNotifId.current);
                    backgroundNotifId.current = null;
                }

                // Check if we are in background (not actively on the scan loading screen)
                const currentPath = locationRef.current.pathname;
                const currentSearch = locationRef.current.search;
                const isActivelyScanning = currentPath === '/' && currentSearch.includes('scan=true');

                if (!isActivelyScanning) {
                    let successNotificationId = null;
                    successNotificationId = notify({
                        type: 'success',
                        message: t('home.analysisComplete') || 'Analysis Complete!',
                        actionLabel: t('home.viewResults') || 'View Now',
                        duration: 8000, 
                        action: () => {
                            navigate(`/results/${id}`);
                            dismissNotification(successNotificationId);
                        }
                    });
                }
                return id;
            } catch (e) {
                // Dismiss any background notification
                if (backgroundNotifId.current) {
                    dismissNotification(backgroundNotifId.current);
                    backgroundNotifId.current = null;
                }

                const currentPath = locationRef.current.pathname;
                const currentSearch = locationRef.current.search;
                const isActivelyScanning = currentPath === '/' && currentSearch.includes('scan=true');

                if (!isActivelyScanning) {
                    notify({
                        type: 'error',
                        message: e.userMessage || e.message || t('home.errorAnalysis') || 'Analysis Failed',
                        duration: 5000
                    });
                }
                throw e;
            }
        },
        showBackgroundNotification: () => {
            if (!backgroundNotifId.current) {
                backgroundNotifId.current = notify({
                    type: 'info',
                    message: t('home.analyzingInBackground') || 'Analysis running in background...',
                    duration: 0
                });
            }
        },
        dismissNotification
    }), [dismissNotification, logicActions, navigate, notify, t]);

    return (
        <ScanContext.Provider value={{ state, actions: wrappedActions }}>
            {children}
        </ScanContext.Provider>
    );
};

export const useScanContext = () => {
    const context = useContext(ScanContext);
    if (!context) {
        throw new Error('useScanContext must be used within a ScanProvider');
    }
    return context;
};

export default ScanContext;
