import { useCallback, useEffect, useState } from 'react';
import { CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/i18n.jsx';
import { getSyncSummary, listWaitingRecords, retryFailedSync, SYNC_STATUS_EVENT } from '../utils/syncQueue.js';
import './SyncStatusBanner.css';
import { resolveSyncConflict } from '../utils/cloudSync.js';
import { getOfflineCopy } from '../utils/offlineCopy.js';

const DEMO_USER_ID = 'demo-user-123';
const RecordPreview = ({ record, language }) => {
    const { t } = useLanguage();
    const labels = {
        en: { notes: 'Notes', name: 'Name', disease: 'Finding', crop: 'Crop', crop_type: 'Crop', product_used: 'Product', activity_date: 'Date', quantity: 'Quantity', operator: 'Operator', type: 'Activity' },
        ms: { notes: 'Catatan', name: 'Nama', disease: 'Penemuan', crop: 'Tanaman', crop_type: 'Tanaman', product_used: 'Produk', activity_date: 'Tarikh', quantity: 'Kuantiti', operator: 'Pengendali', type: 'Aktiviti' },
        zh: { notes: '备注', name: '名称', disease: '发现', crop: '作物', crop_type: '作物', product_used: '产品', activity_date: '日期', quantity: '用量', operator: '操作人员', type: '活动' },
    };
    const fields = labels[language] || labels.ms;
    return <dl>{Object.keys(fields).filter(key => record?.[key] != null).map(key => <div key={key}><dt>{fields[key]}</dt><dd>{String(record[key])}</dd></div>)}
        {record?.state && Object.entries(record.state).map(([key, value]) => <div key={key}><dt>{t(`mygap.${key}`)}</dt><dd>{value === true ? '✓' : value === 'not_applicable' ? '—' : '○'}</dd></div>)}
    </dl>;
};

// Shows farmers whether their records are only on this device. It stays hidden
// when online with nothing waiting, so it adds no noise to normal use.
const SyncStatusBanner = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const copy = getOfflineCopy(language);
    const [resolving, setResolving] = useState(null);
    const [resolutionStatus, setResolutionStatus] = useState('');
    const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
    const [summary, setSummary] = useState({ pending: 0, failed: 0, conflict: 0 });
    const [waiting, setWaiting] = useState(null);
    const owner = user?.id && user.id !== DEMO_USER_ID ? `user:${user.id}` : null;
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };

    const refresh = useCallback(async () => {
        if (!owner) return setSummary({ pending: 0, failed: 0, conflict: 0 });
        try {
            setSummary(await getSyncSummary(owner));
        } catch { /* IndexedDB unavailable */ }
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

    const toggleWaiting = async () => {
        if (waiting) return setWaiting(null);
        try { setWaiting(await listWaitingRecords(owner)); } catch { setWaiting([]); }
    };
    const resolve = async (item, choice) => {
        setResolving(item.id); setResolutionStatus('');
        try {
            await resolveSyncConflict(user.id, item.id, choice);
            setWaiting(await listWaitingRecords(owner));
            setResolutionStatus(copy.done);
            refresh();
        } catch { setResolutionStatus(copy.failed); }
        finally { setResolving(null); }
    };

    const problems = summary.failed + summary.conflict;
    if (online && !summary.pending && !problems && !resolutionStatus) return null;

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
            {owner && (summary.pending > 0 || problems > 0) && (
                <button type="button" className="sync-status__retry" onClick={toggleWaiting} aria-expanded={Boolean(waiting)}>
                    {waiting ? label('assessment.ux.syncHideWaiting', 'Hide') : label('assessment.ux.syncShowWaiting', 'Show waiting records')}
                </button>
            )}
            {online && summary.failed > 0 && (
                <button type="button" className="sync-status__retry" onClick={retry}>
                    {label('assessment.sync.retry', 'Retry sync')}
                </button>
            )}
            {waiting && (
                <ul className="sync-status__list">
                    {waiting.map((item) => (
                        <li key={item.id}>
                            {label(`assessment.ux.collection.${item.collection}`, item.collection)}
                            {' · '}{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                            {item.state !== 'pending' && ` · ${item.lastError || item.state}`}
                            {item.state === 'conflict' && <div>
                                <p>{copy.changed} {copy.help}</p>
                                <details><summary>{copy.local} / {copy.remote}</summary>
                                    <strong>{copy.local}</strong>{item.type === 'delete' ? <p>{copy.deleted}</p> : <RecordPreview record={item.payload} language={language} />}
                                    <strong>{copy.remote}</strong><RecordPreview record={item.conflict?.serverRecord} language={language} />
                                </details>
                                <button type="button" className="sync-status__retry" disabled={!online || Boolean(resolving) || item.type === 'create' || item.conflict?.reason === 'ownership'} onClick={() => resolve(item, 'mine')}>{copy.mine}</button>
                                <button type="button" className="sync-status__retry" disabled={!online || Boolean(resolving)} onClick={() => resolve(item, 'server')}>{copy.server}</button>
                            </div>}
                        </li>
                    ))}
                </ul>
            )}
            {resolutionStatus && <><p role="status">{resolutionStatus}</p><button type="button" className="sync-status__retry" aria-label={label('common.close', 'Close')} onClick={() => setResolutionStatus('')}>×</button></>}
        </div>
    );
};

export default SyncStatusBanner;
