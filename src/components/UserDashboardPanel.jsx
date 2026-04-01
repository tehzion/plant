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
import {
    BarChart3,
    LayoutDashboard,
    LogOut,
    MapPinned,
    NotebookPen,
    ShieldCheck,
    ShoppingBag,
    ScanLine,
    User,
    Edit3,
    X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { 
    ACTIVITY_TYPES_CFG, 
    ACTIVITY_BADGE_COLOR, 
    EMPTY_FORM 
} from '../data/config';
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

const TAB_FALLBACK = (
    <div className="page-loading" style={{ minHeight: '24vh' }}>
        <LoadingSpinner />
    </div>
);

// ─── Main component ──────────────────────────────────────────────────────────
const UserDashboardPanel = () => {
    const { user, signOut }                 = useAuth();
    const { t, label }                      = useLanguage();
    const navigate                          = useNavigate();
    const { notify, notifyError, notifySuccess, notifyWarning } = useNotifications();
    const { getLocation }                   = useLocation();
    const { forecast, error: weatherError, fetchWeather } = useWeather();


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

    // ── Profile / Verification State ──────────────────────────────────────────
    const [profileInfo, setProfileInfo] = useState(() => {
        const saved = localStorage.getItem(`profile_info_${user?.id}`);
        return saved ? JSON.parse(saved) : { 
            name: '', 
            contact: '', 
            crops: '', 
            memberSince: new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
        };
    });
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const isVerified = !!(profileInfo.name && profileInfo.contact);

    useEffect(() => {
        if (user?.id) {
            localStorage.setItem(`profile_info_${user.id}`, JSON.stringify(profileInfo));
        }
    }, [profileInfo, user?.id]);

    const [tempProfile, setTempProfile] = useState(profileInfo);
    const handleProfileSave = (e) => {
        e.preventDefault();
        setProfileInfo(prev => ({ ...prev, ...tempProfile }));
        setIsEditingProfile(false);
        if (!isVerified) notifySuccess(label('profile.loggedSuccess', 'Profile updated!'));
    };

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
    const profileHeadline = activeAlertCount > 0
        ? `${activeAlertCount} ${label('profile.urgentAlerts', 'urgent alerts')}`
        : hasLoggedToday
            ? label('profile.dashboardReady', 'Farm updated for today')
            : label('profile.logDailyTask', 'Log a daily farm task');
    const profileSubline = activeAlertCount > 0
        ? label('profile.actionRequired', 'Action required to protect your plots')
        : hasLoggedToday
            ? label('profile.noUrgentIssues', 'No urgent disease issue detected right now')
            : label('profile.logDailyHint', 'Add scouting, spray, or harvest activity to keep your records complete.');

    // ── Tab definitions ───────────────────────────────────────────────────────
    const TABS = [
        { id: 'overview', label: label('profile.tabOverview', 'Overview'), icon: LayoutDashboard, badge: activeAlertCount > 0 ? activeAlertCount : null },
        { id: 'reports',  label: label('profile.tabReports', 'Reports'), icon: BarChart3 },
        { id: 'plots',    label: label('profile.tabPlots', 'Plots'), icon: MapPinned },
        { id: 'notes',    label: label('profile.tabNotes', 'Daily Log'), icon: NotebookPen, badge: hasLoggedToday ? null : '!' },
        { id: 'products', label: label('profile.tabProducts', 'Products'), icon: ShoppingBag },
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
            note: warningMessage,
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

            {/* ── Compact Profile Header (User Section on Top) ── */}
            <div className="udp-profile-card udp-profile-card--compact fade-slide-up">
                <div className="udp-profile-top-row">
                    <div className="udp-profile-main">
                        <div className="udp-avatar-wrapper">
                            <div className="udp-avatar udp-avatar--compact">{initials}</div>
                            <span className="udp-avatar-status udp-avatar-status--compact" />
                        </div>
                        <div className="udp-profile-identity">
                            <h2 className="udp-display-name udp-display-name--compact">{displayName}</h2>
                            <p className="udp-email udp-email--compact"><span className="udp-email-dot" />{email}</p>
                        </div>
                    </div>
                    <div className="udp-profile-actions">
                        <button 
                            className="udp-signout-mini udp-signout-mini--muted"
                            onClick={() => setShowProfileModal(true)}
                        >
                            <User size={14} />
                        </button>
                        <button className="udp-signout-mini" onClick={handleSignOut} disabled={signingOut}>
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>

                <div className="udp-profile-badges udp-profile-badges--compact">
                    <button className={`udp-badge udp-badge--compact is-interactive ${isVerified ? 'udp-badge-verified' : 'udp-badge-unverified'}`} onClick={() => { setIsEditingProfile(!isVerified); setShowProfileModal(true); }}>
                        <ShieldCheck size={10} />
                        {isVerified ? label('profile.verifiedFarmer', 'Verified Farmer') : label('profile.verifyNow', 'Verify Profile')}
                    </button>
                    <button className={`udp-badge udp-badge--compact is-interactive ${activeAlertCount > 0 ? 'udp-badge-alert' : 'udp-badge-ok'}`} onClick={() => navigate('/history')}>
                        {activeAlertCount > 0 ? `${activeAlertCount} ${label('profile.urgentAlerts', 'Alerts')}` : label('profile.allClear', 'All Clear')}
                    </button>
                </div>
            </div>

            {/* ── Feature Browser (Explore Features) ── */}
            <div className="udp-category-header udp-category-header--compact">
                <span className="udp-category-title">{label('profile.browseFeatures', 'Explore Features')}</span>
            </div>
            <div className="udp-shelf-container udp-shelf-container--compact">
                {TABS.map(t2 => (
                    <button
                        key={t2.id}
                        className={`udp-utility-card ${tab === t2.id ? 'active' : ''}`}
                        onClick={() => setTab(t2.id)}
                    >
                        <div className={`udp-utility-icon-box ${tab === t2.id ? 'active' : ''}`}>
                            <t2.icon 
                                size={24} 
                                strokeWidth={tab === t2.id ? 2.5 : 2} 
                            />
                            {t2.badge && (
                                <span className="udp-tab-badge udp-tab-badge--tight">{t2.badge}</span>
                            )}
                        </div>
                        <span className={`udp-utility-label ${tab === t2.id ? 'active' : ''}`}>
                            {t2.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Tab content ──────────────────────────────────────────────── */}
            <div className="udp-tab-content fade-slide-up udp-tab-content--delayed">
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
            {/* ── Farmer Profile / Verification Modal ─────────────────────── */}
            {showProfileModal && (
                <div className="udp-modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="udp-profile-modal" onClick={e => e.stopPropagation()}>
                        <div className="udp-profile-modal-header">
                            <button className="udp-profile-modal-close" onClick={() => setShowProfileModal(false)}>
                                <X size={20} />
                            </button>
                            <div className="udp-profile-modal-avatar">
                                {isVerified ? initials : <User size={40} />}
                            </div>
                            <h3 style={{ marginBottom: '4px' }}>{isVerified ? profileInfo.name : label('profile.completeToVerify', 'Complete Profile')}</h3>
                            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>{email}</p>
                        </div>
                        
                        <div className="udp-profile-modal-body">
                            {isEditingProfile ? (
                                <form onSubmit={handleProfileSave}>
                                    <div className="udp-form-group">
                                        <label className="udp-form-label">{label('profile.plotName', 'Full Name')}</label>
                                        <input 
                                            type="text" 
                                            className="udp-form-input" 
                                            value={tempProfile.name}
                                            onChange={e => setTempProfile({...tempProfile, name: e.target.value})}
                                            placeholder={label('profile.agropreneurPlaceholder', 'e.g. Ahmad Farmer')}
                                            required
                                        />
                                    </div>
                                    <div className="udp-form-group">
                                        <label className="udp-form-label">{label('profile.contactInfo', 'Contact Number')}</label>
                                        <input 
                                            type="text" 
                                            className="udp-form-input" 
                                            value={tempProfile.contact}
                                            onChange={e => setTempProfile({...tempProfile, contact: e.target.value})}
                                            placeholder={label('profile.contactPlaceholder', 'e.g. +60 12-345 6789')}
                                            required
                                        />
                                    </div>
                                    <div className="udp-form-group">
                                        <label className="udp-form-label">{label('profile.specializedCrops', 'Specialized Crops')}</label>
                                        <input 
                                            type="text" 
                                            className="udp-form-input" 
                                            value={tempProfile.crops}
                                            onChange={e => setTempProfile({...tempProfile, crops: e.target.value})}
                                            placeholder={label('profile.cropsPlaceholder', 'e.g. Durian, Rubber')}
                                        />
                                    </div>
                                    <div className="udp-modal-footer">
                                        <button type="button" className="udp-btn-ghost" onClick={() => setIsEditingProfile(false)}>
                                            {t?.('common.cancel') || 'Cancel'}
                                        </button>
                                        <button type="submit" className="udp-btn-primary">
                                            {label('profile.saveProfile', 'Save & Verify')}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="udp-profile-info-grid">
                                    <div className="udp-profile-info-item">
                                        <span className="udp-profile-info-label">{label('profile.plotName', 'Name')}</span>
                                        <span className="udp-profile-info-value">{profileInfo.name}</span>
                                    </div>
                                    <div className="udp-profile-info-item">
                                        <span className="udp-profile-info-label">{label('profile.contactInfo', 'Contact')}</span>
                                        <span className="udp-profile-info-value">{profileInfo.contact}</span>
                                    </div>
                                    <div className="udp-profile-info-item">
                                        <span className="udp-profile-info-label">{label('profile.specializedCrops', 'Crops')}</span>
                                        <span className="udp-profile-info-value">{profileInfo.crops || '-'}</span>
                                    </div>
                                    <div className="udp-profile-info-item">
                                        <span className="udp-profile-info-label">{label('profile.memberSince', 'Member Since')}</span>
                                        <span className="udp-profile-info-value">{profileInfo.memberSince}</span>
                                    </div>
                                    <div className="udp-modal-footer">
                                        <button className="udp-btn-primary" onClick={() => {
                                            setTempProfile(profileInfo);
                                            setIsEditingProfile(true);
                                        }}>
                                            <Edit3 size={16} style={{ marginRight: '8px' }} />
                                            {label('profile.editProfile', 'Edit Profile')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboardPanel;

