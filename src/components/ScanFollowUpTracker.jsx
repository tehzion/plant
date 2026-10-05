import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getPlots } from '../utils/localStorage.js';
import { imageToBase64 } from '../utils/diseaseDetection.js';
import { resolvePrivateImageUrl } from '../utils/privateImageStorage.js';
import { saveScanFollowUp } from '../utils/scanFollowUpStorage.js';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';

const ScanFollowUpTracker = ({ scan, onSaved }) => {
    const { language, t } = useLanguage();
    const { user } = useAuth();
    const copy = getScanQualityCopy(language);
    const [plots, setPlots] = useState([]);
    const [form, setForm] = useState({ plotId: scan.plot_id || '', nextCheckDate: scan.followUp?.nextCheckDate || '', outcome: 'pending', severity: '', note: '' });
    const [photo, setPhoto] = useState(null);
    const [photos, setPhotos] = useState({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const update = (field, value) => setForm(current => ({ ...current, [field]: value }));
    useEffect(() => {
        let cancelled = false;
        Promise.resolve(getPlots(user?.id || null)).then(data => { if (!cancelled) setPlots(data); }).catch(() => {});
        return () => { cancelled = true; };
    }, [user?.id]);
    useEffect(() => {
        let cancelled = false;
        Promise.all((scan.followUp?.history || []).filter(event => event.photoPath).map(async event =>
            [event.id, await resolvePrivateImageUrl(event.photoPath)])).then(entries => {
            if (!cancelled) setPhotos(Object.fromEntries(entries));
        });
        return () => { cancelled = true; };
    }, [scan.followUp]);
    const save = async event => {
        event.preventDefault();
        if (saving) return;
        setSaving(true); setMessage('');
        try {
            const photoBase64 = photo ? await imageToBase64(photo, 600) : '';
            const metadata = await saveScanFollowUp(scan.id, { ...form, photoBase64 }, user?.id || null);
            onSaved(metadata); setPhoto(null); setMessage(copy.saved);
        } catch { setMessage(copy.failed); }
        finally { setSaving(false); }
    };
    return <section className="scan-followup-tracker app-surface" aria-label={copy.followUp}>
        <details><summary>{copy.followUp}{scan.followUp?.nextCheckDate ? ` · ${scan.followUp.nextCheckDate}` : ''}</summary>
        <form onSubmit={save}><fieldset disabled={saving}>
            <label>{copy.plot}<select value={form.plotId} onChange={e => update('plotId', e.target.value)}>
                <option value="">{copy.noPlot}</option>{plots.map(plot => <option value={plot.id} key={plot.id}>{plot.name}</option>)}
            </select></label>
            <label>{copy.date}<input type="date" value={form.nextCheckDate} onChange={e => update('nextCheckDate', e.target.value)} /></label>
            <label>{copy.outcome}<select value={form.outcome} onChange={e => update('outcome', e.target.value)}>
                {['pending', 'improving', 'unchanged', 'worsening', 'resolved'].map(state => <option value={state} key={state}>{copy[state]}</option>)}
            </select></label>
            <label>{copy.severity}<select value={form.severity} onChange={e => update('severity', e.target.value)}>
                <option value="">—</option>{['mild', 'moderate', 'severe', 'critical'].map(state => <option value={state} key={state}>{t(`results.${state}`)}</option>)}
            </select></label>
            <label>{copy.symptoms}<textarea maxLength={2000} value={form.note} onChange={e => update('note', e.target.value)} /></label>
            <label>{t('results.plantPhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] || null)} /></label>
            <button type="submit" className="btn btn-primary">{saving ? t('common.loading') : copy.save}</button>
        </fieldset></form>
        {message && <p role="status">{message}</p>}
        {(scan.followUp?.history || []).length > 0 && <ol>{scan.followUp.history.map(event => <li key={event.id}>
            <time dateTime={event.recordedAt}>{new Date(event.recordedAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'ms' ? 'ms-MY' : 'en-GB')}</time>
            {' — '}{copy[event.outcome]}{event.severity ? ` · ${t(`results.${event.severity}`)}` : ''}
            {event.note && <p>{event.note}</p>}
            {(event.photo || photos[event.id]) && <img src={event.photo || photos[event.id]} alt={copy.followUp} loading="lazy" />}
        </li>)}</ol>}
        </details>
    </section>;
};
export default ScanFollowUpTracker;
