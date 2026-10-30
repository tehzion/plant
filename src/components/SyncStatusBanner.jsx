import { useCallback, useEffect, useState } from 'react';
import { CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/i18n.jsx';
import { getSyncSummary, retryFailedSync, SYNC_STATUS_EVENT } from '../utils/syncQueue.js';
import './SyncStatusBanner.css';

const DEMO_USER_ID = 'demo-user-123';

// Shows farmers whether their records are only on this device. It stays hidden
// when online with nothing waiting, so it adds no noise to normal use.
const SyncStatusBanner = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
    const [summary, setSummary] = useState({ pending: 0, failed: 0, conflict: 0 });
    const owner = user?.id && user.id !== DEMO_USER_ID ? `user:${user.id}` : null;
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };

    const refresh = useCallback(async () => {
        if (!owner) return setSummary({ pending: 0, failed: 0, conflict: 0 });
        try { setSummary(await getSyncSummary(owner)); } catch { /* IndexedDB unavailable */ }
    }, [owner]);

    useEffect(() => {
        const update = () => { setOnline(navigator.onLine !== false); refresh(); };
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        window.addEventListener(SYNC_STATUS_EVENT, refresh);
        refresh();
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
            window.removeEventListener(SYNC_STATUS_EVENT, refresh);
        };
    }, [refresh]);

    const retry = async () => {
        if (!owner) return;
        await retryFailedSync(owner);
        const { flushAuthenticatedSyncQueue } = await import('../utils/cloudSync.js');
        await flushAuthenticatedSyncQueue(user.id).catch(() => {});
        refresh();
    };

    const problems = summary.failed + summary.conflict;
    if (online && !summary.pending && !problems) return null;

    return (
        <div className={`sync-status ${problems ? 'sync-status--problem' : online ? 'sync-status--pending' : 'sync-status--offline'}`} role="status" aria-live="polite">
            {problems ? <AlertTriangle size={18} aria-hidden="true" /> : online ? <RefreshCw size={18} aria-hidden="true" /> : <CloudOff size={18} aria-hidden="true" />}
            <div className="sync-status__text">
                <strong>{online ? label('assessment.sync.online', 'Online') : label('assessment.sync.offline', 'You are offline')}</strong>
                <span>
                    {!online && !summary.pending && label('assessment.sync.offlineHint', 'Farm records and myGAP logs are saved on this device. AI disease checks need internet.')}
                    {summary.pending > 0 && label('assessment.sync.pending', '{count} record(s) saved on this device, waiting to sync').replace('{count}', summary.pending)}
                    {problems > 0 && ` ${label('assessment.sync.failed', '{count} record(s) could not sync. They are still saved on this device.').replace('{count}', problems)}`}
                </span>
            </div>
            {online && summary.failed > 0 && (
                <button type="button" className="sync-status__retry" onClick={retry}>
                    {label('assessment.sync.retry', 'Retry sync')}
                </button>
            )}
        </div>
    );
};

export default SyncStatusBanner;
