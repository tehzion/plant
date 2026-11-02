import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { useScanService } from '../hooks/useScanService.js';
import './ScanServiceNotice.css';

export default function ScanServiceNotice({ capture = false }) {
    const { t } = useLanguage();
    const { status, checking, retry } = useScanService();
    const hasFailed = useRef(false);
    if (['offline', 'unavailable'].includes(status)) hasFailed.current = true;
    if (status === 'online') return hasFailed.current ? <p role="status" className="scan-service-restored">{t('results.serviceRestored')}</p> : null;
    if (status === 'checking') return capture ? <p role="status">{t('results.serviceChecking')}</p> : null;
    return <aside className="scan-service-notice" aria-label={t('results.servicePaused')}>
        <div className="scan-service-notice__title"><WifiOff size={20} aria-hidden="true" /><strong>{t(status === 'offline' ? 'results.serviceOffline' : 'results.servicePaused')}</strong></div>
        <p>{t(capture ? 'results.serviceCaptureHint' : 'results.serviceSavedHint')}</p>
        <div className="scan-service-notice__actions">
            <button type="button" className="btn btn-secondary" disabled={checking} onClick={retry}>{t(checking ? 'results.serviceChecking' : 'results.serviceRetry')}</button>
            {capture && <Link className="btn btn-secondary" to="/history">{t('nav.history')}</Link>}
        </div>
    </aside>;
}
