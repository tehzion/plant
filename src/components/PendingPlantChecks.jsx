import { CloudOff, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { usePendingPlantCheckList } from '../hooks/usePendingPlantChecks.js';
import { removePendingPlantCheck } from '../utils/pendingPlantChecks.js';
import './PendingPlantChecks.css';

// Saved offline checks on Home: how many are waiting for signal, and any the
// farmer must retake. Hidden when there are none.
export default function PendingPlantChecks({ owner, onOpen }) {
    const { t, language } = useLanguage();
    const checks = usePendingPlantCheckList(owner);
    if (!owner || !checks.length) return null;
    const waiting = checks.filter(check => check.state === 'waiting');
    const held = checks.filter(check => check.state === 'needs-attention');
    const time = value => new Date(value).toLocaleString(language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-CN' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const remove = async check => {
        if (!window.confirm(t('results.pendingCheckRemoveConfirm'))) return;
        await removePendingPlantCheck(owner, check.id).catch(() => {});
    };
    return <section className="pending-checks" aria-label={t('results.pendingChecksTitle')}>
        {waiting.length > 0 && <div className="pending-checks__row" role="status">
            <CloudOff size={20} aria-hidden="true" />
            <p><strong>{t(waiting.length === 1 ? 'results.pendingChecksWaitingOne' : 'results.pendingChecksWaiting').replace('{count}', waiting.length)}</strong>
                <span>{t('results.pendingChecksWaitingHint')}</span></p>
        </div>}
        {held.map(check => <div key={check.id} className="pending-checks__row pending-checks__row--held">
            <AlertCircle size={20} aria-hidden="true" />
            <p><strong>{t('results.pendingCheckHeldTitle').replace('{date}', time(check.savedAt))}</strong>
                <span>{check.lastError || t('results.pendingCheckNeedsAttention')}</span></p>
            <div className="pending-checks__actions">
                <button type="button" className="btn btn-primary" onClick={() => onOpen(check)}>{t('results.pendingCheckOpen')}</button>
                <button type="button" className="btn btn-secondary" onClick={() => remove(check)}>{t('results.pendingCheckRemove')}</button>
            </div>
        </div>)}
    </section>;
}
