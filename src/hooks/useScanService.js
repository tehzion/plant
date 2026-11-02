import { useSyncExternalStore } from 'react';
import { checkHealthOnce, hasRecentHealth } from '../utils/serverHealth.js';

let status = 'checking';
let checking = false;
let request = null;
const listeners = new Set();
const snapshot = () => status;
const emit = next => { status = next; listeners.forEach(listener => listener()); };

export const refreshScanService = () => {
    if (request) return request;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        emit('offline');
        return Promise.resolve('offline');
    }
    checking = true;
    listeners.forEach(listener => listener());
    request = checkHealthOnce().then(() => { const next = navigator.onLine === false ? 'offline' : 'online'; emit(next); return next; })
        .catch(() => { const next = navigator.onLine === false ? 'offline' : 'unavailable'; emit(next); return next; })
        .finally(() => { checking = false; request = null; listeners.forEach(listener => listener()); });
    return request;
};

let stopWatching;
const subscribe = listener => {
    listeners.add(listener);
    if (listeners.size === 1) {
        const offline = () => emit('offline');
        const refresh = () => {
            if (navigator.onLine === false) offline();
            else if (hasRecentHealth()) emit('online');
            else refreshScanService();
        };
        const visible = () => { if (document.visibilityState === 'visible') refresh(); };
        window.addEventListener('online', refresh);
        window.addEventListener('offline', offline);
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', visible);
        const interval = window.setInterval(refresh, 60000);
        refresh();
        stopWatching = () => {
            window.clearInterval(interval);
            window.removeEventListener('online', refresh);
            window.removeEventListener('offline', offline);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', visible);
        };
    }
    return () => { listeners.delete(listener); if (!listeners.size) { stopWatching?.(); stopWatching = null; } };
};

export const useScanService = () => {
    const serviceStatus = useSyncExternalStore(subscribe, snapshot, () => 'checking');
    const isChecking = useSyncExternalStore(subscribe, () => checking, () => false);
    return { status: serviceStatus, checking: isChecking, retry: refreshScanService };
};
