import React, { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import translations from '../i18n/translations';
import {
    ShieldCheck, Sprout, HeartHandshake, Globe, AlertTriangle, ExternalLink, RefreshCw,
    ClipboardCheck, BookOpen, Plus, Calendar, FileText, CheckCircle2, Circle, Calculator, Timer, Download
} from 'lucide-react';
import { getLogbook, saveLogEntry, saveChecklistState } from '../utils/localStorage';
import VoiceLogInput from '../components/VoiceLogInput';
import { addHarvestReminder, getLogDefaults, localDateKey, rememberLogDefaults } from '../utils/farmerPrefs.js';
import { useAuth } from '../context/AuthContext';
import { useFarmStats } from '../hooks/useFarmStats';
import { useLocation } from '../hooks/useLocation';
import { useNotifications } from '../context/NotificationProvider.jsx';
import ComplianceCalendar from '../components/dashboard/ComplianceCalendar';
import { calculateSafeHarvestDate, MAX_PHI_DAYS, parsePHIDays } from '../utils/phi.js';
import './MyGap.css';

const MyGapPage = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { notify } = useNotifications();
    const { getLocation } = useLocation();

    const {
        dataLoading, dataError, reloadData,
        logs, setLogbook: setLogs,
        checklistState: checklist, setChecklistState: setChecklist,
        derivedChecklist,
        autoCheckedItems,
        checklistPct,
        allEvents,
        hasMoreData,
    } = useFarmStats({ userId: user?.id, getLocation, notify, t, maxRows: 200 });

    const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'checklist' | 'logbook' | 'phi'
    const [isAddingLog, setIsAddingLog] = useState(false);
    // Plot, crop and operator rarely change between entries, so they are
    // remembered on this device and pre-filled.
    const emptyLog = () => ({ type: 'pesticide', notes: '', activity_date: localDateKey(), plot_id: '', crop: '', product_used: '', quantity: '', operator: '', ...getLogDefaults() });
    const [newLog, setNewLog] = useState(emptyLog);
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };

    // PHI Calculator State
    const [phiDays, setPhiDays] = useState('');
    const [pesticideName, setPesticideName] = useState('');
    const [phiResult, setPhiResult] = useState(null);
    const [phiError, setPhiError] = useState('');

    const handleCheckToggle = async (id) => {
        const newState = { ...checklist, [id]: !checklist[id] };
        const saved = await saveChecklistState(newState, user?.id ?? null);
        if (saved) setChecklist(newState);
        else notify({ type: 'error', title: t('common.error'), message: t('common.error') });
    };

    const handleAddLog = async (e) => {
        e.preventDefault();
        const entry = await saveLogEntry(newLog, user?.id ?? null);
        if (entry) {
            rememberLogDefaults(newLog);
            setLogs([entry, ...logs]);
            setIsAddingLog(false);
            setNewLog(emptyLog());
            if (entry.syncStatus === 'pending') {
                notify({ type: 'info', title: label('assessment.sync.savedOnDeviceTitle', 'Saved on this device'), message: label('assessment.sync.savedOnDevice', 'This record will sync automatically when you are back online.') });
            }
        } else {
            notify({ type: 'error', title: t('common.error'), message: t('common.error') });
        }
    };

    const repeatLastLog = () => {
        const last = logs[0];
        if (!last) return;
        setNewLog({
            ...emptyLog(),
            type: last.type || 'pesticide',
            notes: last.notes || '',
            ...Object.fromEntries(['plot_id', 'crop', 'product_used', 'quantity', 'operator'].map((field) => [field, last[field] || ''])),
        });
        setIsAddingLog(true);
    };

    const saveHarvestReminder = () => {
        if (!phiResult) return;
        const saved = addHarvestReminder({ date: localDateKey(phiResult.date), name: phiResult.pesticideName || t('mygap.safeHarvestDate') });
        notify({ type: saved ? 'success' : 'error', title: saved ? label('assessment.ux.harvestReminderSaved', 'Reminder saved') : t('common.error'), message: saved ? phiResult.date.toLocaleDateString() : t('common.error') });
    };

    const calculatePHI = (e) => {
        e.preventDefault();
        const days = parsePHIDays(phiDays);
        if (days === null) {
            setPhiResult(null);
            setPhiError(t('mygap.phiInvalid') || `Enter a whole number from 0 to ${MAX_PHI_DAYS} days.`);
            return;
        }

        setPhiError('');

        setPhiResult({
            date: calculateSafeHarvestDate(days),
            daysRemaining: days,
            pesticideName: pesticideName.trim(),
        });
    };

    const pillars = [
        { icon: <ShieldCheck size={28} className="pillar-icon" />, title: t('mygap.pillar1'), description: t('mygap.pillar1Desc') },
        { icon: <Sprout size={28} className="pillar-icon" />, title: t('mygap.pillar2'), description: t('mygap.pillar2Desc') },
        { icon: <Globe size={28} className="pillar-icon" />, title: t('mygap.pillar3'), description: t('mygap.pillar3Desc') },
        { icon: <HeartHandshake size={28} className="pillar-icon" />, title: t('mygap.pillar4'), description: t('mygap.pillar4Desc') },
    ];

    const checklistItems = [
        { id: 'check1', label: t('mygap.check1') },
        { id: 'check2', label: t('mygap.check2') },
        { id: 'check3', label: t('mygap.check3') },
        { id: 'check4', label: t('mygap.check4') },
        { id: 'check5', label: t('mygap.check5') },
        { id: 'check6', label: t('mygap.check6') },
        { id: 'check7', label: t('mygap.check7') },
        { id: 'check8', label: t('mygap.check8') },
    ];

    const completedChecklistCount = checklistItems.filter((item) => Boolean(derivedChecklist[item.id])).length;
    const checklistProgressPct = checklistItems.length > 0
        ? Math.round((completedChecklistCount / checklistItems.length) * 100)
        : 0;

    const [exportingReport, setExportingReport] = useState(false);
    const generateReport = async () => {
        if (exportingReport) return;
        setExportingReport(true);
        try {
            // The PDF covers the complete logbook, not just the rows loaded on screen.
            const reportLogs = await Promise.resolve(getLogbook(user?.id ?? null)).catch(() => logs);
            const { buildMyGapReportPdf, mygapReportFileName } = await import('../utils/mygapReportPdf');
            const doc = await buildMyGapReportPdf({ logs: reportLogs || logs, derivedChecklist, language: language || 'en', translations });
            doc.save(mygapReportFileName());
        } catch (error) {
            console.error('myGAP report export failed:', error);
            notify({ type: 'error', title: t('common.error'), message: t('common.error') });
        } finally {
            setExportingReport(false);
        }
    };

    if (dataLoading) return <div role="status">{t('common.loading')}</div>;
    if (dataError) return <div role="alert">
        <p>{t('profile.dataLoadFailed')}</p>
        <button type="button" onClick={reloadData}>{t('common.retry')}</button>
    </div>;
    return (
        <div className="mygap-page-container">
            <div className="page-header">
                <h1 className="page-title">{t('mygap.title')}</h1>
                <p className="page-subtitle">{t('mygap.subtitle')}</p>
            </div>

            <div className="tabs-container" role="tablist">
                <button
                    role="tab" aria-selected={activeTab === 'guide'} aria-controls="mygap-panel" id="mygap-tab-guide"
                    tabIndex={activeTab === 'guide' ? 0 : -1}
                    onKeyDown={event => { const keys = ['guide', 'checklist', 'logbook', 'calendar', 'phi']; let i = keys.indexOf(activeTab); if (event.key === 'ArrowRight') i = (i + 1) % keys.length; else if (event.key === 'ArrowLeft') i = (i + keys.length - 1) % keys.length; else if (event.key === 'Home') i = 0; else if (event.key === 'End') i = keys.length - 1; else return; event.preventDefault(); setActiveTab(keys[i]); document.getElementById('mygap-tab-' + keys[i])?.focus(); } }
                    className={`tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
                    onClick={() => setActiveTab('guide')}
                >
                    <BookOpen size={18} />
                    <span>{t('nav.about')}</span>
                </button>
                <button
                    role="tab" aria-selected={activeTab === 'checklist'} aria-controls="mygap-panel" id="mygap-tab-checklist"
                    tabIndex={activeTab === 'checklist' ? 0 : -1}
                    onKeyDown={event => { const keys = ['guide', 'checklist', 'logbook', 'calendar', 'phi']; let i = keys.indexOf(activeTab); if (event.key === 'ArrowRight') i = (i + 1) % keys.length; else if (event.key === 'ArrowLeft') i = (i + keys.length - 1) % keys.length; else if (event.key === 'Home') i = 0; else if (event.key === 'End') i = keys.length - 1; else return; event.preventDefault(); setActiveTab(keys[i]); document.getElementById('mygap-tab-' + keys[i])?.focus(); } }
                    className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
                    onClick={() => setActiveTab('checklist')}
                >
                    <ClipboardCheck size={18} />
                    <span>{t('mygap.tabChecklist')}</span>
                </button>
                <button
                    role="tab" aria-selected={activeTab === 'logbook'} aria-controls="mygap-panel" id="mygap-tab-logbook"
                    tabIndex={activeTab === 'logbook' ? 0 : -1}
                    onKeyDown={event => { const keys = ['guide', 'checklist', 'logbook', 'calendar', 'phi']; let i = keys.indexOf(activeTab); if (event.key === 'ArrowRight') i = (i + 1) % keys.length; else if (event.key === 'ArrowLeft') i = (i + keys.length - 1) % keys.length; else if (event.key === 'Home') i = 0; else if (event.key === 'End') i = keys.length - 1; else return; event.preventDefault(); setActiveTab(keys[i]); document.getElementById('mygap-tab-' + keys[i])?.focus(); } }
                    className={`tab-btn ${activeTab === 'logbook' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logbook')}
                >
                    <FileText size={18} />
                    <span>{t('mygap.tabLogbook')}</span>
                </button>
                <button
                    role="tab" aria-selected={activeTab === 'calendar'} aria-controls="mygap-panel" id="mygap-tab-calendar"
                    tabIndex={activeTab === 'calendar' ? 0 : -1}
                    onKeyDown={event => { const keys = ['guide', 'checklist', 'logbook', 'calendar', 'phi']; let i = keys.indexOf(activeTab); if (event.key === 'ArrowRight') i = (i + 1) % keys.length; else if (event.key === 'ArrowLeft') i = (i + keys.length - 1) % keys.length; else if (event.key === 'Home') i = 0; else if (event.key === 'End') i = keys.length - 1; else return; event.preventDefault(); setActiveTab(keys[i]); document.getElementById('mygap-tab-' + keys[i])?.focus(); } }
                    className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calendar')}
                >
                    <Calendar size={18} />
                    <span>{t('mygap.tabCalendar')}</span>
                </button>
                <button
                    role="tab" aria-selected={activeTab === 'phi'} aria-controls="mygap-panel" id="mygap-tab-phi"
                    tabIndex={activeTab === 'phi' ? 0 : -1}
                    onKeyDown={event => { const keys = ['guide', 'checklist', 'logbook', 'calendar', 'phi']; let i = keys.indexOf(activeTab); if (event.key === 'ArrowRight') i = (i + 1) % keys.length; else if (event.key === 'ArrowLeft') i = (i + keys.length - 1) % keys.length; else if (event.key === 'Home') i = 0; else if (event.key === 'End') i = keys.length - 1; else return; event.preventDefault(); setActiveTab(keys[i]); document.getElementById('mygap-tab-' + keys[i])?.focus(); } }
                    className={`tab-btn ${activeTab === 'phi' ? 'active' : ''}`}
                    onClick={() => setActiveTab('phi')}
                >
                    <Calculator size={18} />
                    <span>{t('mygap.tabPhi')}</span>
                </button>
            </div>

            <div id="mygap-panel" role="tabpanel" aria-labelledby={`mygap-tab-${activeTab}`} tabIndex={0}>
            {activeTab === 'guide' && (
                <div className="fade-in">
                    <div className="disclaimer-card">
                        <AlertTriangle size={20} className="disclaimer-icon" />
                        <p>{t('mygap.disclaimer')}</p>
                    </div>

                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.whatIsMyGap')}</h2>
                        <p className="section-content">{t('mygap.whatIsMyGapContent')}</p>
                    </div>

                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.keyPillars')}</h2>
                        <div className="pillars-grid">
                            {pillars.map((pillar, index) => (
                                <div key={index} className="pillar-card">
                                    <div className="pillar-icon-wrapper">{pillar.icon}</div>
                                    <h3 className="pillar-title">{pillar.title}</h3>
                                    <p className="pillar-description">{pillar.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="button-group">
                        <a href="https://mygap.doa.gov.my/" target="_blank" rel="noopener noreferrer" className="official-link-button">
                            {t('mygap.officialLink')}
                            <ExternalLink size={16} />
                        </a>
                        <button type="button" onClick={generateReport} className="report-button" disabled={exportingReport} aria-busy={exportingReport}>
                            {t('mygap.generateReport')}
                            <Download size={16} />
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'checklist' && (
                <div className="fade-in">
                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.checklistTitle')}</h2>
                        <p className="section-subtitle mb-lg">{t('mygap.checklistSubtitle')}</p>

                        <div className="compliance-progress-container">
                            <div className="progress-header">
                                <span className="progress-label">{t('mygap.complianceProgress') || 'Compliance Progress'}</span>
                                <span className="progress-stats">
                                    {completedChecklistCount}/{checklistItems.length} {t('mygap.completed') || 'Completed'} - {checklistProgressPct}%
                                </span>
                            </div>
                            <div className="progress-track">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${checklistProgressPct}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="checklist-items">
                            {checklistItems.map((item) => {
                                const isCompleted = derivedChecklist[item.id];
                                const isAuto = autoCheckedItems[item.id];
                                
                                return (
                                    <label
                                        key={item.id}
                                        className={`checklist-item ${isCompleted ? 'completed' : ''} ${isAuto ? 'is-auto-derived' : ''}`}
                                    >
                                        <input type="checkbox" checked={Boolean(isCompleted)} disabled={Boolean(isAuto)} onChange={() => handleCheckToggle(item.id)} />
                                        <div className="check-icon" aria-hidden="true">
                                            {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                        </div>
                                        <div className="checklist-item-content">
                                            <span>{item.label}</span>
                                            {isAuto && (
                                                <span className="synced-badge">
                                                    <RefreshCw size={10} />
                                                    {t('mygap.syncedFromRecords') || 'Completed from farm records'}
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'calendar' && (
                <div className="fade-in">
                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.tabCalendar')}</h2>
                        <p className="section-subtitle mb-lg">{t('mygap.logbookSubtitle')}</p>
                        {hasMoreData && <p className="data-scope-note" role="status">{t('mygap.recentDataNotice') || 'Showing the 200 most recent records for faster loading. The PDF report includes the complete logbook.'}</p>}
                        <ComplianceCalendar events={allEvents} />
                    </div>
                </div>
            )}

            {activeTab === 'logbook' && (
                <div className="fade-in">
                    <div className="content-card">
                        <div className="section-header-row">
                            <h2 className="section-title">{t('mygap.logbookTitle')}</h2>
                            <button
                                type="button"
                                className="add-log-btn"
                                onClick={() => setIsAddingLog(!isAddingLog)}
                                aria-label={t('mygap.addLog') || 'Add activity log'}
                                aria-expanded={isAddingLog}
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <p className="section-subtitle mb-lg">{t('mygap.logbookSubtitle')}</p>
                        {hasMoreData && <p className="data-scope-note" role="status">{t('mygap.recentDataNotice') || 'Showing the 200 most recent records for faster loading. The PDF report includes the complete logbook.'}</p>}

                        {!isAddingLog && logs.length > 0 && (
                            <div className="mygap-log-actions">
                                <button type="button" className="btn btn-secondary mygap-repeat-btn" onClick={repeatLastLog}>
                                    {label('assessment.ux.repeatLast', 'Repeat last entry')}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={generateReport} disabled={exportingReport} aria-busy={exportingReport}>
                                    <Download size={16} aria-hidden="true" />
                                    {t('mygap.generateReport')}
                                </button>
                            </div>
                        )}

                        {isAddingLog && (
                            <form className="add-log-form slide-down" onSubmit={handleAddLog}>
                                <VoiceLogInput onFill={(fields) => setNewLog((current) => ({ ...current, ...fields }))} />
                                <div className="form-group">
                                    <label htmlFor="mygap-log-type">{t('mygap.logType')}</label>
                                    <select
                                        id="mygap-log-type"
                                        value={newLog.type}
                                        onChange={(e) => setNewLog({ ...newLog, type: e.target.value })}
                                    >
                                        <option value="pesticide">{t('mygap.pesticideLog')}</option>
                                        <option value="fertilizer">{t('mygap.fertilizerLog')}</option>
                                        <option value="harvest">{t('mygap.harvestLog')}</option>
                                        <option value="irrigation">{t('mygap.irrigationLog')}</option>
                                    </select>
                                </div>
                                <div className="mygap-log-details">
                                    <div className="form-group">
                                        <label htmlFor="mygap-log-date">{label('assessment.mygap.activityDate', 'Activity date')}</label>
                                        <input id="mygap-log-date" type="date" value={newLog.activity_date} max={new Date().toISOString().slice(0, 10)}
                                            onChange={(e) => setNewLog({ ...newLog, activity_date: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="mygap-log-plot">{label('assessment.mygap.plot', 'Farm or plot')}</label>
                                        <input id="mygap-log-plot" type="text" maxLength={120} value={newLog.plot_id}
                                            onChange={(e) => setNewLog({ ...newLog, plot_id: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="mygap-log-crop">{label('assessment.mygap.crop', 'Crop')}</label>
                                        <input id="mygap-log-crop" type="text" maxLength={120} value={newLog.crop}
                                            onChange={(e) => setNewLog({ ...newLog, crop: e.target.value })} />
                                    </div>
                                    {['pesticide', 'fertilizer'].includes(newLog.type) && (
                                        <>
                                            <div className="form-group">
                                                <label htmlFor="mygap-log-product">{label('assessment.mygap.productUsed', 'Product used')}</label>
                                                <input id="mygap-log-product" type="text" maxLength={200} value={newLog.product_used}
                                                    onChange={(e) => setNewLog({ ...newLog, product_used: e.target.value })} />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="mygap-log-quantity">{label('assessment.mygap.quantity', 'Quantity you used')}</label>
                                                <input id="mygap-log-quantity" type="text" maxLength={100} value={newLog.quantity}
                                                    aria-describedby="mygap-log-quantity-hint"
                                                    onChange={(e) => setNewLog({ ...newLog, quantity: e.target.value })} />
                                                <small id="mygap-log-quantity-hint" className="field-hint">{label('assessment.mygap.quantityHint', 'Record what you actually applied. Always follow the product label.')}</small>
                                            </div>
                                        </>
                                    )}
                                    <div className="form-group">
                                        <label htmlFor="mygap-log-operator">{label('assessment.mygap.operator', 'Done by')}</label>
                                        <input id="mygap-log-operator" type="text" maxLength={120} value={newLog.operator}
                                            onChange={(e) => setNewLog({ ...newLog, operator: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="mygap-log-notes">{t('mygap.logNotes')}</label>
                                    <textarea
                                        id="mygap-log-notes"
                                        required
                                        value={newLog.notes}
                                        onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                                        placeholder={t('mygap.logNotesPlaceholder')}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setIsAddingLog(false)}>
                                        {t('common.cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {t('common.save')}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="logs-list">
                            {logs.length === 0 ? (
                                <div className="empty-logs">
                                    <Calendar size={48} />
                                    <p>{t('mygap.emptyLogs')}</p>
                                    {!isAddingLog && (
                                        <button type="button" className="btn btn-primary" onClick={() => setIsAddingLog(true)}>
                                            {label('assessment.ux.addFirstLog', 'Add your first record')}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="log-card">
                                        <div className="log-header">
                                            <span className={`log-badge ${log.type}`}>
                                                {t(`mygap.${log.type}Log`).split(' ')[0]}
                                            </span>
                                            <span className="log-date">
                                                {new Date(log.activity_date || log.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {log.syncStatus === 'pending' && (
                                            <span className="log-sync-badge">{label('assessment.sync.savedOnDeviceShort', 'Saved on device')}</span>
                                        )}
                                        {[log.plot_id, log.crop, log.product_used, log.quantity, log.operator].some(Boolean) && (
                                            <p className="log-details">
                                                {[
                                                    log.plot_id && `${label('assessment.mygap.plot', 'Farm or plot')}: ${log.plot_id}`,
                                                    log.crop && `${label('assessment.mygap.crop', 'Crop')}: ${log.crop}`,
                                                    log.product_used && `${label('assessment.mygap.productUsed', 'Product used')}: ${log.product_used}`,
                                                    log.quantity && `${label('assessment.mygap.quantity', 'Quantity you used')}: ${log.quantity}`,
                                                    log.operator && `${label('assessment.mygap.operator', 'Done by')}: ${log.operator}`,
                                                ].filter(Boolean).join(' · ')}
                                            </p>
                                        )}
                                        <p className="log-notes">{log.notes}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'phi' && (
                <div className="fade-in">
                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.phiTitle')}</h2>
                        <p className="section-subtitle mb-lg">{t('mygap.phiDesc')}</p>

                        <form className="phi-form" onSubmit={calculatePHI}>
                            <div className="form-group">
                                <label htmlFor="mygap-pesticide-name">{t('mygap.pesticideName')}</label>
                                <input
                                    id="mygap-pesticide-name"
                                    type="text"
                                    value={pesticideName}
                                    onChange={(e) => setPesticideName(e.target.value)}
                                    placeholder={t('mygap.pesticideNamePlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="mygap-phi-days">{t('mygap.phiDays')}</label>
                                <input
                                    id="mygap-phi-days"
                                    type="number"
                                    required
                                    min="0"
                                    max={MAX_PHI_DAYS}
                                    step="1"
                                    value={phiDays}
                                    onChange={(e) => setPhiDays(e.target.value)}
                                    placeholder={t('mygap.phiDaysPlaceholder')}
                                    aria-invalid={Boolean(phiError)}
                                    aria-describedby={phiError ? 'mygap-phi-days-error' : 'mygap-phi-days-hint'}
                                />
                                <small id="mygap-phi-days-hint" className="form-hint">
                                    {t('mygap.phiRange') || `Enter a whole number from 0 to ${MAX_PHI_DAYS}.`}
                                </small>
                                {phiError && <p id="mygap-phi-days-error" className="form-error" role="alert">{phiError}</p>}
                            </div>
                            <button type="submit" className="btn btn-primary w-full">
                                {t('mygap.calcSafeDate')}
                            </button>
                        </form>

                        {phiResult && (
                            <div className="phi-result-card slide-down">
                                <div className="result-header">
                                    <Timer size={24} className="result-icon" />
                                    <div>
                                        <span className="result-label">{t('mygap.safeHarvestDate')}</span>
                                        <h3 className="result-date">{phiResult.date.toLocaleDateString()}</h3>
                                    </div>
                                </div>
                                {phiResult.pesticideName && (
                                    <p className="result-product">{t('mygap.pesticideName')}: {phiResult.pesticideName}</p>
                                )}
                                <div className={`result-badge ${phiResult.daysRemaining === 0 ? 'safe' : 'danger'}`}>
                                    {phiResult.daysRemaining === 0
                                        ? (t('mygap.safeToday') || 'No waiting period')
                                        : `${t('mygap.daysRemaining')} ${phiResult.daysRemaining}`}
                                </div>
                                <p className={phiResult.daysRemaining === 0 ? 'result-note' : 'result-warning'}>
                                    <AlertTriangle size={16} aria-hidden="true" />
                                    {phiResult.daysRemaining === 0
                                        ? (t('mygap.safeTodayNotice') || 'No waiting period was entered. Follow the product label before harvesting.')
                                        : t('mygap.notSafeToHarvest')}
                                </p>
                                <p className="phi-advisory">{t('mygap.phiAdvisory') || 'Advisory only: always follow the pesticide label and local agricultural guidance.'}</p>
                                {phiResult.daysRemaining > 0 && (
                                    <button type="button" className="btn btn-secondary phi-reminder-btn" onClick={saveHarvestReminder}>
                                        {label('assessment.ux.saveHarvestReminder', 'Remind me on this date')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
        </div>
    );
};

export default MyGapPage;
