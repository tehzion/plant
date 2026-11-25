import { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { neonApiRequest } from '../utils/neonApi.js';
import CustomModal from './CustomModal.jsx';

export default function WithdrawScanPhotos({ scan }) {
    const { t } = useLanguage();
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');
    const withdraw = async () => {
        setBusy(true); setStatus('');
        try {
            await neonApiRequest(`/api/scans/${encodeURIComponent(scan.id)}/withdraw-photos`, {
                method: 'POST', authRequired: false, body: JSON.stringify({ feedbackToken: scan.feedbackToken || undefined }),
            });
            setStatus('withdrawn');
        } catch { setStatus('withdrawFailed'); }
        finally { setBusy(false); }
    };
    return <section className="app-surface" style={{ padding: 20, marginTop: 20 }} aria-label={t('photoPrivacy.title')}>
        <h3>{t('photoPrivacy.title')}</h3>
        <p>{t('photoPrivacy.withdrawHint')}</p>
        <button className="btn btn-secondary" type="button" disabled={busy || status === 'withdrawn'} onClick={() => setConfirm(true)}>{t(`photoPrivacy.${busy ? 'working' : 'withdraw'}`)}</button>
        {status && <p role={status === 'withdrawn' ? 'status' : 'alert'}>{t(`photoPrivacy.${status}`)}</p>}
        <CustomModal isOpen={confirm} onClose={() => setConfirm(false)} onConfirm={withdraw} type="confirm" title={t('photoPrivacy.withdraw')} message={t('photoPrivacy.confirm')} confirmText={t('photoPrivacy.withdraw')} cancelText={t('common.cancel')} />
    </section>;
}
