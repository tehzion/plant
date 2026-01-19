import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useScanLogic } from '../hooks/useScanLogic';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';

const ScanContext = createContext();

export const ScanProvider = ({ children }) => {
    const { state, actions: logicActions } = useScanLogic();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();

    const [notification, setNotification] = useState(null);

    // Track location for async operations
    const locationRef = useRef(location);
    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    // Background Scan Notification
    useEffect(() => {
        // If loading and NOT on home page, show background notification
        if (state.loading && location.pathname !== '/') {
            setNotification({
                type: 'info',
                message: t('home.analyzingInBackground') || 'Analysis running in background...',
                duration: 5000
            });
        }
    }, [location.pathname, state.loading, t]);

    // Clear notification when arriving at results
    useEffect(() => {
        if (location.pathname.startsWith('/results')) {
            setNotification(null);
        }
    }, [location.pathname]);

    // Enhanced Actions wrapper
    const wrappedActions = useMemo(() => ({
        ...logicActions,
        performAnalyze: async (loc, locName) => {
            try {
                const id = await logicActions.performAnalyze(loc, locName);

                // Check if we are in background (not on Home)
                const currentPath = locationRef.current.pathname;

                if (currentPath !== '/') {
                    setNotification({
                        type: 'success',
                        message: t('home.analysisComplete') || 'Analysis Complete!',
                        actionLabel: t('home.viewResults') || 'View Now',
                        duration: 8000, // Longer duration for completion
                        action: () => {
                            navigate(`/results/${id}`);
                            setNotification(null);
                        }
                    });
                }
                return id;
            } catch (e) {
                // Error handling is done in logicActions, but we can show toast if in background
                const currentPath = locationRef.current.pathname;
                if (currentPath !== '/') {
                    setNotification({
                        type: 'error',
                        message: e.message || 'Analysis Failed',
                        duration: 5000
                    });
                }
                throw e;
            }
        },
        dismissNotification: () => setNotification(null)
    }), [logicActions, navigate, t]);

    return (
        <ScanContext.Provider value={{ state, actions: wrappedActions, notification }}>
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
