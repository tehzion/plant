import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { useNotifications } from '../context/NotificationProvider.jsx';
import { useFarmStats } from '../hooks/useFarmStats';
import { useAIAdvisor } from '../hooks/useAIAdvisor';
import {
    consumeStorageCleanupNotice,
    saveDailyNote,
    savePlot,
    deletePlot,
} from '../utils/localStorage';
import { LogOut, ShieldCheck, ScanLine } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import './UserDashboardPanel.css';

// ── Standalone dashboard tab components ──────────────────────────────────────
import OverviewTab  from './dashboard/OverviewTab';
const ReportsTab = lazyWithRetry(() => import('./dashboard/ReportsTab'), 'dashboard-reports');
const PlotsTab = lazyWithRetry(() => import('./dashboard/PlotsTab'), 'dashboard-plots');
const NotesTab = lazyWithRetry(() => import('./dashboard/NotesTab'), 'dashboard-notes');
const ProductsTab = lazyWithRetry(() => import('./dashboard/ProductsTab'), 'dashboard-products');
const AlertDetailModal = lazyWithRetry(() => import('./AlertDetailModal'), 'dashboard-alert-detail');

// ─── Helper: friendly relative date ─────────────────────────────────────────
export const relDate = (ts, t) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts)) / 86400000);
    if (diff === 0) return t?.('profile.relToday')     || 'Today';
    if (diff === 1) return t?.('profile.relYesterday') || 'Yesterday';
    return `${diff}${t?.('profile.relDaysAgo') || 'd ago'}`;
};

// ─── Activity type definitions ───────────────────────────────────────────────
const ACTIVITY_TYPES_CFG = [
    { value: 'note',      label: 'Note',      key: 'actNote',      chemical: false },
    { value: 'scout',     label: 'Scout',     key: 'actScout',     chemical: false },
    { value: 'spray',     label: 'Spray',     key: 'actSpray',     chemical: true  },
    { value: 'fertilize', label: 'Fertilize', key: 'actFertilize', chemical: true  },
    { value: 'prune',     label: 'Prune',     key: 'actPrune',     chemical: false },
    { value: 'inspect',   label: 'Inspect',   key: 'actInspect',   chemical: false },
    { value: 'harvest',   label: 'Harvest',   key: 'actHarvest',   chemical: false },
    { value: 'other',     label: 'Other',     key: 'actOther',     chemical: false },
];

export const ACTIVITY_BADGE_COLOR = {
    note:      { bg: '#f3f4f6', color: '#6b7280' },
    scout:     { bg: '#fee2e2', color: '#b91c1c' },
    spray:     { bg: '#fef9c3', color: '#b45309' },
    fertilize: { bg: '#d1fae5', color: '#065f46' },
    prune:     { bg: '#ede9fe', color: '#6d28d9' },
    inspect:   { bg: '#dbeafe', color: '#1d4ed8' },
    harvest:   { bg: '#f0fdf4', color: '#166534' },
    other:     { bg: '#f3f4f6', color: '#6b7280' },
};

export const EMPTY_FORM = {
    activity_type: 'note', plot_id: '', note: '',
    chemical_name: '', chemical_qty: '', application_timing: 'AM',
    temperature_am: '', humidity: '',
    growth_stage: 'Vegetative', pest_notes: '', disease_incidence: '',
    disease_name_observed: '', scout_severity: 'Low',
    kg_harvested: '', quality_grade: 'Good', price_per_kg: '', buyer_name: '',
    pruned_count: '', pruning_type: 'Thinning',
    inspection_type: 'Pest/Disease', inspection_status: 'Good',
    expense_amount: '', expense_category: 'Other',
    photo_base64: '',
};

const TAB_FALLBACK = (
    <div className="page-loading" style={{ minHeight: '24vh' }}>
        <LoadingSpinner />
    </div>
);

