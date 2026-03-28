import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import NotificationToast from '../components/NotificationToast';
import { registerNotificationHandler } from '../utils/notificationBus';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const [queue, setQueue]                   = useState([]);
    const [activeNotification, setActive]     = useState(null);
    const nextIdRef                           = useRef(0);
    const timerRef                            = useRef(null);

    // ── Enqueue ───────────────────────────────────────────────────────────────
    const notify = useCallback((notification) => {
        if (!notification?.message) return null;
        const id = ++nextIdRef.current;
        setQueue((q) => [...q, { id, duration: 3500, ...notification }]);
        return id;
    }, []);

    // ── Dismiss (by id, or head of queue) ────────────────────────────────────
    const dismissNotification = useCallback((id) => {
        setQueue((q) =>
            typeof id === 'undefined' ? q.slice(1) : q.filter((n) => n.id !== id),
        );
    }, []);

    // ── Sync active notification from queue head ──────────────────────────────
    useEffect(() => {
        setActive(queue[0] ?? null);
    }, [queue]);

    // ── Auto-dismiss timer ────────────────────────────────────────────────────
    useEffect(() => {
        clearTimeout(timerRef.current);
        if (!activeNotification || activeNotification.duration === 0) return;

        timerRef.current = setTimeout(() => {
            dismissNotification(activeNotification.id);
        }, activeNotification.duration ?? 3500);

        return () => clearTimeout(timerRef.current);
    }, [activeNotification, dismissNotification]);

    // ── Register with the global notification bus ─────────────────────────────
    useEffect(() => registerNotificationHandler(notify), [notify]);

    // ── Context value ─────────────────────────────────────────────────────────
    const value = useMemo(
        () => ({
            notify,
            dismissNotification,
            notifySuccess: (message, options = {}) =>
                notify({ ...options, message, type: 'success' }),
            notifyError: (message, options = {}) =>
                notify({ ...options, message, type: 'error' }),
            notifyInfo: (message, options = {}) =>
                notify({ ...options, message, type: 'info' }),
            notifyWarning: (message, options = {}) =>
                notify({ ...options, message, type: 'warning' }),
        }),
        [dismissNotification, notify],
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <NotificationToast
                notification={activeNotification}
                onClose={() => dismissNotification(activeNotification?.id)}
                onAction={() => {
                    activeNotification?.action?.();
                    dismissNotification(activeNotification?.id);
                }}
            />
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
    return ctx;
};
