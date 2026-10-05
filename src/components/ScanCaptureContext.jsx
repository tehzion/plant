import { useLanguage } from '../i18n/i18n.jsx';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';

const ScanCaptureContext = ({ value, onChange, disabled }) => {
    const { language } = useLanguage();
    const copy = getScanQualityCopy(language);
    const update = (key, next) => onChange({ ...value, [key]: next });
    return <fieldset className="scan-capture-context" disabled={disabled}>
        <legend>{copy.contextTitle}</legend>
        <label>{copy.plantPart}<select value={value.plantPart || 'leaf'} onChange={event => update('plantPart', event.target.value)}>
            {['leaf', 'fruit', 'stem', 'whole'].map(part => <option value={part} key={part}>{copy[part]}</option>)}
        </select></label>
        {['duration', 'affected', 'recentTreatment'].map(field => <label key={field}>{copy[field]}
            <input value={value[field] || ''} maxLength={200} onChange={event => update(field, event.target.value)} />
        </label>)}
    </fieldset>;
};
export default ScanCaptureContext;
