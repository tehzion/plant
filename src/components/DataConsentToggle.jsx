import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { getDataConsent, setDataConsent } from '../utils/dataConsent';
import './DataConsentToggle.css';

// Opt-in, unchecked by default. Scanning works the same either way.
const DataConsentToggle = ({ disabled = false }) => {
    const { t } = useLanguage();
    const [checked, setChecked] = useState(() => getDataConsent().aiImprovement);

    return (
        <label className="data-consent-toggle">
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => setChecked(setDataConsent(event.target.checked).aiImprovement)}
            />
            <span>
                <strong>{t('home.dataConsentLabel')}</strong>
                <small>
                    {t('home.dataConsentHint')}{' '}
                    <Link to="/privacy">{t('home.dataConsentPrivacyLink')}</Link>
                </small>
            </span>
        </label>
    );
};

export default DataConsentToggle;
