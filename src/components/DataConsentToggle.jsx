import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { CONSENT_CHANGED, getDataConsent, saveDataConsent } from '../utils/dataConsent';
import './DataConsentToggle.css';

// Opt-in, unchecked by default. Scanning works the same either way.
const DataConsentToggle = ({ disabled = false }) => {
    const { t } = useLanguage();
    const [checked, setChecked] = useState(() => getDataConsent().aiImprovement);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    useEffect(() => {
        const update = () => setChecked(getDataConsent().aiImprovement);
        window.addEventListener(CONSENT_CHANGED, update);
        return () => window.removeEventListener(CONSENT_CHANGED, update);
    }, []);
    const change = async (event) => {
        const next = event.target.checked;
        setChecked(next);
        setSaving(true); setError(false);
        try { setChecked((await saveDataConsent(next)).aiImprovement); }
        catch { setChecked(getDataConsent().aiImprovement); setError(true); }
        finally { setSaving(false); }
    };

    return (
        <div aria-busy={saving}><label className="data-consent-toggle">
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled || saving}
                onChange={change}
            />
            <span>
                <strong>{t('home.dataConsentLabel')}</strong>
                <small>
                    {t('home.dataConsentHint')}{' '}
                    <Link to="/privacy">{t('home.dataConsentPrivacyLink')}</Link>
                </small>
            </span>
        </label>{error && <p role="alert">{t('photoPrivacy.saveFailed')}</p>}</div>
    );
};

export default DataConsentToggle;