// ─── Main component ──────────────────────────────────────────────────────────
const UserDashboardPanel = () => {
    const { user, signOut }                 = useAuth();
    const { t, label: i18nLabel } = useLanguage();
    const navigate                          = useNavigate();
    const { notify, notifyError, notifySuccess, notifyWarning } = useNotifications();
    const { getLocation }                   = useLocation();
    const { forecast, error: weatherError, fetchWeather } = useWeather();
    const label = useCallback((key, fallback) => {
        if (typeof i18nLabel === 'function') {
            return i18nLabel(key, fallback);
        }
        const value = t(key);
        return value && value !== key ? value : fallback;
    }, [i18nLabel, t]);

    // ── Activity types with i18n labels ──────────────────────────────────────
    const ACTIVITY_TYPES = useMemo(
        () => ACTIVITY_TYPES_CFG.map(a => ({ ...a, label: label(`profile.${a.key}`, a.label) })),
        [label],
    );

    // ── Custom hooks: all farm data + AI logic ────────────────────────────────
    const {
        stats, scanHistory, checklistPct,
        hasLoggedToday, streak, complianceNudges,
        alerts, notes, setNotes,
        plots, setPlots,
        acknowledgedIds, setAcknowledgedIds,
        assessingRisk, predictiveRisk,
    } = useFarmStats({ userId: user?.id, getLocation, notify, t });

    // ── Form state ────────────────────────────────────────────────────────────
    const [noteForm,   setNoteForm]   = useState(EMPTY_FORM);
    const [addingNote, setAddingNote] = useState(false);
    const [savingNote, setSavingNote] = useState(false);

    const [plotForm,       setPlotForm]       = useState({ name: '', cropType: '', area: '', unit: 'acres', soil_ph: '', npk_n: '', npk_p: '', npk_k: '' });
    const [addingPlot,     setAddingPlot]     = useState(false);
    const [savingPlot,     setSavingPlot]     = useState(false);
    const [showSoilFields, setShowSoilFields] = useState(false);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [signingOut,    setSigningOut]    = useState(false);
    const [tab,           setTab]           = useState('overview');

    // ── AI advisor hook ───────────────────────────────────────────────────────
    const {
        aiInsights, generatingInsights,
        generatingInsightsScopeKey,
        enhancing, enhanceText, setEnhanceText,
        handleGenerateInsights, handleAutoEnhance,
    } = useAIAdvisor({ t, notes, plots, checklistPct, noteForm, setNoteForm, notifyError, notifySuccess });

    // ── Fetch weather once on mount (for OverviewTab forecast strip) ─────────
    useEffect(() => {
        let mounted = true;
        getLocation()
            .then(loc => {
                if (!mounted) return;
                fetchWeather(loc?.lat && loc?.lng ? loc.lat : 3.1412, loc?.lng ?? 101.6865);
            })
            .catch(() => fetchWeather(3.1412, 101.6865)); // KL fallback
        return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Derived profile display ───────────────────────────────────────────────
    const email       = user?.email ?? '';
    const displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const activeAlertCount = alerts.filter(s => !acknowledgedIds.includes(s.id)).length;

    // ── Tab definitions ───────────────────────────────────────────────────────
    const TABS = [
        { id: 'overview', label: label('profile.tabOverview', 'Overview')  },
        { id: 'reports',  label: label('profile.tabReports', 'Reports')   },
        { id: 'plots',    label: label('profile.tabPlots', 'Plots')     },
        { id: 'notes',    label: label('profile.tabNotes', 'Daily Log') },
        { id: 'products', label: label('profile.tabProducts', 'Products')  },
    ];

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSignOut = async () => {
        setSigningOut(true);
        try { await signOut(); navigate('/'); } catch { setSigningOut(false); }
    };

    const handleAcknowledge = useCallback((scanId) => {
        setAcknowledgedIds([...acknowledgedIds, scanId]);
    }, [acknowledgedIds, setAcknowledgedIds]);

    /**
     * onPrefillRecommendedTreatment — called from OverviewTab "Log Suggested Treatment"
     * Switches to the Notes tab and pre-fills the form with the AI recommendation.
     */
    const handlePrefillRecommendedTreatment = useCallback((warningMessage, recommendedTreatment) => {
        if (recommendedTreatment?.prefillAllowed === false) return;

        const validTypes = ['note', 'scout', 'spray', 'fertilize', 'prune', 'inspect', 'harvest', 'other'];
        const actType = validTypes.includes(recommendedTreatment?.activity)
            ? recommendedTreatment.activity
            : 'spray';
        const chemical = (recommendedTreatment?.chemical &&
            recommendedTreatment.chemical !== 'null' &&
            recommendedTreatment.chemical !== 'None')
            ? recommendedTreatment.chemical : '';

        setNoteForm({
            ...EMPTY_FORM,
            activity_type: actType,
            chemical_name: chemical,
            note: `${label('profile.aiAutoPopulated', '[AI Suggested]')} ${warningMessage}`,
        });
        setAddingNote(true);
        setTab('notes');
    }, [t]);

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteForm.note.trim() && !noteForm.chemical_name.trim()) return;
        setSavingNote(true);

        // Photo upload: use Supabase Storage if available, else keep inline base64
        let photoUrl = null;
        if (noteForm.photo_base64) {
            if (user?.id && supabase) {
                try {
                    const base64 = noteForm.photo_base64.startsWith('data:')
                        ? noteForm.photo_base64.split(',')[1] : noteForm.photo_base64;
                    const byteChars = atob(base64);
                    const blob = new Blob(
                        [new Uint8Array(Array.from(byteChars, c => c.charCodeAt(0)))],
                        { type: 'image/jpeg' },
                    );
                    const path = `${user.id}/note_${Date.now()}.jpg`;
                    const { error } = await supabase.storage
                        .from('scan-images')
                        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
                    if (!error) {
                        const { data } = supabase.storage.from('scan-images').getPublicUrl(path);
                        photoUrl = data.publicUrl;
                    } else {
                        photoUrl = noteForm.photo_base64;
                    }
                } catch {
                    photoUrl = noteForm.photo_base64;
                }
            } else {
                photoUrl = noteForm.photo_base64;
            }
        }

        const saved = await saveDailyNote({
            ...noteForm,
            plot_id:             noteForm.plot_id             || null,
            chemical_name:       noteForm.chemical_name       || null,
            chemical_qty:        noteForm.chemical_qty        || null,
            application_timing:  noteForm.application_timing  || null,
            temperature_am:      noteForm.temperature_am !== '' ? Number(noteForm.temperature_am) : null,
            humidity:            noteForm.humidity       !== '' ? Number(noteForm.humidity)       : null,
            growth_stage:        noteForm.growth_stage        || null,
            pest_notes:          noteForm.pest_notes          || null,
            disease_incidence:   noteForm.disease_incidence   !== '' ? Number(noteForm.disease_incidence)   : null,
            disease_name_observed: noteForm.disease_name_observed || null,
            scout_severity:      noteForm.scout_severity       || null,
            expense_amount:      noteForm.expense_amount       !== '' ? Number(noteForm.expense_amount)       : null,
            expense_category:    noteForm.expense_category     || null,
            kg_harvested:        noteForm.kg_harvested         !== '' ? Number(noteForm.kg_harvested)         : null,
            price_per_kg:        noteForm.price_per_kg         !== '' ? Number(noteForm.price_per_kg)         : null,
            quality_grade:       noteForm.quality_grade        || null,
            buyer_name:          noteForm.buyer_name           || null,
            pruned_count:        noteForm.pruned_count         !== '' ? Number(noteForm.pruned_count)         : null,
            pruning_type:        noteForm.pruning_type         || null,
            inspection_type:     noteForm.inspection_type      || null,
            inspection_status:   noteForm.inspection_status    || null,
            photo_url:           photoUrl,
        }, user?.id ?? null);

        if (saved) {
            const cleanupNotice = consumeStorageCleanupNotice();
            setNotes(prev => [saved, ...prev]);
            setNoteForm(EMPTY_FORM);
            setAddingNote(false);
            if (cleanupNotice) {
                notifyWarning(
                    label('common.storageCleanupNotice', 'Old records were cleaned up to save your latest data.'),
                );
            }
            notifySuccess(label('common.savedSuccess', 'Activity log saved!'));
        } else {
            notifyError(label('error.saveFailed', 'Failed to save. Please try again.'));
        }
        setSavingNote(false);
    };

    const handleAddPlot = async (e) => {
        e.preventDefault();
        if (!plotForm.name.trim()) return;
        setSavingPlot(true);
        const saved = await savePlot({
            name:     plotForm.name,
            cropType: plotForm.cropType,
            area:     parseFloat(plotForm.area) || 0,
            unit:     plotForm.unit,
            soil_ph:  plotForm.soil_ph !== '' ? parseFloat(plotForm.soil_ph) : null,
            npk_n:    plotForm.npk_n   !== '' ? parseFloat(plotForm.npk_n)   : null,
            npk_p:    plotForm.npk_p   !== '' ? parseFloat(plotForm.npk_p)   : null,
            npk_k:    plotForm.npk_k   !== '' ? parseFloat(plotForm.npk_k)   : null,
        }, user?.id ?? null);
        if (saved) {
            setPlots(prev => [saved, ...prev]);
            setPlotForm({ name: '', cropType: '', area: '', unit: 'acres', soil_ph: '', npk_n: '', npk_p: '', npk_k: '' });
            setShowSoilFields(false);
            setAddingPlot(false);
            notifySuccess(label('profile.plotSaved', 'Plot added successfully!'));
        }
        setSavingPlot(false);
    };

    const handleDeletePlot = useCallback((id) => {
        notify({
            type:        'error',
            message:     label('profile.confirmDeletePlot', 'Remove this plot?'),
            actionLabel: label('common.confirm', 'Remove'),
            duration:    8000,
            action:      async () => {
                const ok = await deletePlot(id, user?.id ?? null);
                if (ok) setPlots(prev => prev.filter(p => p.id !== id));
            },
        });
    }, [notify, t, user?.id, setPlots]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="udp-container">

            {/* ── Profile Card ─────────────────────────────────────────────── */}
            <div className="udp-profile-card">
                <div className="udp-profile-blob udp-profile-blob-1" />
                <div className="udp-profile-blob udp-profile-blob-2" />

                <div className="udp-profile-top-row">
                    <div className="udp-avatar-wrapper">
                        <div className="udp-avatar-ring" />
                        <div className="udp-avatar">{initials}</div>
                        <span className="udp-avatar-status" title={label('home.onlineStatus', 'Online')} />
                    </div>
                    <button
                        className="udp-signout-mini"
                        onClick={handleSignOut}
                        disabled={signingOut}
                        title={label('common.signOut', 'Sign out')}
                    >
                        <LogOut size={15} />
                    </button>
                </div>

                <div className="udp-profile-identity">
                    <h2 className="udp-display-name">{displayName}</h2>
                    <p className="udp-email"><span className="udp-email-dot" />{email}</p>
                </div>

                <div className="udp-profile-badges">
                    <span className="udp-badge udp-badge-verified">
                        <ShieldCheck size={11} />
                        {label('profile.verifiedFarmer', 'Verified Farmer')}
                    </span>
                    {stats.total > 0 && (
                        <span className="udp-badge udp-badge-scans">
                            <ScanLine size={11} />
                            {stats.total} {label('profile.totalScans', 'Scans')}
                        </span>
                    )}
                    {checklistPct >= 50 && (
                        <span className="udp-badge udp-badge-gap">
                            <ShieldCheck size={11} />
                            GAP {checklistPct}%
                        </span>
                    )}
                </div>

                <div className="udp-profile-strip">
                    <div className="udp-strip-item">
                        <span className="udp-strip-num">{stats.healthy}</span>
                        <span className="udp-strip-label">{label('profile.healthy', 'Healthy')}</span>
                    </div>
                    <div className="udp-strip-divider" />
                    <div className="udp-strip-item">
                        <span className="udp-strip-num udp-strip-warn">{stats.diseases}</span>
                        <span className="udp-strip-label">{label('profile.diseased', 'Issues')}</span>
                    </div>
                    <div className="udp-strip-divider" />
                    <div className="udp-strip-item">
                        <span className="udp-strip-num">{plots.length}</span>
                        <span className="udp-strip-label">{label('profile.plots', 'Plots')}</span>
                    </div>
                    <div className="udp-strip-divider" />
                    <div className="udp-strip-item">
                        <span className="udp-strip-num udp-strip-purple">{notes.length}</span>
                        <span className="udp-strip-label">{label('profile.tabNotes', 'Logs')}</span>
                    </div>
                </div>
            </div>

            {/* ── Tab bar ──────────────────────────────────────────────────── */}
            <div className="udp-tabs">
                {TABS.map(t2 => (
                    <button
                        key={t2.id}
                        className={`udp-tab ${tab === t2.id ? 'active' : ''}`}
                        onClick={() => setTab(t2.id)}
                    >
                        {t2.label}
                        {t2.id === 'overview' && activeAlertCount > 0 && (
                            <span className="udp-tab-badge">{activeAlertCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Tab content ──────────────────────────────────────────────── */}
            <div className="udp-tab-content">
                {tab === 'overview' && (
                    <OverviewTab
                        t={t}
                        label={label}
                        stats={stats}
                        alerts={alerts}
                        acknowledgedIds={acknowledgedIds}
                        notes={notes}
                        scanHistory={scanHistory}
                        hasLoggedToday={hasLoggedToday}
                        streak={streak}
                        complianceNudges={complianceNudges}
                        setTab={setTab}
                        setAddingNote={setAddingNote}
                        setNoteForm={setNoteForm}
                        emptyForm={EMPTY_FORM}
                        navigate={navigate}
                        assessingRisk={assessingRisk}
                        predictiveRisk={predictiveRisk}
                        forecast={forecast}
                        weatherError={weatherError}
                        checklistPct={checklistPct}
                        plots={plots}
                        relDate={relDate}
                        onSelectAlert={setSelectedAlert}
                        onGenerateInsights={handleGenerateInsights}
                        generatingInsights={generatingInsights && generatingInsightsScopeKey === 'overview'}
                        aiInsights={aiInsights}
                        onPrefillRecommendedTreatment={handlePrefillRecommendedTreatment}
                    />
                )}

                {tab === 'reports' && (
                    <Suspense fallback={TAB_FALLBACK}>
                        <ReportsTab
                            t={t}
                            label={label}
                            stats={stats}
                            checklistPct={checklistPct}
                            alerts={alerts}
                            acknowledgedIds={acknowledgedIds}
                            notes={notes}
                            plots={plots}
                            onGenerateInsights={handleGenerateInsights}
                            generatingInsights={generatingInsights}
                            generatingInsightsScopeKey={generatingInsightsScopeKey}
                            aiInsights={aiInsights}
                            onSelectAlert={setSelectedAlert}
                            relDate={relDate}
                        />
                    </Suspense>
                )}

                {tab === 'plots' && (
                    <Suspense fallback={TAB_FALLBACK}>
                        <PlotsTab
                            t={t}
                            label={label}
                            addingPlot={addingPlot}
                            setAddingPlot={setAddingPlot}
                            handleAddPlot={handleAddPlot}
                            plotForm={plotForm}
                            setPlotForm={setPlotForm}
                            showSoilFields={showSoilFields}
                            setShowSoilFields={setShowSoilFields}
                            savingPlot={savingPlot}
                            plots={plots}
                            handleDeletePlot={handleDeletePlot}
                        />
                    </Suspense>
                )}

                {tab === 'notes' && (
                    <Suspense fallback={TAB_FALLBACK}>
                        <NotesTab
                            t={t}
                            label={label}
                            addingNote={addingNote}
                            setAddingNote={setAddingNote}
                            handleAddNote={handleAddNote}
                            noteForm={noteForm}
                            setNoteForm={setNoteForm}
                            activityTypes={ACTIVITY_TYPES}
                            plots={plots}
                            onAutoEnhance={handleAutoEnhance}
                            enhancing={enhancing}
                            enhanceText={enhanceText}
                            setEnhanceText={setEnhanceText}
                            savingNote={savingNote}
                            notes={notes}
                            ACTIVITY_BADGE_COLOR={ACTIVITY_BADGE_COLOR}
                            relDate={relDate}
                        />
                    </Suspense>
                )}

                {tab === 'products' && (
                    <Suspense fallback={TAB_FALLBACK}>
                        <ProductsTab label={label} />
                    </Suspense>
                )}
            </div>

            {/* ── Alert detail modal ────────────────────────────────────────── */}
            {selectedAlert && (
                <Suspense fallback={null}>
                    <AlertDetailModal
                        scan={selectedAlert}
                        onClose={() => setSelectedAlert(null)}
                        onAcknowledge={handleAcknowledge}
                    />
                </Suspense>
            )}

            {/* ── Global styles ─────────────────────────────────────────────── */}
        </div>
    );
};

export default UserDashboardPanel;

