import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { CONSENT_CHANGED, getDataConsent, saveDataConsent } from '../utils/dataConsent';
import { useDataOwner } from '../context/AuthContext';
import './DataConsentToggle.css';

// Opt-in, unchecked by default. Scanning works the same either way.
const DataConsentToggle = ({ disabled = false }) => {
    const { t } = useLanguage();
    const owner = useDataOwner();
    const [checked, setChecked] = useState(() => getDataConsent(owner).aiImprovement);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    useEffect(() => {
        const update = () => setChecked(getDataConsent(owner).aiImprovement);
        update();
        window.addEventListener(CONSENT_CHANGED, update);
        return () => window.removeEventListener(CONSENT_CHANGED, update);
    }, [owner]);
    const change = async (event) => {
        const next = event.target.checked;
        setChecked(next);
        setSaving(true); setError(false);
        try { setChecked((await saveDataConsent(next, owner)).aiImprovement); }
        catch { setChecked(getDataConsent(owner).aiImprovement); setError(true); }
        finally { setSaving(false); }
    };

    return (
        <div aria-busy={saving}><label className="data-consent-toggle">
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled || saving || !owner}
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
