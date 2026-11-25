import React, { useState } from 'react';
import { Package, Plus, Trash2, Users } from 'lucide-react';
import { createLabel } from './mygapText.js';

const TENURE_OPTIONS = [
    ['owned', 'mygap.landOwned', 'Own land'],
    ['leased', 'mygap.landLeased', 'Leased'],
    ['tol', 'mygap.landTol', 'Temporary occupation licence (TOL)'],
    ['other', 'mygap.landOther', 'Other'],
];

const newWorker = () => ({ id: crypto.randomUUID(), name: '', idNumber: '', nationality: '', role: '' });
const formatAmount = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });

/**
 * Farm details for the myGAP report, the worker list (myGAP 4-9) and the
 * input stock worked out from purchase and application records.
 */
const FarmProfilePanel = ({ t, profile, stock = [], onSave }) => {
    const label = createLabel(t);
    const [draft, setDraft] = useState(() => ({ ...profile, workers: profile.workers.length ? profile.workers : [] }));
    const [saving, setSaving] = useState(false);
    const set = (patch) => setDraft((current) => ({ ...current, ...patch }));
    const setWorker = (id, patch) => set({ workers: draft.workers.map((worker) => (worker.id === id ? { ...worker, ...patch } : worker)) });

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try { await onSave({ ...draft, workers: draft.workers.filter((worker) => worker.name.trim()) }); } finally { setSaving(false); }
    };

    const field = (name, labelKey, fallback, props = {}) => (
        <div className="form-group">
            <label htmlFor={`farm-${name}`}>{label(labelKey, fallback)}</label>
            <input id={`farm-${name}`} value={draft[name] || ''} onChange={(e) => set({ [name]: e.target.value })} {...props} />
        </div>
    );

    return (
        <div className="farm-profile">
            <form className="content-card" onSubmit={submit}>
                <h2 className="section-title">{label('mygap.farmProfileTitle', 'Farm profile')}</h2>
                <p className="section-subtitle mb-lg">{label('mygap.farmProfileSubtitle', 'Shown on your myGAP report.')}</p>
                <div className="mygap-log-details">
                    {field('farmerName', 'mygap.farmerName', 'Farmer name', { maxLength: 120, autoComplete: 'name' })}
                    {field('farmName', 'mygap.farmName', 'Farm name', { maxLength: 160 })}
                    {field('farmAddress', 'mygap.farmAddress', 'Farm address', { maxLength: 300, autoComplete: 'street-address' })}
                    <div className="form-group">
                        <label htmlFor="farm-landTenure">{label('mygap.landTenure', 'Land status')}</label>
                        <select id="farm-landTenure" value={draft.landTenure || ''} onChange={(e) => set({ landTenure: e.target.value })}>
                            <option value="">—</option>
                            {TENURE_OPTIONS.map(([value, key, fallback]) => <option key={value} value={value}>{label(key, fallback)}</option>)}
                        </select>
                    </div>
                    {field('mygapRef', 'mygap.registrationNo', 'myGAP reference no.', { maxLength: 60 })}
                    {field('certExpiry', 'mygap.certExpiry', 'myGAP certificate expiry', { type: 'date' })}
                </div>

                <h3 className="farm-profile__subtitle"><Users size={18} aria-hidden="true" />{label('mygap.workersTitle', 'Workers')}</h3>
                <p className="field-hint">{label('mygap.workersSubtitle', 'myGAP asks for a list of farm workers. ID numbers are optional and stay in your account.')}</p>
                {draft.workers.length === 0 && <p className="field-hint">{label('mygap.noWorkers', 'No workers added.')}</p>}
                <ul className="farm-workers">
                    {draft.workers.map((worker, index) => (
                        <li key={worker.id} className="farm-workers__row">
                            {[
                                ['name', 'mygap.workerName', 'Name', 120],
                                ['idNumber', 'mygap.workerId', 'IC / passport no. (optional)', 40],
                                ['nationality', 'mygap.nationality', 'Nationality', 60],
                                ['role', 'mygap.role', 'Role', 80],
                            ].map(([key, labelKey, fallback, maxLength]) => (
                                <div className="form-group" key={key}>
                                    <label htmlFor={`worker-${index}-${key}`}>{label(labelKey, fallback)}</label>
                                    <input id={`worker-${index}-${key}`} maxLength={maxLength} value={worker[key] || ''} onChange={(e) => setWorker(worker.id, { [key]: e.target.value })} />
                                </div>
                            ))}
                            <button type="button" className="log-action-btn log-action-btn--danger" onClick={() => set({ workers: draft.workers.filter((item) => item.id !== worker.id) })}>
                                <Trash2 size={14} aria-hidden="true" />{label('mygap.removeWorker', 'Remove')}
                            </button>
                        </li>
                    ))}
                </ul>
                <button type="button" className="btn btn-secondary farm-profile__add" onClick={() => set({ workers: [...draft.workers, newWorker()] })}>
                    <Plus size={16} aria-hidden="true" />{label('mygap.addWorker', 'Add worker')}
                </button>
                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>{label('mygap.saveProfile', 'Save farm profile')}</button>
                </div>
            </form>

            <section className="content-card" aria-labelledby="farm-stock-title">
                <h2 id="farm-stock-title" className="section-title"><Package size={20} aria-hidden="true" /> {label('mygap.stockTitle', 'Input stock')}</h2>
                <p className="section-subtitle mb-lg">{label('mygap.stockSubtitle', 'Your purchase records minus the amounts used in spray and fertilizer records.')}</p>
                {stock.length === 0 ? (
                    <p className="field-hint">{label('mygap.noStock', 'Record purchases with an amount and unit to build your stock list.')}</p>
                ) : (
                    <div className="farm-stock__scroll">
                        <table className="farm-stock">
                            <thead>
                                <tr>
                                    <th scope="col">{label('assessment.mygap.productUsed', 'Product')}</th>
                                    <th scope="col">{label('mygap.colPurchased', 'Bought')}</th>
                                    <th scope="col">{label('mygap.colUsed', 'Used')}</th>
                                    <th scope="col">{label('mygap.colBalance', 'Balance')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stock.map((item) => (
                                    <tr key={`${item.product}|${item.unit}`} className={item.balance < 0 ? 'is-negative' : ''}>
                                        <th scope="row">{item.product}</th>
                                        <td>{formatAmount(item.purchased)} {item.unit}</td>
                                        <td>{formatAmount(item.used)} {item.unit}</td>
                                        <td>{formatAmount(item.balance)} {item.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {stock.some((item) => item.balance < 0) && <p className="log-missing" role="note">{label('mygap.negativeStock', 'More used than recorded as bought. Check your purchase records.')}</p>}
            </section>
        </div>
    );
};

export default FarmProfilePanel;
