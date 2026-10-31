import React, { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import VoiceLogInput from '../VoiceLogInput';
import { activeWaitingPeriods, nextLotCode, safeHarvestDateFor } from '../../../shared/mygapCompliance.js';
import { createLabel, fill, formatDay } from './mygapText.js';

export const LOG_TYPES = ['pesticide', 'fertilizer', 'harvest', 'post_harvest', 'irrigation', 'purchase', 'training'];
// Purchases and training apply to the whole farm, not one plot.
const FARM_WIDE_TYPES = ['purchase', 'training'];

// Which detail fields each record type asks for, following the myGAP 4 forms:
// 4-3/4-5 inputs, 4-7 harvest and sales, 4-8 post-harvest, 4-9 training.
const TYPE_FIELDS = {
    pesticide: ['product_used', 'quantity', 'active_ingredient', 'registration_no', 'area_treated', 'amount', 'unit', 'target_pest', 'phi_days', 'operator'],
    fertilizer: ['product_used', 'quantity', 'amount', 'unit', 'operator'],
    harvest: ['amount', 'unit', 'lot_code', 'buyer', 'price', 'operator'],
    post_harvest: ['lot_code', 'product_used', 'quantity', 'operator'],
    irrigation: ['operator'],
    purchase: ['product_used', 'active_ingredient', 'registration_no', 'amount', 'unit', 'supplier', 'price'],
    training: ['topic', 'operator', 'attendees'],
};

const FIELD_SPEC = {
    product_used: { key: 'assessment.mygap.productUsed', fallback: 'Product used', maxLength: 200 },
    quantity: { key: 'assessment.mygap.quantity', fallback: 'Quantity you used', maxLength: 100, hint: ['assessment.mygap.quantityHint', 'Record what you actually applied. Always follow the product label.'] },
    active_ingredient: { key: 'mygap.activeIngredient', fallback: 'Active ingredient', maxLength: 200 },
    registration_no: { key: 'mygap.lrmpNo', fallback: 'LRMP registration no.', maxLength: 60, hint: ['mygap.labelHint', 'As printed on the product label.'] },
    area_treated: { key: 'mygap.areaTreated', fallback: 'Area treated', maxLength: 60 },
    amount: { key: 'mygap.amountUsed', fallback: 'Amount used (for stock)', type: 'number' },
    unit: { key: 'mygap.unit', fallback: 'Unit', maxLength: 20, hint: ['mygap.unitHint', 'e.g. kg, L, bags'], list: ['kg', 'g', 'L', 'ml', 'bags'] },
    target_pest: { key: 'mygap.targetPest', fallback: 'Pest or disease treated', maxLength: 200 },
    phi_days: { key: 'mygap.phiDaysField', fallback: 'Waiting period before harvest (days, from label)', type: 'number', integer: true },
    operator: { key: 'assessment.mygap.operator', fallback: 'Done by', maxLength: 120 },
    supplier: { key: 'mygap.supplier', fallback: 'Supplier', maxLength: 200 },
    price: { key: 'mygap.price', fallback: 'Price (RM)', maxLength: 60, inputMode: 'decimal' },
    buyer: { key: 'mygap.buyer', fallback: 'Buyer', maxLength: 200 },
    lot_code: { key: 'mygap.lotCode', fallback: 'Lot code', maxLength: 60 },
    topic: { key: 'mygap.topic', fallback: 'Training topic', maxLength: 200 },
    attendees: { key: 'mygap.attendees', fallback: 'Who attended', maxLength: 1000 },
};

// The same field reads differently for some record types.
const LABEL_OVERRIDES = {
    purchase: { amount: ['mygap.amountBought', 'Amount bought'] },
    harvest: { amount: ['mygap.amountHarvested', 'Amount harvested'] },
    post_harvest: { product_used: ['mygap.treatmentUsed', 'Treatment used'] },
    training: { operator: ['mygap.trainer', 'Trainer'] },
};

/**
 * Add or correct a myGAP logbook entry. Each record type shows the fields its
 * official myGAP form asks for; harvests get a lot code and warn when a
 * waiting period is still running. Editing requires a reason, kept for audits.
 */
const MyGapLogForm = ({ t, language, initialValues, mode = 'add', logs = [], plots = [], recentScans = [], workers = [], onSubmit, onCancel }) => {
    const label = createLabel(t);
    const [values, setValues] = useState(initialValues);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const set = (patch) => setValues((current) => ({ ...current, ...patch }));
    const today = new Date().toISOString().slice(0, 10);
    const idPrefix = `mygap-${mode}`;
    const fields = TYPE_FIELDS[values.type] || [];
    const farmWide = FARM_WIDE_TYPES.includes(values.type);
    const otherLogs = useMemo(() => logs.filter((log) => log.id !== values.id), [logs, values.id]);

    // Harvests get a lot code as soon as the type, plot or date is known.
    const withLotCode = (next) => (next.type === 'harvest' && !next.lotCodeEdited && mode === 'add'
        ? { ...next, lot_code: nextLotCode(otherLogs, { plot: next.plot_id, date: next.activity_date }) }
        : next);
    const update = (patch) => setValues((current) => withLotCode({ ...current, ...patch }));

    const choosePlot = (plotName) => {
        const match = plots.find((plot) => String(plot.name || '').trim().toLowerCase() === plotName.trim().toLowerCase());
        const crop = match && !values.crop ? (match.crop_type || match.cropType || '') : '';
        update({ plot_id: plotName, ...(crop ? { crop } : {}) });
    };

    const safeFrom = values.type === 'pesticide' ? safeHarvestDateFor(values) : null;
    const runningWaits = useMemo(() => (values.type === 'harvest' && values.plot_id
        ? activeWaitingPeriods(otherLogs, { plot: values.plot_id, date: values.activity_date })
        : []), [otherLogs, values.type, values.plot_id, values.activity_date]);

    const suggestions = useMemo(() => ({
        target_pest: [...new Set(recentScans.map((scan) => String(scan.disease || '').trim()).filter((name) => name && !/^(healthy|none)/i.test(name)))],
        lot_code: values.type === 'post_harvest' ? [...new Set(logs.map((log) => log.lot_code).filter(Boolean))] : [],
        attendees: workers.map((worker) => worker.name).filter(Boolean),
        operator: workers.map((worker) => worker.name).filter(Boolean),
        unit: FIELD_SPEC.unit.list,
    }), [recentScans, logs, workers, values.type]);

    const fieldLabel = (field) => {
        const [key, fallback] = LABEL_OVERRIDES[values.type]?.[field] || [FIELD_SPEC[field].key, FIELD_SPEC[field].fallback];
        return label(key, fallback);
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        const { lotCodeEdited: _lotCodeEdited, ...payload } = values;
        // Remembered plot and crop defaults do not apply to farm-wide records.
        if (farmWide) Object.assign(payload, { plot_id: '', crop: '' });
        try { await onSubmit(payload, reason.trim()); } finally { setSaving(false); }
    };

    const renderField = (field) => {
        const spec = FIELD_SPEC[field];
        const id = `${idPrefix}-${field}`;
        const hintId = spec.hint || (field === 'phi_days' && safeFrom) || field === 'lot_code' ? `${id}-hint` : undefined;
        const options = suggestions[field] || [];
        return (
            <div className="form-group" key={field}>
                <label htmlFor={id}>{fieldLabel(field)}</label>
                <input
                    id={id}
                    type={spec.type === 'number' ? 'number' : 'text'}
                    {...(spec.type === 'number' ? { min: 0, step: spec.integer ? 1 : 'any', inputMode: spec.integer ? 'numeric' : 'decimal', ...(field === 'phi_days' ? { max: 3650 } : {}) } : { maxLength: spec.maxLength })}
                    {...(spec.inputMode ? { inputMode: spec.inputMode } : {})}
                    value={values[field] ?? ''}
                    list={options.length ? `${id}-options` : undefined}
                    autoComplete="off"
                    aria-describedby={hintId}
                    onChange={(e) => update({ [field]: e.target.value, ...(field === 'lot_code' ? { lotCodeEdited: true } : {}) })}
                />
                {options.length > 0 && <datalist id={`${id}-options`}>{options.map((option) => <option key={option} value={option} />)}</datalist>}
                {field === 'phi_days' && safeFrom && <small id={hintId} className="field-hint mygap-safe-from">{fill(label('mygap.safeFrom', 'Safe to harvest from {date}'), { date: formatDay(safeFrom, language) })}</small>}
                {field === 'lot_code' && values.type === 'harvest' && <small id={hintId} className="field-hint">{label('mygap.lotCodeHint', 'Filled in automatically. Write it on the crates or print a label.')}</small>}
                {spec.hint && <small id={hintId} className="field-hint">{label(spec.hint[0], spec.hint[1])}</small>}
            </div>
        );
    };

    return (
        <form className="add-log-form slide-down" onSubmit={submit}>
            {mode === 'add' && <VoiceLogInput onFill={(filled) => update(filled)} />}
            <div className="form-group">
                <label htmlFor={`${idPrefix}-type`}>{t('mygap.logType')}</label>
                <select id={`${idPrefix}-type`} value={values.type} onChange={(e) => update({ type: e.target.value })}>
                    {LOG_TYPES.map((type) => <option key={type} value={type}>{label(`mygap.${type}Log`, type)}</option>)}
                </select>
            </div>
            <div className="mygap-log-details">
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-date`}>{label('assessment.mygap.activityDate', 'Activity date')}</label>
                    <input id={`${idPrefix}-date`} type="date" value={values.activity_date || ''} max={today} onChange={(e) => update({ activity_date: e.target.value })} />
                </div>
                {!farmWide && (
                    <>
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
                            <input id={`${idPrefix}-crop`} type="text" maxLength={120} value={values.crop || ''} onChange={(e) => update({ crop: e.target.value })} />
                        </div>
                    </>
                )}
                {fields.map(renderField)}
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
