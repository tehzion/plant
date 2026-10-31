import React, { useState } from 'react';
import { AlertTriangle, Pencil, Timer, Trash2 } from 'lucide-react';
import { missingPesticideFields, safeHarvestDateFor } from '../../../shared/mygapCompliance.js';
import { createLabel, fieldLabel, fill, formatDay } from './mygapText.js';

const MyGapLogCard = ({ t, language, log, conflict = null, onEdit, onDelete }) => {
    const label = createLabel(t);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [reason, setReason] = useState('');
    const [deleting, setDeleting] = useState(false);
    const pendingSync = log.syncStatus === 'pending';
    const safeFrom = safeHarvestDateFor(log);
    const missing = missingPesticideFields(log);
    const details = [
        log.plot_id && `${label('assessment.mygap.plot', 'Farm or plot')}: ${log.plot_id}`,
        log.crop && `${label('assessment.mygap.crop', 'Crop')}: ${log.crop}`,
        log.product_used && `${label('assessment.mygap.productUsed', 'Product used')}: ${log.product_used}`,
        log.active_ingredient && `${label('mygap.activeIngredient', 'Active ingredient')}: ${log.active_ingredient}`,
        log.registration_no && `${label('mygap.lrmpNo', 'LRMP registration no.')}: ${log.registration_no}`,
        log.quantity && `${label('assessment.mygap.quantity', 'Quantity you used')}: ${log.quantity}`,
        log.area_treated && `${label('mygap.areaTreated', 'Area treated')}: ${log.area_treated}`,
        log.target_pest && `${label('mygap.targetPest', 'Pest or disease treated')}: ${log.target_pest}`,
        log.operator && `${label('assessment.mygap.operator', 'Done by')}: ${log.operator}`,
    ].filter(Boolean);
    const idBase = `mygap-log-${String(log.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;

    const confirmDelete = async (event) => {
        event.preventDefault();
        setDeleting(true);
        try { await onDelete(log, reason.trim()); } finally { setDeleting(false); }
    };

    return (
        <div className="log-card">
            <div className="log-header">
                <span className={`log-badge ${String(log.type || '').toLowerCase()}`}>{label(`mygap.${String(log.type || '').toLowerCase()}Log`, log.type || '')}</span>
                <span className="log-date">{new Date(log.activity_date || log.timestamp).toLocaleDateString()}</span>
            </div>
            <div className="log-status-row">
                {pendingSync && <span className="log-sync-badge">{label('assessment.sync.savedOnDeviceShort', 'Saved on device')}</span>}
                {log.updated_at && <span className="log-edited-badge">{label('mygap.edited', 'Edited')}</span>}
                {safeFrom && (
                    <span className="log-safe-badge"><Timer size={12} aria-hidden="true" />{fill(label('mygap.safeFrom', 'Safe to harvest from {date}'), { date: formatDay(safeFrom, language) })}</span>
                )}
            </div>
            {details.length > 0 && <p className="log-details">{details.join(' · ')}</p>}
            <p className="log-notes">{log.notes}</p>
            {conflict && (
                <p className="log-warning" role="note"><AlertTriangle size={14} aria-hidden="true" />{fill(label('mygap.phiConflict', 'Harvested before the waiting period ended (safe from {date}).'), { date: formatDay(conflict.safeFrom, language) })}</p>
            )}
            {missing.length > 0 && (
                <p className="log-missing">{fill(label('mygap.missingForMygap', 'Missing for myGAP: {fields}'), { fields: missing.map((field) => fieldLabel(label, field)).join(', ') })}</p>
            )}
            {confirmingDelete ? (
                <form className="log-delete-confirm" onSubmit={confirmDelete}>
                    <p>{label('mygap.deleteConfirm', 'Delete this record? The deletion and your reason are kept for audits.')}</p>
                    <label htmlFor={`${idBase}-reason`}>{label('mygap.changeReason', 'Reason for the change')}</label>
                    <input id={`${idBase}-reason`} type="text" required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => { setConfirmingDelete(false); setReason(''); }}>{t('common.cancel')}</button>
                        <button type="submit" className="btn btn-danger" disabled={deleting} aria-busy={deleting}>{label('mygap.delete', 'Delete')}</button>
                    </div>
                </form>
            ) : (
                <div className="log-actions">
                    {pendingSync ? (
                        <small className="field-hint">{label('mygap.pendingSyncEdit', 'Can be edited after it syncs.')}</small>
                    ) : (
                        <>
                            <button type="button" className="log-action-btn" onClick={() => onEdit(log)}><Pencil size={14} aria-hidden="true" />{label('mygap.edit', 'Edit')}</button>
                            <button type="button" className="log-action-btn log-action-btn--danger" onClick={() => setConfirmingDelete(true)}><Trash2 size={14} aria-hidden="true" />{label('mygap.delete', 'Delete')}</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyGapLogCard;
