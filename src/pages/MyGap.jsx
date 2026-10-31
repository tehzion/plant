import React, { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import translations from '../i18n/translations';
import {
    ShieldCheck, Sprout, HeartHandshake, Globe, AlertTriangle, ExternalLink, RefreshCw,
    ClipboardCheck, BookOpen, Plus, Calendar, FileText, CheckCircle2, Circle, Calculator, Timer, Download, MinusCircle
} from 'lucide-react';
import { deleteLogEntry, getLogbook, saveLogEntry, saveChecklistState, updateLogEntry } from '../utils/localStorage';
import MyGapLogForm from '../components/mygap/MyGapLogForm';
import MyGapLogCard from '../components/mygap/MyGapLogCard';
import PestCheckList from '../components/mygap/PestCheckList';
import { createLabel, fill } from '../components/mygap/mygapText.js';
import { findPhiConflicts, NOT_APPLICABLE } from '../../shared/mygapCompliance.js';
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
        checklistEvidence,
        checklistSummary,
        allEvents,
        hasMoreData,
        scanHistory,
        plots,
    } = useFarmStats({ userId: user?.id, getLocation, notify, t, maxRows: 200 });

    const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'checklist' | 'logbook' | 'phi'
    const [isAddingLog, setIsAddingLog] = useState(false);
    const [editingLog, setEditingLog] = useState(null);
    // Plot, crop and operator rarely change between entries, so they are
    // remembered on this device and pre-filled.
    const emptyLog = () => ({ type: 'pesticide', notes: '', activity_date: localDateKey(), plot_id: '', crop: '', product_used: '', quantity: '', operator: '', ...getLogDefaults() });
    const [newLog, setNewLog] = useState(emptyLog);
    const [formKey, setFormKey] = useState(0);
    const label = createLabel(t);
    const openAddForm = (values) => {
        setEditingLog(null);
        setNewLog(values);
        setFormKey((key) => key + 1);
        setIsAddingLog(true);
    };

    // PHI Calculator State
    const [phiDays, setPhiDays] = useState('');
    const [pesticideName, setPesticideName] = useState('');
    const [phiResult, setPhiResult] = useState(null);
    const [phiError, setPhiError] = useState('');

    const saveChecklistValue = async (id, value) => {
        const newState = { ...checklist, [id]: value };
        const saved = await saveChecklistState(newState, user?.id ?? null);
        if (saved) setChecklist(newState);
        else notify({ type: 'error', title: t('common.error'), message: t('common.error') });
    };
    const handleCheckToggle = (id) => saveChecklistValue(id, checklist[id] === true ? false : true);
    const toggleNotApplicable = (id) => saveChecklistValue(id, checklist[id] === NOT_APPLICABLE ? false : NOT_APPLICABLE);

    const handleAddLog = async (values) => {
        const entry = await saveLogEntry(values, user?.id ?? null);
        if (entry) {
            rememberLogDefaults(values);
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

    const handleSaveCorrection = async (values, reason) => {
        try {
            const updated = await updateLogEntry(editingLog.id, values, reason, user?.id ?? null);
            setLogs(logs.map((log) => (log.id === editingLog.id ? { ...log, ...updated } : log)));
            setEditingLog(null);
        } catch (error) {
            console.error('myGAP record correction failed:', error);
            notify({ type: 'error', title: t('common.error'), message: error?.status === 400 ? error.message : label('mygap.correctionFailed', 'The change could not be saved. Check your connection and try again.') });
        }
    };

    const handleDeleteLog = async (log, reason) => {
        try {
            await deleteLogEntry(log.id, reason, user?.id ?? null);
            setLogs(logs.filter((item) => item.id !== log.id));
        } catch (error) {
            console.error('myGAP record deletion failed:', error);
            notify({ type: 'error', title: t('common.error'), message: error?.status === 400 ? error.message : label('mygap.correctionFailed', 'The change could not be saved. Check your connection and try again.') });
        }
    };

    const repeatLastLog = () => {
        const last = logs[0];
        if (!last) return;
        openAddForm({
            ...emptyLog(),
            type: last.type || 'pesticide',
            notes: last.notes || '',
            ...Object.fromEntries(['plot_id', 'crop', 'product_used', 'quantity', 'operator', 'active_ingredient', 'registration_no', 'area_treated', 'target_pest', 'phi_days'].map((field) => [field, last[field] ?? ''])),
        });
    };

    const recordTreatmentFromScan = (scan) => openAddForm({
        ...emptyLog(),
        type: 'pesticide',
        target_pest: scan.disease || '',
        linked_scan_id: scan.id,
        crop: scan.category || scan.plantType || getLogDefaults().crop || '',
        plot_id: scan.plotId || scan.plot_id || getLogDefaults().plot_id || '',
    });

    const recentScans = useMemo(() => (scanHistory || [])
        .filter((scan) => Date.now() - new Date(scan.timestamp || scan.created_at).getTime() <= 60 * 86400000)
        .slice(0, 5), [scanHistory]);
    const phiConflicts = useMemo(() => new Map(findPhiConflicts(logs).map((conflict) => [conflict.harvestId, conflict])), [logs]);

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

    const completedChecklistCount = checklistSummary.completed;
    const checklistProgressPct = checklistSummary.percent;
    const evidenceText = (id) => {
        const item = checklistEvidence[id];
        if (!item) return label('mygap.manualOnly', 'Records cannot show this. Tick it once you have checked it on the farm.');
        return fill(label(`mygap.evidence_${item.reason}`, ''), { count: item.count ?? 0 });
    };

    const [exportingReport, setExportingReport] = useState(false);
    const generateReport = async () => {
        if (exportingReport) return;
        setExportingReport(true);
        try {
            // The PDF covers the complete logbook, not just the rows loaded on screen.
            const reportLogs = await Promise.resolve(getLogbook(user?.id ?? null)).catch(() => logs);
            const { buildMyGapReportPdf, mygapReportFileName } = await import('../utils/mygapReportPdf');
            const doc = await buildMyGapReportPdf({ logs: reportLogs || logs, derivedChecklist, scans: scanHistory, language: language || 'en', translations });
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
                                    {completedChecklistCount}/{checklistSummary.applicable} {t('mygap.completed') || 'Completed'} - {checklistProgressPct}%
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
                                const state = derivedChecklist[item.id];
                                const notApplicable = state === NOT_APPLICABLE;
                                const isCompleted = state === true;
                                const isAuto = autoCheckedItems[item.id] && !notApplicable;
                                const hintId = `mygap-${item.id}-evidence`;

                                return (
                                    <div key={item.id} className={`checklist-row ${notApplicable ? 'is-na' : ''}`}>
                                        <label className={`checklist-item ${isCompleted ? 'completed' : ''} ${isAuto ? 'is-auto-derived' : ''}`}>
                                            <input type="checkbox" checked={isCompleted} disabled={Boolean(isAuto) || notApplicable} aria-describedby={hintId} onChange={() => handleCheckToggle(item.id)} />
                                            <div className="check-icon" aria-hidden="true">
                                                {notApplicable ? <MinusCircle size={24} /> : isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                            </div>
                                            <div className="checklist-item-content">
                                                <span>{item.label}</span>
                                                {isAuto && (
                                                    <span className="synced-badge">
                                                        <RefreshCw size={10} />
                                                        {t('mygap.syncedFromRecords') || 'Completed from farm records'}
                                                    </span>
                                                )}
                                                {notApplicable && <span className="na-badge">{label('mygap.naLabel', 'Not applicable')}</span>}
                                                <small id={hintId} className="checklist-evidence">{evidenceText(item.id)}</small>
                                            </div>
                                        </label>
                                        <button type="button" className="checklist-na-btn" aria-pressed={notApplicable} onClick={() => toggleNotApplicable(item.id)}>
                                            {notApplicable ? label('mygap.undoNa', 'Applies to my farm') : label('mygap.markNa', 'Not applicable to my farm')}
                                        </button>
                                    </div>
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
                                onClick={() => (isAddingLog ? setIsAddingLog(false) : openAddForm(emptyLog()))}
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
                            <MyGapLogForm key={`add-${formKey}`} t={t} language={language} mode="add" initialValues={newLog}
                                logs={logs} plots={plots} recentScans={recentScans}
                                onSubmit={handleAddLog} onCancel={() => setIsAddingLog(false)} />
                        )}

                        {!isAddingLog && (
                            <PestCheckList t={t} scans={recentScans} onRecordTreatment={recordTreatmentFromScan} />
                        )}

                        <div className="logs-list">
                            {logs.length === 0 ? (
                                <div className="empty-logs">
                                    <Calendar size={48} />
                                    <p>{t('mygap.emptyLogs')}</p>
                                    {!isAddingLog && (
                                        <button type="button" className="btn btn-primary" onClick={() => openAddForm(emptyLog())}>
                                            {label('assessment.ux.addFirstLog', 'Add your first record')}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                logs.map((log) => (editingLog?.id === log.id ? (
                                    <MyGapLogForm key={`edit-${log.id}`} t={t} language={language} mode="edit"
                                        initialValues={{ ...emptyLog(), ...Object.fromEntries(Object.entries(log).map(([field, value]) => [field, value ?? ''])) }}
                                        logs={logs} plots={plots} recentScans={recentScans}
                                        onSubmit={handleSaveCorrection} onCancel={() => setEditingLog(null)} />
                                ) : (
                                    <MyGapLogCard key={log.id} t={t} language={language} log={log} conflict={phiConflicts.get(log.id)}
                                        onEdit={(item) => { setIsAddingLog(false); setEditingLog(item); }} onDelete={handleDeleteLog} />
                                )))
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
