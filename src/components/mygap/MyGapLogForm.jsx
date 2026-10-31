import React, { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import VoiceLogInput from '../VoiceLogInput';
import { activeWaitingPeriods, safeHarvestDateFor } from '../../../shared/mygapCompliance.js';
import { createLabel, fill, formatDay } from './mygapText.js';

const PESTICIDE_FIELDS = [
    { field: 'active_ingredient', maxLength: 200, labelKey: 'mygap.activeIngredient', fallback: 'Active ingredient', fromLabel: true },
    { field: 'registration_no', maxLength: 60, labelKey: 'mygap.lrmpNo', fallback: 'LRMP registration no.', fromLabel: true },
    { field: 'area_treated', maxLength: 60, labelKey: 'mygap.areaTreated', fallback: 'Area treated', fromLabel: false },
];

/**
 * Add or correct a myGAP logbook entry. Pesticide entries follow the official
 * myGAP 4-5 record; harvest entries warn when a waiting period is still running
 * on the chosen plot. Editing requires a reason, which is kept for audits.
 */
const MyGapLogForm = ({ t, language, initialValues, mode = 'add', logs = [], plots = [], recentScans = [], onSubmit, onCancel }) => {
    const label = createLabel(t);
    const [values, setValues] = useState(initialValues);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const set = (patch) => setValues((current) => ({ ...current, ...patch }));
    const isPesticide = values.type === 'pesticide';
    const today = new Date().toISOString().slice(0, 10);
    const idPrefix = `mygap-${mode}`;

    const choosePlot = (plotName) => {
        const match = plots.find((plot) => String(plot.name || '').trim().toLowerCase() === plotName.trim().toLowerCase());
        set({ plot_id: plotName, ...(match && !values.crop && (match.crop_type || match.cropType) ? { crop: match.crop_type || match.cropType } : {}) });
    };

    const safeFrom = isPesticide ? safeHarvestDateFor(values) : null;
    const runningWaits = useMemo(() => (values.type === 'harvest' && values.plot_id
        ? activeWaitingPeriods(logs.filter((log) => log.id !== values.id), { plot: values.plot_id, date: values.activity_date })
        : []), [logs, values.type, values.plot_id, values.activity_date, values.id]);

    const scanSuggestions = useMemo(() => [...new Set(recentScans
        .map((scan) => String(scan.disease || '').trim())
        .filter((name) => name && !/^(healthy|none)/i.test(name)))], [recentScans]);

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try { await onSubmit(values, reason.trim()); } finally { setSaving(false); }
    };

    return (
        <form className="add-log-form slide-down" onSubmit={submit}>
            {mode === 'add' && <VoiceLogInput onFill={(fields) => set(fields)} />}
            <div className="form-group">
                <label htmlFor={`${idPrefix}-type`}>{t('mygap.logType')}</label>
                <select id={`${idPrefix}-type`} value={values.type} onChange={(e) => set({ type: e.target.value })}>
                    <option value="pesticide">{t('mygap.pesticideLog')}</option>
                    <option value="fertilizer">{t('mygap.fertilizerLog')}</option>
                    <option value="harvest">{t('mygap.harvestLog')}</option>
                    <option value="irrigation">{t('mygap.irrigationLog')}</option>
                </select>
            </div>
            <div className="mygap-log-details">
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-date`}>{label('assessment.mygap.activityDate', 'Activity date')}</label>
                    <input id={`${idPrefix}-date`} type="date" value={values.activity_date || ''} max={today} onChange={(e) => set({ activity_date: e.target.value })} />
                </div>
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-plot`}>{label('assessment.mygap.plot', 'Farm or plot')}</label>
                    <input id={`${idPrefix}-plot`} type="text" maxLength={120} value={values.plot_id || ''} list={plots.length ? `${idPrefix}-plot-options` : undefined}
                        onChange={(e) => choosePlot(e.target.value)} autoComplete="off" />
                    {plots.length > 0 && (
                        <datalist id={`${idPrefix}-plot-options`}>
                            {plots.map((plot) => <option key={plot.id} value={plot.name}>{plot.crop_type || plot.cropType || ''}</option>)}
                        </datalist>
                    )}
                </div>
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-crop`}>{label('assessment.mygap.crop', 'Crop')}</label>
                    <input id={`${idPrefix}-crop`} type="text" maxLength={120} value={values.crop || ''} onChange={(e) => set({ crop: e.target.value })} />
                </div>
                {['pesticide', 'fertilizer'].includes(values.type) && (
                    <>
                        <div className="form-group">
                            <label htmlFor={`${idPrefix}-product`}>{label('assessment.mygap.productUsed', 'Product used')}</label>
                            <input id={`${idPrefix}-product`} type="text" maxLength={200} value={values.product_used || ''} onChange={(e) => set({ product_used: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label htmlFor={`${idPrefix}-quantity`}>{label('assessment.mygap.quantity', 'Quantity you used')}</label>
                            <input id={`${idPrefix}-quantity`} type="text" maxLength={100} value={values.quantity || ''} aria-describedby={`${idPrefix}-quantity-hint`}
                                onChange={(e) => set({ quantity: e.target.value })} />
                            <small id={`${idPrefix}-quantity-hint`} className="field-hint">{label('assessment.mygap.quantityHint', 'Record what you actually applied. Always follow the product label.')}</small>
                        </div>
                    </>
                )}
                {isPesticide && (
                    <>
                        {PESTICIDE_FIELDS.map(({ field, maxLength, labelKey, fallback, fromLabel }) => (
                            <div className="form-group" key={field}>
                                <label htmlFor={`${idPrefix}-${field}`}>{label(labelKey, fallback)}</label>
                                <input id={`${idPrefix}-${field}`} type="text" maxLength={maxLength} value={values[field] || ''}
                                    aria-describedby={fromLabel ? `${idPrefix}-label-hint` : undefined}
                                    onChange={(e) => set({ [field]: e.target.value })} />
                                {field === 'registration_no' && <small id={`${idPrefix}-label-hint`} className="field-hint">{label('mygap.labelHint', 'As printed on the product label.')}</small>}
                            </div>
                        ))}
                        <div className="form-group">
                            <label htmlFor={`${idPrefix}-target`}>{label('mygap.targetPest', 'Pest or disease treated')}</label>
                            <input id={`${idPrefix}-target`} type="text" maxLength={200} value={values.target_pest || ''} list={scanSuggestions.length ? `${idPrefix}-target-options` : undefined}
                                onChange={(e) => set({ target_pest: e.target.value })} autoComplete="off" />
                            {scanSuggestions.length > 0 && (
                                <datalist id={`${idPrefix}-target-options`}>
                                    {scanSuggestions.map((name) => <option key={name} value={name} />)}
                                </datalist>
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor={`${idPrefix}-phi`}>{label('mygap.phiDaysField', 'Waiting period before harvest (days, from label)')}</label>
                            <input id={`${idPrefix}-phi`} type="number" min="0" max="3650" step="1" inputMode="numeric" value={values.phi_days ?? ''}
                                aria-describedby={safeFrom ? `${idPrefix}-safe-from` : undefined}
                                onChange={(e) => set({ phi_days: e.target.value })} />
                            {safeFrom && <small id={`${idPrefix}-safe-from`} className="field-hint mygap-safe-from">{fill(label('mygap.safeFrom', 'Safe to harvest from {date}'), { date: formatDay(safeFrom, language) })}</small>}
                        </div>
                    </>
                )}
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-operator`}>{label('assessment.mygap.operator', 'Done by')}</label>
                    <input id={`${idPrefix}-operator`} type="text" maxLength={120} value={values.operator || ''} onChange={(e) => set({ operator: e.target.value })} />
                </div>
            </div>
            {runningWaits.length > 0 && (
                <div className="mygap-phi-warning" role="alert">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <div>
                        <strong>{label('mygap.phiWarningTitle', 'Waiting period still running')}</strong>
                        {runningWaits.map(({ log, safeFrom: until }) => (
                            <p key={log.id}>{fill(label('mygap.phiWarning', '{product} was sprayed on this plot. Harvest is safe from {date}.'), { product: log.product_used || t('mygap.pesticideLog'), date: formatDay(until, language) })}</p>
                        ))}
                    </div>
                </div>
            )}
            <div className="form-group">
                <label htmlFor={`${idPrefix}-notes`}>{t('mygap.logNotes')}</label>
                <textarea id={`${idPrefix}-notes`} required value={values.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder={t('mygap.logNotesPlaceholder')} />
            </div>
            {mode === 'edit' && (
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-reason`}>{label('mygap.changeReason', 'Reason for the change')}</label>
                    <input id={`${idPrefix}-reason`} type="text" required minLength={3} maxLength={500} value={reason} aria-describedby={`${idPrefix}-reason-hint`}
                        onChange={(e) => setReason(e.target.value)} />
                    <small id={`${idPrefix}-reason-hint`} className="field-hint">{label('mygap.changeReasonHint', 'Kept with the record for audits.')}</small>
                </div>
            )}
            <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>
                    {mode === 'edit' ? label('mygap.saveChanges', 'Save changes') : t('common.save')}
                </button>
            </div>
        </form>
    );
};

export default MyGapLogForm;
