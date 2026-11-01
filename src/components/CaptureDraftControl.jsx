import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { saveCaptureDraft, loadCaptureDraft, discardCaptureDraft, captureDraftSignature } from '../utils/captureDraft.js';

export default function CaptureDraftControl({ owner, state, onResume }) {
    const { t, language } = useLanguage();
    const [draft, setDraft] = useState(null);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const request = useRef(0);
    const saveButton = useRef(null);
    useEffect(() => {
        const id = ++request.current;
        setDraft(null); setFailed(false); setBusy(false);
        loadCaptureDraft(owner).then(value => { if (id === request.current) setDraft(value); }).catch(() => {});
        return () => { request.current++; };
    }, [owner]);
    const hasPhotos = Boolean(state.selectedImage || state.selectedLeafImage);
    if (!owner || (!hasPhotos && !draft)) return null;
    const saved = draft && captureDraftSignature(draft) === captureDraftSignature(state);
    const save = async () => {
        const id = ++request.current;
        setBusy(true); setFailed(false);
        try { const value = await saveCaptureDraft(owner, state); if (id === request.current) setDraft(value); }
        catch { if (id === request.current) setFailed(true); }
        finally { if (id === request.current) { setBusy(false); requestAnimationFrame(() => saveButton.current?.focus({ preventScroll: true })); } }
    };
    const discard = async () => {
        if (!window.confirm(t('results.discardDraftConfirm'))) return;
        const id = ++request.current;
        setBusy(true); setFailed(false);
        try { await discardCaptureDraft(owner); if (id === request.current) setDraft(null); }
        catch { if (id === request.current) setFailed(true); }
        finally { if (id === request.current) setBusy(false); }
    };
    return <section className="capture-draft-control" aria-label={t('results.photoDraft')} aria-busy={busy}>
        {draft && !hasPhotos && <><h2>{t('results.photoDraft')}</h2><p>{t('results.draftAvailable').replace('{date}', new Date(draft.savedAt).toLocaleString(language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-CN' : 'en-GB'))}</p></>}
        <p role={failed ? 'alert' : 'status'}>{saved && !busy && !failed ? t('results.draftSavedAt').replace('{time}', new Date(draft.savedAt).toLocaleTimeString(language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-CN' : 'en-GB')) : t(failed ? 'results.draftFailed' : busy ? 'results.draftSaving' : hasPhotos ? 'results.draftSaveHint' : 'results.draftResumeHint')}</p>
        <div className="ui-action-row">
            {hasPhotos ? <button ref={saveButton} type="button" className="btn btn-secondary" disabled={busy} onClick={save}>{t(busy ? 'results.draftSaving' : 'results.saveDraft')}</button> : <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onResume(draft)}>{t('results.resumeDraft')}</button>}
            {draft && <button type="button" className="btn btn-secondary" disabled={busy} onClick={discard}>{t('results.discardDraft')}</button>}
        </div>
    </section>;
}
