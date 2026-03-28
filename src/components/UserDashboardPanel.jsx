import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { useNotifications } from '../context/NotificationProvider.jsx';
import { useFarmStats } from '../hooks/useFarmStats';
import { useAIAdvisor } from '../hooks/useAIAdvisor';
import { useWeather, deriveFarmingNotice } from '../hooks/useWeather';
import { saveDailyNote, savePlot, deletePlot } from '../utils/localStorage';
import {
    ScanLine, BookOpen, LogOut,
    ShieldCheck, ChevronRight, Calendar, TrendingUp,
    AlertTriangle, BarChart2, MapPin, FileText, Plus,
    Trash2, X, CheckCircle2, Leaf, BrainCircuit, Sparkles, CheckSquare,
    ShoppingBag, Info, Database, ChevronUp, ChevronDown,
    Cloud, Sun, CloudRain, CloudLightning, Snowflake, Droplets, Thermometer
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import AlertDetailModal from './AlertDetailModal';
import { supabase } from '../lib/supabase';

// ─── Helper: friendly relative date ─────────────────────────────────────────
const relDate = (ts, t) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts)) / 86400000);
    if (diff === 0) return t?.('profile.relToday') || 'Today';
    if (diff === 1) return t?.('profile.relYesterday') || 'Yesterday';
    return `${diff}${t?.('profile.relDaysAgo') || 'd ago'}`;
};

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

const ACTIVITY_BADGE_COLOR = {
    note:      { bg: '#f3f4f6', color: '#6b7280' },
    scout:     { bg: '#fee2e2', color: '#b91c1c' },
    spray:     { bg: '#fef9c3', color: '#b45309' },
    fertilize: { bg: '#d1fae5', color: '#065f46' },
    prune:     { bg: '#ede9fe', color: '#6d28d9' },
    inspect:   { bg: '#dbeafe', color: '#1d4ed8' },
    harvest:   { bg: '#f0fdf4', color: '#166534' },
    other:     { bg: '#f3f4f6', color: '#6b7280' },
};

const EMPTY_FORM = {
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

const UserDashboardPanel = () => {
    const { user, signOut } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { notify, notifyError, notifySuccess } = useNotifications();
    const { getLocation } = useLocation();

    const ACTIVITY_TYPES = useMemo(() => ACTIVITY_TYPES_CFG.map(a => ({
        ...a,
        label: t(`profile.${a.key}`) || a.label,
    })), [t]);

    // ── Custom hooks: all farm data + AI logic ────────────────────────────────
    const {
        stats, scanHistory, checklistPct, recentScans,
        alerts, logs, notes, setNotes, plots, setPlots,
        acknowledgedIds, setAcknowledgedIds,
        assessingRisk, predictiveRisk,
    } = useFarmStats({ userId: user?.id, getLocation, notify });

    const [noteForm, setNoteForm] = useState(EMPTY_FORM);
    const [addingNote, setAddingNote] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [addingPlot, setAddingPlot] = useState(false);
    const [plotForm, setPlotForm] = useState({ name: '', cropType: '', area: '', unit: 'acres', soil_ph: '', npk_n: '', npk_p: '', npk_k: '' });
    const [savingPlot, setSavingPlot] = useState(false);
    const [showSoilFields, setShowSoilFields] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [signingOut, setSigningOut] = useState(false);
    const [tab, setTab] = useState('overview');

    const {
        aiInsights, generatingInsights,
        enhancing,
        handleGenerateInsights, handleAutoEnhance,
    } = useAIAdvisor({ t, notes, plots, checklistPct, noteForm, setNoteForm, notifyError, notifySuccess });
    
    const { weatherTemp, weatherIcon, forecast, fetchWeather } = useWeather();
    
    // ── Initial Weather Fetch ────────────────────────────────────────────────
    useEffect(() => {
        getLocation().then(loc => loc && fetchWeather(loc.lat, loc.lng));
    }, [getLocation, fetchWeather]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const email = user?.email ?? '';
    const displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const activeAlertCount = alerts.filter(s => !acknowledgedIds.includes(s.id)).length;

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSignOut = async () => {
        setSigningOut(true);
        try { await signOut(); navigate('/'); } catch { setSigningOut(false); }
    };

    const handleAcknowledge = (scanId) => {
        setAcknowledgedIds([...acknowledgedIds, scanId]);
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteForm.note.trim() && !noteForm.chemical_name.trim()) return;
        setSavingNote(true);

        let photoUrl = null;
        if (noteForm.photo_base64) {
            if (user?.id && supabase) {
                try {
                    const base64 = noteForm.photo_base64.startsWith('data:')
                        ? noteForm.photo_base64.split(',')[1] : noteForm.photo_base64;
                    const byteChars = atob(base64);
                    const blob = new Blob([new Uint8Array(Array.from(byteChars, c => c.charCodeAt(0)))], { type: 'image/jpeg' });
                    const path = `${user.id}/note_${Date.now()}.jpg`;
                    const { error } = await supabase.storage.from('scan-images').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
                    if (!error) {
                        const { data } = supabase.storage.from('scan-images').getPublicUrl(path);
                        photoUrl = data.publicUrl;
                    } else { photoUrl = noteForm.photo_base64; }
                } catch { photoUrl = noteForm.photo_base64; }
            } else {
                photoUrl = noteForm.photo_base64;
            }
        }

        const saved = await saveDailyNote({
            ...noteForm,
            plot_id: noteForm.plot_id || null,
            chemical_name: noteForm.chemical_name || null,
            chemical_qty: noteForm.chemical_qty || null,
            application_timing: noteForm.application_timing || null,
            temperature_am: noteForm.temperature_am !== '' ? Number(noteForm.temperature_am) : null,
            humidity: noteForm.humidity !== '' ? Number(noteForm.humidity) : null,
            growth_stage: noteForm.growth_stage || null,
            pest_notes: noteForm.pest_notes || null,
            disease_incidence: noteForm.disease_incidence !== '' ? Number(noteForm.disease_incidence) : null,
            disease_name_observed: noteForm.disease_name_observed || null,
            scout_severity: noteForm.scout_severity || null,
            expense_amount: noteForm.expense_amount !== '' ? Number(noteForm.expense_amount) : null,
            expense_category: noteForm.expense_category || null,
            kg_harvested: noteForm.kg_harvested !== '' ? Number(noteForm.kg_harvested) : null,
            price_per_kg: noteForm.price_per_kg !== '' ? Number(noteForm.price_per_kg) : null,
            quality_grade: noteForm.quality_grade || null,
            buyer_name: noteForm.buyer_name || null,
            pruned_count: noteForm.pruned_count !== '' ? Number(noteForm.pruned_count) : null,
            pruning_type: noteForm.pruning_type || null,
            inspection_type: noteForm.inspection_type || null,
            inspection_status: noteForm.inspection_status || null,
            photo_url: photoUrl,
        }, user?.id ?? null);

        if (saved) {
            setNotes(prev => [saved, ...prev]);
            setNoteForm(EMPTY_FORM);
            setAddingNote(false);
            notifySuccess(t('common.savedSuccess') || 'Activity log saved!');
        } else {
            notifyError(t('error.saveFailed') || 'Failed to save. Storage may be full.');
        }
        setSavingNote(false);
    };

    const handleAddPlot = async (e) => {
        e.preventDefault();
        if (!plotForm.name.trim()) return;
        setSavingPlot(true);
        const saved = await savePlot({
            name: plotForm.name, cropType: plotForm.cropType,
            area: parseFloat(plotForm.area) || 0, unit: plotForm.unit,
            soil_ph: plotForm.soil_ph !== '' ? parseFloat(plotForm.soil_ph) : null,
            npk_n: plotForm.npk_n !== '' ? parseFloat(plotForm.npk_n) : null,
            npk_p: plotForm.npk_p !== '' ? parseFloat(plotForm.npk_p) : null,
            npk_k: plotForm.npk_k !== '' ? parseFloat(plotForm.npk_k) : null,
        }, user?.id ?? null);
        if (saved) {
            setPlots(prev => [saved, ...prev]);
            setPlotForm({ name: '', cropType: '', area: '', unit: 'acres', soil_ph: '', npk_n: '', npk_p: '', npk_k: '' });
            setShowSoilFields(false);
            setAddingPlot(false);
            notifySuccess(t('profile.plotSaved') || 'Plot added successfully!');
        }
        setSavingPlot(false);
    };

    // Replace window.confirm with toast-based confirmation
    const handleDeletePlot = (id) => {
        notify({
            type: 'error',
            message: t('profile.confirmDeletePlot') || 'Remove this plot?',
            actionLabel: t('common.confirm') || 'Remove',
            duration: 8000,
            action: async () => {
                const ok = await deletePlot(id, user?.id ?? null);
                if (ok) setPlots(prev => prev.filter(p => p.id !== id));
            },
        });
    };

    // ── Section header helper ─────────────────────────────────────────────────
    const SectionHeader = ({ icon, title, action }) => (
        <div className="udp-section-header">
            {icon && <span className="udp-sh-icon">{icon}</span>}
            <span className="udp-sh-title">{title}</span>
            {action && <span className="udp-sh-action">{action}</span>}
        </div>
    );

    // ── AI Insights card (shared between Overview + Reports) ──────────────────
    const AIInsightsCard = ({ activeAlerts, harvestLogs }) => (
        <div className="udp-section">
            <SectionHeader
                icon={<BrainCircuit size={15} color="#8b5cf6" />}
                title="AI Farm Intelligence"
                action={
                    <button
                        className="udp-see-all"
                        style={{ color: '#8b5cf6', background: '#f5f3ff', padding: '4px 10px', borderRadius: '12px' }}
                        onClick={() => handleGenerateInsights(activeAlerts, harvestLogs)}
                        disabled={generatingInsights}
                    >
                        {generatingInsights ? (t('common.analyzing') || 'Analyzing...') : <><Sparkles size={13} /> {t('profile.askAI') || 'Ask AI'}</>}
                    </button>
                }
            />
            <div style={{ padding: '0 16px 16px' }}>
                {generatingInsights ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px', color: '#8b5cf6' }}>
                        <BrainCircuit size={28} style={{ animation: 'pulse 1.5s infinite' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('profile.aiAnalyzingHint') || 'Analyzing logs & alerts...'}</span>
                    </div>
                ) : aiInsights ? (
                    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '16px' }}>
                        <p style={{ fontSize: '0.85rem', color: '#4c1d95', margin: '0 0 12px', lineHeight: 1.5 }}>
                            <strong>{t('profile.aiSummary') || 'Summary'}:</strong> {aiInsights.summary}
                        </p>
                        {aiInsights.yieldAnalysis && (
                            <p style={{ fontSize: '0.8rem', color: '#5b21b6', margin: '0 0 12px', borderLeft: '3px solid #8b5cf6', paddingLeft: '8px' }}>
                                {aiInsights.yieldAnalysis}
                            </p>
                        )}
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', marginBottom: '8px', textTransform: 'uppercase' }}>
                            {t('profile.aiRecommendations') || 'Actionable Recommendations'}:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#4c1d95', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {aiInsights.recommendations?.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>
                        {t('profile.aiAskHint') || 'Tap "Ask AI" to get a personalized weekly agronomist report.'}
                    </div>
                )}
            </div>
        </div>
    );

    // ── Overview Tab ──────────────────────────────────────────────────────────
    const OverviewTab = () => {
        const activeAlerts = alerts.filter(s => !acknowledgedIds.includes(s.id));
        const resolvedAlerts = alerts.filter(s => acknowledgedIds.includes(s.id));
        const harvestLogs = notes.filter(n => n.activity_type === 'harvest');

        const weekTrends = useMemo(() => {
            const now = Date.now();
            const oneWeek = 7 * 86400000;
            const twoWeeks = 14 * 86400000;
            const thisWeek = scanHistory.filter(s => new Date(s.timestamp ?? s.created_at).getTime() > now - oneWeek);
            const lastWeek = scanHistory.filter(s => {
                const ts = new Date(s.timestamp ?? s.created_at).getTime();
                return ts > now - twoWeeks && ts <= now - oneWeek;
            });
            const thisD = thisWeek.filter(s => s.healthStatus !== 'healthy').length;
            const lastD = lastWeek.filter(s => s.healthStatus !== 'healthy').length;
            return { diseaseDelta: thisD - lastD, scanDelta: thisWeek.length - lastWeek.length, lastT: lastWeek.length, lastD };
        }, []);

        const renderTrend = (delta, invert = false) => {
            if (delta === 0) return <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>→ {t('profile.trendSame') || 'Same'}</span>;
            const isGood = invert ? delta < 0 : delta > 0;
            return (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isGood ? '#10b981' : '#ef4444' }}>
                    {delta > 0 ? '↑' : '↓'} {Math.abs(delta)} {t('profile.vsLastWeek') || 'vs last wk'}
                </span>
            );
        };

        const trendData = useMemo(() => {
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                days.push({ date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), healthy: 0, diseased: 0, rawDate: d.toISOString().split('T')[0] });
            }
            alerts.forEach(scan => {
                const scanDate = (scan.timestamp || scan.created_at || '').split('T')[0];
                const dayMatch = days.find(d => d.rawDate === scanDate);
                if (dayMatch) { if (scan.healthStatus === 'healthy' || !scan.disease) dayMatch.healthy++; else dayMatch.diseased++; }
            });
            return days;
        }, []);

        const daysSinceScan = stats.lastScan ? Math.floor((Date.now() - new Date(stats.lastScan)) / 86400000) : Infinity;

        return (
            <>
                {daysSinceScan > 7 && (
                    <div className="udp-task-banner" onClick={() => navigate('/?scan=true')}>
                        <div className="udp-task-icon">📅</div>
                        <div className="udp-task-content">
                            <div className="udp-task-title">{t('profile.weeklyScanDue') || 'Weekly Scan Due'}</div>
                            <div className="udp-task-desc">{t('profile.scanReminderDesc') || 'Keep your farm intelligence accurate with a fresh scan.'}</div>
                        </div>
                        <ChevronRight size={16} />
                    </div>
                )}

                {(assessingRisk || predictiveRisk?.hasRisk) && (
                    <div className="udp-section" style={{ background: assessingRisk ? '#fefce8' : '#fef2f2', borderColor: assessingRisk ? '#fef08a' : '#fecaca', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        {assessingRisk
                            ? <BrainCircuit size={20} style={{ color: '#ca8a04', animation: 'pulse 1.5s infinite', marginTop: 2 }} />
                            : <AlertTriangle size={20} style={{ color: '#dc2626', marginTop: 2 }} />
                        }
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 4px', fontSize: '0.9rem', color: assessingRisk ? '#854d0e' : '#991b1b', fontWeight: 800 }}>
                                {assessingRisk ? (t('profile.analyzingRisk') || 'Analyzing Farm Risk Profile...') : (t('profile.riskActionRequired') || 'Action Required: Imminent Risk Detected')}
                            </h3>
                            {!assessingRisk && predictiveRisk && (
                                <>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.4 }}>{predictiveRisk.warningMessage}</p>
                                    <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '0.75rem', color: '#991b1b', fontWeight: 700, display: 'inline-block' }}>
                                        💡 {predictiveRisk.suggestedAction}
                                    </div>
                                    {predictiveRisk.recommendedTreatment && (
                                        <button
                                            style={{ marginTop: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            onClick={() => {
                                                const rec = predictiveRisk.recommendedTreatment;
                                                const validTypes = ['note', 'scout', 'spray', 'fertilize', 'prune', 'inspect', 'harvest', 'other'];
                                                setNoteForm(f => ({
                                                    ...EMPTY_FORM,
                                                    activity_type: validTypes.includes(rec.activity) ? rec.activity : 'spray',
                                                    chemical_name: (rec.chemical && rec.chemical !== 'null') ? rec.chemical : '',
                                                    note: `${t('profile.aiAutoPopulated') || '[AI]'} ${predictiveRisk.warningMessage}`,
                                                }));
                                                setAddingNote(true);
                                                setTab('notes');
                                            }}
                                        >
                                            <Sparkles size={14} /> {t('profile.logSuggestedTreatment') || 'Log Suggested Treatment'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Weather & Farming Notice Widgets ────────────────────────── */}
                {forecast && forecast.length > 0 && (
                    <div className="udp-section" style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', marginBottom: '16px' }}>
                        {/* Farming Notice Banner */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            border: '1px solid',
                            background: forecast[0].notice.status === 'good' ? '#f0fdf4' : forecast[0].notice.status === 'caution' ? '#fffbeb' : '#fef2f2',
                            borderColor: forecast[0].notice.status === 'good' ? '#bcf0da' : forecast[0].notice.status === 'caution' ? '#fde68a' : '#fecaca',
                            color: forecast[0].notice.status === 'good' ? '#166534' : forecast[0].notice.status === 'caution' ? '#92400e' : '#991b1b',
                        }}>
                            {forecast[0].notice.status === 'good' ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '2px' }}>
                                    {t('profile.farmingNotice') || 'Farming Notice'}
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t(forecast[0].notice.key)}</div>
                            </div>
                        </div>

                        {/* 5-Day Forecast Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', overflowX: 'auto', gap: '8px', paddingBottom: '4px' }}>
                            {forecast.map((day, i) => {
                                const IconComp = {
                                    'sun': Sun,
                                    'cloud-sun': Cloud,
                                    'cloud': Cloud,
                                    'cloud-rain': CloudRain,
                                    'snowflake': Snowflake,
                                    'cloud-lightning': CloudLightning,
                                }[day.icon] || Cloud;

                                return (
                                    <div key={day.date} style={{
                                        flex: '1 0 60px',
                                        textAlign: 'center',
                                        padding: '8px 4px',
                                        borderRadius: '8px',
                                        background: i === 0 ? '#f8fafc' : 'transparent',
                                        border: i === 0 ? '1px solid #e2e8f0' : '1px solid transparent',
                                    }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                                            {i === 0 ? t('profile.relToday') : new Date(day.date).toLocaleDateString(t('common.dateLocale') === 'zh-MY' ? 'zh-MY' : 'en-MY', { weekday: 'short' })}
                                        </div>
                                        <IconComp size={20} style={{ color: day.icon === 'sun' ? '#f59e0b' : '#3b82f6', marginBottom: '6px' }} />
                                        <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '4px' }}>{t(day.descKey)}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{Math.round(day.tempMax)}°</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', fontSize: '0.6rem', color: '#64748b', marginTop: '2px' }}>
                                            <Droplets size={8} /> {Math.round(day.precip)}mm
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="udp-stats-row">
                    <div className="udp-stat">
                        <span className="udp-stat-num">{stats.total}</span>
                        <span className="udp-stat-label">{t('profile.totalScans') || 'Scans'}</span>
                        {weekTrends.lastT > 0 && renderTrend(weekTrends.scanDelta)}
                    </div>
                    <div className="udp-stat-divider" />
                    <div className="udp-stat">
                        <span className="udp-stat-num udp-stat-warn">{stats.diseases}</span>
                        <span className="udp-stat-label">{t('profile.diseasesFound') || 'Diseases'}</span>
                        {weekTrends.lastD > 0 && renderTrend(weekTrends.diseaseDelta, true)}
                    </div>
                    <div className="udp-stat-divider" />
                    <div className="udp-stat">
                        <span className="udp-stat-num udp-stat-green">{checklistPct}%</span>
                        <span className="udp-stat-label">{t('profile.gapCompliance') || 'GAP'}</span>
                    </div>
                    <div className="udp-stat-divider" />
                    <div className="udp-stat">
                        <span className="udp-stat-num">{plots.length}</span>
                        <span className="udp-stat-label">{t('profile.plots') || 'Plots'}</span>
                    </div>
                </div>

                {stats.lastScan && (
                    <div className="udp-last-scan">
                        <Calendar size={13} />
                        <span>{t('profile.lastScan') || 'Last scan'}: <strong>{relDate(stats.lastScan, t)}</strong></span>
                    </div>
                )}

                <div className="udp-section" style={{ padding: '16px 16px 8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>{t('profile.scanTrendTitle') || 'Scan Activity (Last 7 Days)'}</div>
                    <div style={{ width: '100%', height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="healthy" name={t('profile.healthy') || 'Healthy'} stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="diseased" name={t('profile.diseased') || 'Diseased'} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <AIInsightsCard activeAlerts={activeAlerts} harvestLogs={harvestLogs} />

                {activeAlerts.length > 0 && (
                    <div className="udp-section udp-section-alert">
                        <SectionHeader icon={<AlertTriangle size={15} />} title={t('profile.alerts') || `Alerts (${activeAlerts.length})`} />
                        {activeAlerts.map(scan => (
                            <button key={scan.id} className="udp-alert-row" onClick={() => setSelectedAlert(scan)}>
                                <span className="udp-alert-dot" />
                                <div className="udp-scan-info">
                                    <span className="udp-scan-name">{scan.disease}</span>
                                    <span className="udp-scan-cat">{scan.category} · {(scan.severity ?? '').toUpperCase()} · {relDate(scan.timestamp ?? scan.created_at, t)}</span>
                                </div>
                                <span className="udp-alert-hint">{t('profile.tapToRespond') || 'Tap to respond'}</span>
                                <ChevronRight size={13} className="udp-chevron" />
                            </button>
                        ))}
                    </div>
                )}

                {resolvedAlerts.length > 0 && (
                    <div className="udp-section udp-section-resolved">
                        <SectionHeader icon={<CheckCircle2 size={15} />} title={t('profile.resolved') || 'Resolved'} />
                        {resolvedAlerts.map(scan => (
                            <button key={scan.id} className="udp-scan-row udp-row-resolved" onClick={() => navigate(`/results/${scan.id}`)}>
                                <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                                <div className="udp-scan-info">
                                    <span className="udp-scan-name udp-resolved-text">{scan.disease}</span>
                                    <span className="udp-scan-cat">{relDate(scan.timestamp ?? scan.created_at, t)}</span>
                                </div>
                                <ChevronRight size={13} className="udp-chevron" />
                            </button>
                        ))}
                    </div>
                )}

                {recentScans.length > 0 && (
                    <div className="udp-section">
                        <SectionHeader icon={<TrendingUp size={15} />} title={t('profile.recentActivity') || 'Recent Scans'} action={<button className="udp-see-all" onClick={() => navigate('/history')}>{t('common.seeAll') || 'See all'} <ChevronRight size={13} /></button>} />
                        {recentScans.map(scan => {
                            const thumbSrc = scan.image_url || scan.image || null;
                            return (
                                <button key={scan.id} className="udp-scan-row" onClick={() => navigate(`/results/${scan.id}`)}>
                                    {thumbSrc
                                        ? <img src={thumbSrc} alt="scan" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }} />
                                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: scan.healthStatus === 'healthy' ? '#d1fae5' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Leaf size={18} color={scan.healthStatus === 'healthy' ? '#059669' : '#d97706'} /></div>
                                    }
                                    <div className="udp-scan-info">
                                        <span className="udp-scan-name">{scan.disease || (t('results.healthy') || 'Healthy')}</span>
                                        <span className="udp-scan-cat">{scan.category || scan.plantType || ''} · {relDate(scan.timestamp ?? scan.created_at, t)}</span>
                                    </div>
                                    <ChevronRight size={13} className="udp-chevron" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {logs.length > 0 && (
                    <div className="udp-section">
                        <SectionHeader icon={<FileText size={15} />} title={t('profile.activityLog') || 'Activity Log'} action={<button className="udp-see-all" onClick={() => navigate('/mygap')}>{t('common.seeAll') || 'See all'} <ChevronRight size={13} /></button>} />
                        {logs.map(log => (
                            <div key={log.id} className="udp-log-row">
                                <CheckCircle2 size={14} className="udp-log-icon" />
                                <div className="udp-scan-info">
                                    <span className="udp-scan-name">{log.type}</span>
                                    <span className="udp-scan-cat">{log.notes?.slice(0, 60)}{log.notes?.length > 60 ? '…' : ''} · {relDate(log.timestamp ?? log.created_at, t)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="udp-section">
                    <SectionHeader title={t('profile.explore') || 'Explore'} />
                    <div className="udp-explore-grid">
                        {[
                            { icon: <ShoppingBag size={24} />, label: t('nav.shop') || 'Shop', to: '/shop' },
                            { icon: <CheckSquare size={24} />, label: t('home.mygapTitle') || 'myGAP', to: '/mygap' },
                            { icon: <Info size={24} />, label: t('home.keyInfo') || 'Crop Advisor', to: '/encyclopedia' },
                            { icon: <BookOpen size={24} />, label: t('settings.guide') || 'User Guide', to: '/guide' },
                        ].map(a => (
                            <button key={a.to} className="udp-explore-card" onClick={() => navigate(a.to)}>
                                <div className="udp-explore-icon">{a.icon}</div>
                                <span className="udp-explore-label">{a.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    // ── Reports Tab ───────────────────────────────────────────────────────────
    const ReportsTab = () => {
        const [selectedPlotId, setSelectedPlotId] = useState('all');
        const activeAlerts = alerts.filter(s => !acknowledgedIds.includes(s.id));
        const filteredNotes = selectedPlotId === 'all' ? notes : notes.filter(n => n.plot_id === selectedPlotId);
        const harvestLogs = filteredNotes.filter(n => n.activity_type === 'harvest');
        const totalKg = harvestLogs.reduce((s, n) => s + (Number(n.kg_harvested) || 0), 0);
        const totalRevenue = harvestLogs.reduce((s, n) => s + (Number(n.kg_harvested) || 0) * (Number(n.price_per_kg) || 0), 0);
        const totalExpenses = filteredNotes.reduce((s, n) => s + (Number(n.expense_amount) || 0), 0);
        const netProfit = totalRevenue - totalExpenses;
        const healthRate = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;
        const healthData = [
            { name: t('results.healthy') || 'Healthy', value: stats.healthy, color: '#10b981' },
            { name: t('profile.diseased') || 'Diseased', value: stats.diseases, color: '#f59e0b' },
        ].filter(d => d.value > 0);

        const expenseCounts = {};
        filteredNotes.forEach(n => {
            if (n.expense_amount) { const cat = n.expense_category || 'Other'; expenseCounts[cat] = (expenseCounts[cat] || 0) + Number(n.expense_amount); }
        });
        const expenseData = Object.keys(expenseCounts).map(k => ({
            name: k, value: expenseCounts[k],
            fill: k === 'Fertilizer' ? '#10b981' : k === 'Pesticide' ? '#f59e0b' : k === 'Labor' ? '#3b82f6' : k === 'Equipment' ? '#8b5cf6' : '#64748b',
        })).sort((a, b) => b.value - a.value);

        const yieldChartData = useMemo(() => {
            const byMonth = {};
            notes.filter(n => n.activity_type === 'harvest').forEach(n => {
                const d = new Date(n.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                if (!byMonth[key]) byMonth[key] = { month: label, kg: 0 };
                byMonth[key].kg += Number(n.kg_harvested) || 0;
            });
            const sorted = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
            if (sorted.length < 2) return { data: sorted, forecast: null };
            const n = sorted.length;
            const sumX = sorted.reduce((s, _, i) => s + i, 0);
            const sumY = sorted.reduce((s, d) => s + d.kg, 0);
            const sumXY = sorted.reduce((s, d, i) => s + i * d.kg, 0);
            const sumX2 = sorted.reduce((s, _, i) => s + i * i, 0);
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
            const forecastKg = Math.max(0, Math.round(slope * n + (sumY - slope * sumX) / n));
            const nextDate = new Date(); nextDate.setMonth(nextDate.getMonth() + 1);
            return { data: [...sorted, { month: nextDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), kg: null, forecast: forecastKg }], forecast: forecastKg };
        }, []);

        return (
            <div className="udp-reports">
                <div className="udp-report-grid">
                    <div className="udp-report-card"><span className="udp-report-num udp-stat-green">{healthRate}%</span><span className="udp-report-label">{t('profile.healthRate') || 'Health Rate'}</span></div>
                    <div className="udp-report-card"><span className="udp-report-num udp-stat-warn">{stats.diseases}</span><span className="udp-report-label">{t('profile.diseasesFound') || 'Diseases'}</span></div>
                    <div className="udp-report-card"><span className="udp-report-num">{stats.total}</span><span className="udp-report-label">{t('profile.totalScans') || 'Total Scans'}</span></div>
                    <div className="udp-report-card"><span className="udp-report-num udp-stat-green">{checklistPct}%</span><span className="udp-report-label">{t('profile.gapCompliance') || 'GAP'}</span></div>
                </div>

                <div className="udp-section">
                    <SectionHeader icon={<BarChart2 size={15} />} title={t('profile.healthBreakdown') || 'Health Breakdown'} />
                    <div style={{ padding: '0 16px 16px' }}>
                        {healthData.length > 0 ? (
                            <div style={{ width: '100%', height: 180 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={healthData} innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {healthData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <span style={{ color: '#10b981' }}>● {t('profile.healthy') || 'Healthy'}: {stats.healthy}</span>
                                    <span style={{ color: '#f59e0b' }}>● {t('profile.diseased') || 'Diseased'}: {stats.diseases}</span>
                                </div>
                            </div>
                        ) : <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>{t('profile.noScanData') || 'No scan data yet'}</div>}
                    </div>
                </div>

                <div className="udp-section">
                    <SectionHeader icon={<TrendingUp size={15} />} title={t('profile.harvestSummary') || 'Financial & Yield Summary'}
                        action={<select className="udp-input" style={{ width: 130, padding: 4, height: 26, fontSize: '0.75rem', borderRadius: 6 }} value={selectedPlotId} onChange={e => setSelectedPlotId(e.target.value)}>
                            <option value="all">All Plots</option>
                            {plots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>}
                    />
                    <div style={{ padding: '0 16px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            {[{ label: t('profile.totalYield') || 'Yield', val: `${totalKg.toFixed(1)}kg`, c: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
                              { label: t('profile.estRevenue') || 'Revenue', val: `RM${totalRevenue.toFixed(0)}`, c: '#059669', bg: '#f8fafc', border: '#e2e8f0' },
                              { label: t('profile.expenses') || 'Expenses', val: `-RM${totalExpenses.toFixed(0)}`, c: '#e11d48', bg: '#fff1f2', border: '#ffe4e6' }].map(item => (
                                <div key={item.label} style={{ flex: 1, background: item.bg, padding: '12px', borderRadius: '8px', border: `1px solid ${item.border}`, textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
                                    <div style={{ fontSize: '1.2rem', color: item.c, fontWeight: 800 }}>{item.val}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: netProfit >= 0 ? '#ecfdf5' : '#fef2f2', padding: '16px', borderRadius: '8px', border: `1px solid ${netProfit >= 0 ? '#a7f3d0' : '#fecaca'}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: netProfit >= 0 ? '#065f46' : '#991b1b', textTransform: 'uppercase' }}>{t('profile.netProfit') || 'Net Profit'}</span>
                            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: netProfit >= 0 ? '#059669' : '#e11d48' }}>{netProfit >= 0 ? '+' : '-'}RM{Math.abs(netProfit).toFixed(2)}</span>
                        </div>

                        {yieldChartData.data.length >= 2 && (
                            <div style={{ marginBottom: '16px' }}>
                                {yieldChartData.forecast !== null && (
                                    <div style={{ background: 'linear-gradient(90deg,#eff6ff,#f0fdf4)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '1.1rem' }}>📊</span>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 700 }}>{t('profile.aiForecastNextMonth') || 'AI Forecast: Next Month'}</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>~{yieldChartData.forecast} kg</div>
                                        </div>
                                        <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6b7280' }}>{t('profile.basedOnHarvestTrends') || 'Based on trends'}</div>
                                    </div>
                                )}
                                <div style={{ width: '100%', height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={yieldChartData.data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Line type="monotone" dataKey="kg" name={t('profile.actual') || 'Actual'} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                                            <Line type="monotone" dataKey="forecast" name={t('profile.forecast') || 'Forecast'} stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 5, fill: '#3b82f6' }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {expenseData.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>{t('profile.expenseBreakdown') || 'Expense Breakdown'}</div>
                                <div style={{ width: '100%', height: 150 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={expenseData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                                                {expenseData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                            </Pie>
                                            <RechartsTooltip formatter={v => `RM${v}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: 600, marginTop: '4px' }}>
                                    {expenseData.map(d => <span key={d.name} style={{ color: d.fill }}>● {d.name}: RM{d.value}</span>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <AIInsightsCard activeAlerts={activeAlerts} harvestLogs={harvestLogs} />
            </div>
        );
    };

    // ── Plots Tab ─────────────────────────────────────────────────────────────
    const PlotsTab = () => (
        <div>
            <div className="udp-tab-actions">
                <button className="udp-add-btn" onClick={() => setAddingPlot(v => !v)}>
                    {addingPlot ? <X size={16} /> : <Plus size={16} />}
                    {addingPlot ? (t('common.cancel') || 'Cancel') : (t('profile.addPlot') || 'Add Plot')}
                </button>
            </div>
            {addingPlot && (
                <form className="udp-inline-form" onSubmit={handleAddPlot}>
                    <div><label className="udp-form-label">{t('profile.plotName') || 'Plot / Farm Name'} <span className="udp-form-required">*</span></label>
                        <input className="udp-input" placeholder="e.g. Block A or Durian Grove" value={plotForm.name} onChange={e => setPlotForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div><label className="udp-form-label">{t('profile.cropType') || 'Crop Type'}</label>
                        <input className="udp-input" placeholder="e.g. Durian (Musang King)" value={plotForm.cropType} onChange={e => setPlotForm(p => ({ ...p, cropType: e.target.value }))} />
                    </div>
                    <div className="udp-form-grid">
                        <div><label className="udp-form-label">{t('profile.area') || 'Land Area'}</label>
                            <input className="udp-input" type="number" min="0" step="0.1" placeholder="e.g. 5.0" value={plotForm.area} onChange={e => setPlotForm(p => ({ ...p, area: e.target.value }))} />
                        </div>
                        <div><label className="udp-form-label">{t('profile.unit') || 'Unit'}</label>
                            <select className="udp-input" value={plotForm.unit} onChange={e => setPlotForm(p => ({ ...p, unit: e.target.value }))}>
                                <option value="acres">{t('profile.acres') || 'acres'}</option>
                                <option value="hectares">{t('profile.hectares') || 'hectares'}</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <button type="button" onClick={() => setShowSoilFields(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '0.8rem', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Database size={14} color="#64748b" />{t('profile.advancedSoilData') || 'Soil Data'} (pH / NPK)</span>
                            {showSoilFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {showSoilFields && (
                            <div className="udp-form-grid" style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                {[['soil_ph', 'pH Level', '6.5', 0, 14], ['npk_n', 'N (kg/ha)', 'Nitrogen', 0, null], ['npk_p', 'P (kg/ha)', 'Phosphorus', 0, null], ['npk_k', 'K (kg/ha)', 'Potassium', 0, null]].map(([key, label, ph, min, max]) => (
                                    <div key={key}><label className="udp-form-label">{label}</label>
                                        <input className="udp-input" type="number" min={min} max={max ?? undefined} step="0.1" placeholder={ph} value={plotForm[key]} onChange={e => setPlotForm(p => ({ ...p, [key]: e.target.value }))} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button type="submit" className="udp-submit-btn" disabled={savingPlot} style={{ marginTop: '16px' }}>{savingPlot ? '…' : (t('common.save') || 'Save Plot')}</button>
                </form>
            )}
            {plots.length === 0 && !addingPlot && <div className="udp-empty"><MapPin size={32} /><p>{t('profile.noPlots') || 'No plots yet.'}</p></div>}
            {plots.map(plot => (
                <div key={plot.id} className="udp-plot-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12 }}>
                        <div className="udp-plot-icon"><Leaf size={18} /></div>
                        <div className="udp-plot-info" style={{ flex: 1 }}>
                            <span className="udp-plot-name">{plot.name}</span>
                            <span className="udp-plot-meta">{plot.crop_type || '—'} · {plot.area} {plot.unit}</span>
                        </div>
                        <button className="udp-delete-btn" onClick={() => handleDeletePlot(plot.id)} title="Remove"><Trash2 size={15} /></button>
                    </div>
                    {(plot.soil_ph != null || plot.npk_n != null) && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 4 }}>
                            {plot.soil_ph != null && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: plot.soil_ph < 5.5 || plot.soil_ph > 7.5 ? '#fef3c7' : '#d1fae5', color: plot.soil_ph < 5.5 || plot.soil_ph > 7.5 ? '#d97706' : '#065f46', padding: '2px 8px', borderRadius: 20 }}>pH {plot.soil_ph} {plot.soil_ph < 5.5 ? 'Acidic' : plot.soil_ph > 7.5 ? 'Alkaline' : 'Optimal'}</span>}
                            {plot.npk_n != null && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20 }}>N: {plot.npk_n}</span>}
                            {plot.npk_p != null && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#fdf4ff', color: '#7e22ce', padding: '2px 8px', borderRadius: 20 }}>P: {plot.npk_p}</span>}
                            {plot.npk_k != null && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: 20 }}>K: {plot.npk_k}</span>}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    // ── Notes Tab ─────────────────────────────────────────────────────────────
    const currentType = ACTIVITY_TYPES.find(a => a.value === noteForm.activity_type) ?? ACTIVITY_TYPES[0];
    const showChemical = currentType.chemical;

    const NotesTab = () => (
        <div>
            <div className="udp-tab-actions">
                <button className="udp-add-btn" onClick={() => setAddingNote(v => !v)}>
                    {addingNote ? <X size={16} /> : <Plus size={16} />}
                    {addingNote ? (t('common.cancel') || 'Cancel') : (t('profile.addNote') || 'Add Log Entry')}
                </button>
            </div>
            {addingNote && (
                <form className="udp-inline-form" onSubmit={handleAddNote}>
                    {/* Form Fields */}

                    <div>
                        <label className="udp-form-label">{t('profile.activityType') || 'Activity Type'}</label>
                        <div className="udp-activity-grid">
                            {ACTIVITY_TYPES.map(a => (
                                <button key={a.value} type="button" className={`udp-activity-chip ${noteForm.activity_type === a.value ? 'active' : ''}`}
                                    onClick={() => setNoteForm(f => ({ ...f, activity_type: a.value, expense_category: a.value === 'fertilize' ? 'Fertilizer' : a.value === 'spray' ? 'Pesticide' : ['prune','inspect','scout'].includes(a.value) ? 'Labor' : f.expense_category }))}>
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {plots.length > 0 && (
                        <div><label className="udp-form-label">{t('profile.plot') || 'Plot / Farm'}</label>
                            <select className="udp-input" value={noteForm.plot_id} onChange={e => setNoteForm(f => ({ ...f, plot_id: e.target.value }))}>
                                <option value="">{t('profile.selectPlot') || 'Select plot (optional)'}</option>
                                {plots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}

                    {showChemical && (<>
                        <div><label className="udp-form-label">{t('profile.chemicalName') || 'Product Name'} <span className="udp-form-required">*</span></label>
                            <input className="udp-input" placeholder="e.g. Mancozeb 80% WP" value={noteForm.chemical_name} onChange={e => setNoteForm(f => ({ ...f, chemical_name: e.target.value }))} />
                        </div>
                        <div className="udp-form-row">
                            <div style={{ flex: 1 }}><label className="udp-form-label">{t('profile.quantity') || 'Qty Applied'}</label>
                                <input className="udp-input" placeholder="e.g. 200ml / 15L" value={noteForm.chemical_qty} onChange={e => setNoteForm(f => ({ ...f, chemical_qty: e.target.value }))} />
                            </div>
                            <div><label className="udp-form-label">{t('profile.timing') || 'Timing'}</label>
                                <div className="udp-timing-toggle">
                                    {['AM', 'PM', 'Both'].map(v => <button key={v} type="button" className={`udp-timing-btn ${noteForm.application_timing === v ? 'active' : ''}`} onClick={() => setNoteForm(f => ({ ...f, application_timing: v }))}>{v}</button>)}
                                </div>
                            </div>
                        </div>
                    </>)}

                    {noteForm.activity_type === 'scout' && (<>
                        <div><label className="udp-form-label">{t('profile.growthStage') || 'Growth Stage'}</label>
                            <select className="udp-input" value={noteForm.growth_stage} onChange={e => setNoteForm(f => ({ ...f, growth_stage: e.target.value }))}>
                                {['Seedling','Vegetative','Flowering','Fruiting','Harvest'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="udp-form-row">
                            <div style={{ flex: 1 }}><label className="udp-form-label">Incidence (%)</label>
                                <input className="udp-input" type="number" min="0" max="100" placeholder="e.g. 15" value={noteForm.disease_incidence} onChange={e => setNoteForm(f => ({ ...f, disease_incidence: e.target.value }))} />
                            </div>
                            <div style={{ flex: 1 }}><label className="udp-form-label">Severity</label>
                                <select className="udp-input" value={noteForm.scout_severity} onChange={e => setNoteForm(f => ({ ...f, scout_severity: e.target.value }))}>
                                    <option>Low</option><option>Moderate</option><option>High</option>
                                </select>
                            </div>
                        </div>
                        <div><label className="udp-form-label">Disease / Pest <span className="udp-form-required">*</span></label>
                            <input className="udp-input" placeholder="e.g. Aphids or Powdery Mildew" value={noteForm.disease_name_observed} onChange={e => setNoteForm(f => ({ ...f, disease_name_observed: e.target.value }))} />
                        </div>
                    </>)}

                    {noteForm.activity_type === 'prune' && (
                        <div className="udp-form-row">
                            <div style={{ flex: 1 }}><label className="udp-form-label">Trees Pruned</label>
                                <input className="udp-input" type="number" min="0" placeholder="e.g. 10" value={noteForm.pruned_count} onChange={e => setNoteForm(f => ({ ...f, pruned_count: e.target.value }))} />
                            </div>
                            <div style={{ flex: 1 }}><label className="udp-form-label">Pruning Type</label>
                                <select className="udp-input" value={noteForm.pruning_type} onChange={e => setNoteForm(f => ({ ...f, pruning_type: e.target.value }))}>
                                    {['Thinning','Structural','Deadwood','Others'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {noteForm.activity_type === 'inspect' && (
                        <div className="udp-form-row">
                            <div style={{ flex: 1 }}><label className="udp-form-label">Inspection Type</label>
                                <select className="udp-input" value={noteForm.inspection_type} onChange={e => setNoteForm(f => ({ ...f, inspection_type: e.target.value }))}>
                                    {['Pest/Disease','Soil/Nutrient','Irrigation','Infrastructure'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}><label className="udp-form-label">Status</label>
                                <select className="udp-input" value={noteForm.inspection_status} onChange={e => setNoteForm(f => ({ ...f, inspection_status: e.target.value }))}>
                                    <option value="Good">Good / Pass</option>
                                    <option value="Action Required">Action Required</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {noteForm.activity_type === 'harvest' && (<>
                        <div className="udp-form-row">
                            <div style={{ flex: 1 }}><label className="udp-form-label">Yield (kg) <span className="udp-form-required">*</span></label>
                                <input className="udp-input" type="number" min="0" step="0.1" placeholder="e.g. 50" value={noteForm.kg_harvested} onChange={e => setNoteForm(f => ({ ...f, kg_harvested: e.target.value }))} />
                            </div>
                            <div style={{ flex: 1 }}><label className="udp-form-label">Quality Grade</label>
                                <select className="udp-input" value={noteForm.quality_grade} onChange={e => setNoteForm(f => ({ ...f, quality_grade: e.target.value }))}>
                                    {['Excellent','Good','Fair','Poor'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="udp-form-row">
                            <div style={{ flex: 1 }}><label className="udp-form-label">Price/kg (RM)</label>
                                <input className="udp-input" type="number" min="0" step="0.01" placeholder="e.g. 8.50" value={noteForm.price_per_kg} onChange={e => setNoteForm(f => ({ ...f, price_per_kg: e.target.value }))} />
                            </div>
                            <div style={{ flex: 1 }}><label className="udp-form-label">Buyer</label>
                                <input className="udp-input" placeholder="e.g. Ah Chong" value={noteForm.buyer_name} onChange={e => setNoteForm(f => ({ ...f, buyer_name: e.target.value }))} />
                            </div>
                        </div>
                        {(noteForm.kg_harvested && noteForm.price_per_kg) && (
                            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #dcfce7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>{t('profile.estRevenue') || 'Est. Revenue'}</span>
                                <span style={{ fontSize: '1rem', color: '#15803d', fontWeight: 800 }}>RM {(Number(noteForm.kg_harvested) * Number(noteForm.price_per_kg)).toFixed(2)}</span>
                            </div>
                        )}
                    </>)}

                    <div className="udp-form-grid">
                        <div><label className="udp-form-label">Temp (°C)</label>
                            <input type="number" min="0" max="50" step="0.1" className="udp-input" placeholder="e.g. 28" value={noteForm.temperature_am} onChange={e => setNoteForm(f => ({ ...f, temperature_am: e.target.value }))} />
                        </div>
                        <div><label className="udp-form-label">Humidity (%)</label>
                            <input type="number" min="0" max="100" className="udp-input" placeholder="e.g. 75" value={noteForm.humidity} onChange={e => setNoteForm(f => ({ ...f, humidity: e.target.value }))} />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label className="udp-form-label" style={{ marginBottom: 0 }}>{t('profile.notes') || 'Notes'}</label>
                            <button type="button" onClick={() => handleAutoEnhance()} disabled={enhancing || !noteForm.note.trim()} style={{ background: 'none', border: 'none', color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: (enhancing || !noteForm.note.trim()) ? 0.4 : 1 }}>
                                <Sparkles size={12} />{enhancing ? '…' : (t('form.magicEnhance') || 'Magic Enhance')}
                            </button>
                        </div>
                        <textarea className="udp-input" rows={3} placeholder={t('profile.notePlaceholder') || 'Additional observations…'} value={noteForm.note} onChange={e => setNoteForm(f => ({ ...f, note: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>

                    {noteForm.activity_type !== 'harvest' && (
                        <div className="udp-form-grid">
                            <div><label className="udp-form-label">Expense Category</label>
                                <select className="udp-input" value={noteForm.expense_category} onChange={e => setNoteForm(f => ({ ...f, expense_category: e.target.value }))}>
                                    {['Fertilizer','Pesticide','Labor','Equipment','Other'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div><label className="udp-form-label">Cost (RM)</label>
                                <input className="udp-input" type="number" min="0" step="0.01" placeholder="e.g. 50" value={noteForm.expense_amount} onChange={e => setNoteForm(f => ({ ...f, expense_amount: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="udp-form-label">{t('profile.photoAttachment') || 'Photo'} <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional)</span></label>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '16px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }} className="udp-photo-upload-label">
                                <Plus size={18} />{noteForm.photo_base64 ? 'Change Photo' : 'Take / Upload Photo'}
                                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = ev => setNoteForm(f => ({ ...f, photo_base64: ev.target.result })); r.readAsDataURL(file); }} />
                            </label>
                            {noteForm.photo_base64 && (
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <img src={noteForm.photo_base64} alt="preview" style={{ width: 70, height: 70, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                                    <button type="button" onClick={() => setNoteForm(f => ({ ...f, photo_base64: '' }))} style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <button type="submit" className="udp-submit-btn" disabled={savingNote}>{savingNote ? '…' : (t('common.save') || 'Save Entry')}</button>
                </form>
            )}

            {notes.length === 0 && !addingNote && <div className="udp-empty"><FileText size={32} /><p>{t('profile.noNotes') || 'No log entries yet.'}</p></div>}

            {notes.map(note => {
                const badgeCfg = ACTIVITY_BADGE_COLOR[note.activity_type] ?? ACTIVITY_BADGE_COLOR.note;
                const typeLabel = ACTIVITY_TYPES.find(a => a.value === note.activity_type)?.label ?? 'Note';
                const plotName = plots.find(p => p.id === note.plot_id)?.name;
                return (
                    <div key={note.id} className="udp-note-card">
                        <div className="udp-note-top">
                            <span className="udp-note-badge" style={{ background: badgeCfg.bg, color: badgeCfg.color }}>{typeLabel}</span>
                            {plotName && <span className="udp-note-plot">📍 {plotName}</span>}
                            <span className="udp-note-date">{relDate(note.created_at, t)}</span>
                        </div>
                        {note.chemical_name && <div className="udp-note-chem">🧪 <strong>{note.chemical_name}</strong>{note.chemical_qty && <> · {note.chemical_qty}</>}{note.application_timing && <> · {note.application_timing}</>}</div>}
                        {note.activity_type === 'scout' && (
                            <div className="udp-note-chem">
                                🔍 <strong>{note.disease_name_observed || 'Field Check'}</strong>{note.growth_stage && <> · {note.growth_stage}</>}{note.disease_incidence != null && <> · {note.disease_incidence}% Incidence</>}
                                <br /><span style={{ color: note.scout_severity === 'High' ? '#ef4444' : note.scout_severity === 'Moderate' ? '#f59e0b' : '#374151', fontSize: '0.75rem', fontWeight: 600 }}>Severity: {note.scout_severity || 'Low'}</span>
                            </div>
                        )}
                        {note.activity_type === 'harvest' && (
                            <div className="udp-note-chem">
                                🍎 <strong>{note.kg_harvested} kg</strong> ({note.quality_grade || 'Unrated'}){note.price_per_kg != null && <> · RM{Number(note.price_per_kg).toFixed(2)}/kg</>}{note.buyer_name && <> · {note.buyer_name}</>}
                                {(note.kg_harvested != null && note.price_per_kg != null) && <div style={{ color: '#059669', fontWeight: 600 }}>💰 +RM{(note.kg_harvested * note.price_per_kg).toFixed(2)}</div>}
                            </div>
                        )}
                        {(note.expense_amount != null && note.expense_amount !== '') && <div className="udp-note-chem" style={{ color: '#dc2626', fontWeight: 600 }}>💸 -RM{Number(note.expense_amount).toFixed(2)}{note.expense_category && <span style={{ color: '#ef4444', fontWeight: 400 }}> ({note.expense_category})</span>}</div>}
                        {(note.temperature_am != null || note.humidity != null) && <div className="udp-note-env">{note.temperature_am != null && <span>🌡 {note.temperature_am}°C</span>}{note.humidity != null && <span>💧 {note.humidity}% RH</span>}</div>}
                        {note.note && <p className="udp-note-text">{note.note}</p>}
                        {note.photo_url && <img src={note.photo_url} alt="Field photo" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginTop: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => window.open(note.photo_url, '_blank')} />}
                    </div>
                );
            })}

            <style>{`
                .udp-form-label { display: block; font-size: 0.78rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
                .udp-form-required { color: #ef4444; }
                .udp-form-row { display: flex; gap: 12px; align-items: flex-start; }
                .udp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .udp-activity-grid { display: flex; flex-wrap: wrap; gap: 8px; }
                .udp-activity-chip { padding: 8px 16px; border-radius: 999px; border: 1.5px solid #e2e8f0; background: white; font-size: 0.8rem; font-weight: 500; color: #64748b; cursor: pointer; transition: all 0.2s; }
                .udp-activity-chip.active { border-color: #00B14F; background: #00B14F; color: white; box-shadow: 0 4px 6px rgba(0,177,79,0.2); }
                .udp-activity-chip:hover:not(.active) { border-color: #cbd5e1; background: #f8fafc; }
                .udp-timing-toggle { display: flex; border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                .udp-timing-btn { flex: 1; padding: 10px 12px; border: none; border-right: 1px solid #e2e8f0; background: white; font-size: 0.8rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
                .udp-timing-btn:last-child { border-right: none; }
                .udp-timing-btn.active { background: #f1f8f1; color: #008C3E; }
                .udp-photo-upload-label:hover { border-color: #94a3b8 !important; background: #f1f5f9 !important; }
                .udp-note-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                .udp-note-card:last-child { margin-bottom: 0; }
                .udp-note-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
                .udp-note-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
                .udp-note-plot { font-size: 0.75rem; color: #64748b; font-weight: 500; }
                .udp-note-date { margin-left: auto; font-size: 0.72rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; white-space: nowrap; }
                .udp-note-chem { font-size: 0.85rem; color: #1e293b; line-height: 1.4; }
                .udp-note-chem strong { color: #0f172a; }
                .udp-note-env { display: flex; gap: 12px; font-size: 0.78rem; color: #64748b; }
                .udp-note-text { margin: 6px 0 0; font-size: 0.9rem; color: #334155; line-height: 1.6; white-space: pre-wrap; }
            `}</style>
        </div>
    );

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const TABS = [
        { id: 'overview', label: t('profile.tabOverview') || 'Overview' },
        { id: 'reports',  label: t('profile.tabReports')  || 'Reports'  },
        { id: 'plots',    label: t('profile.tabPlots')    || 'Plots'    },
        { id: 'notes',    label: t('profile.tabNotes')    || 'Daily Log' },
    ];

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="udp-container">
            {/* Enhanced Profile Card */}
            <div className="udp-profile-card">
                <div className="udp-profile-blob udp-profile-blob-1" />
                <div className="udp-profile-blob udp-profile-blob-2" />
                <div className="udp-profile-top-row">
                    <div className="udp-avatar-wrapper">
                        <div className="udp-avatar-ring" />
                        <div className="udp-avatar">{initials}</div>
                        <span className="udp-avatar-status" title="Online" />
                    </div>
                    <button className="udp-signout-mini" onClick={handleSignOut} disabled={signingOut} title="Sign out"><LogOut size={15} /></button>
                </div>
                <div className="udp-profile-identity">
                    <h2 className="udp-display-name">{displayName}</h2>
                    <p className="udp-email"><span className="udp-email-dot" />{email}</p>
                </div>
                <div className="udp-profile-badges">
                    <span className="udp-badge udp-badge-verified"><ShieldCheck size={11} />{t('profile.verifiedFarmer') || 'Verified Farmer'}</span>
                    {stats.total > 0 && <span className="udp-badge udp-badge-scans"><ScanLine size={11} />{stats.total} {t('profile.totalScans') || 'Scans'}</span>}
                    {checklistPct >= 50 && <span className="udp-badge udp-badge-gap"><ShieldCheck size={11} />GAP {checklistPct}%</span>}
                </div>
                <div className="udp-profile-strip">
                    <div className="udp-strip-item"><span className="udp-strip-num">{stats.healthy}</span><span className="udp-strip-label">{t('profile.healthy') || 'Healthy'}</span></div>
                    <div className="udp-strip-divider" />
                    <div className="udp-strip-item"><span className="udp-strip-num udp-strip-warn">{stats.diseases}</span><span className="udp-strip-label">{t('profile.diseased') || 'Issues'}</span></div>
                    <div className="udp-strip-divider" />
                    <div className="udp-strip-item"><span className="udp-strip-num">{plots.length}</span><span className="udp-strip-label">{t('profile.plots') || 'Plots'}</span></div>
                    <div className="udp-strip-divider" />
                    <div className="udp-strip-item"><span className="udp-strip-num udp-strip-purple">{notes.length}</span><span className="udp-strip-label">{t('profile.tabNotes') || 'Logs'}</span></div>
                </div>
            </div>

            <div className="udp-tabs">
                {TABS.map(t2 => (
                    <button key={t2.id} className={`udp-tab ${tab === t2.id ? 'active' : ''}`} onClick={() => setTab(t2.id)}>
                        {t2.label}
                        {t2.id === 'overview' && activeAlertCount > 0 && <span className="udp-tab-badge">{activeAlertCount}</span>}
                    </button>
                ))}
            </div>

            <div className="udp-tab-content">
                {tab === 'overview' && <OverviewTab />}
                {tab === 'reports'  && <ReportsTab />}
                {tab === 'plots'    && <PlotsTab />}
                {tab === 'notes'    && <NotesTab />}
            </div>

            {selectedAlert && <AlertDetailModal scan={selectedAlert} onClose={() => setSelectedAlert(null)} onAcknowledge={handleAcknowledge} />}

            <style>{`
                .udp-container { max-width: 480px; margin: 0 auto; padding: 16px 16px 60px; display: flex; flex-direction: column; gap: 16px; }
                .udp-profile-card { position: relative; overflow: hidden; background: linear-gradient(145deg,#f0fdf4,#dcfce7 55%,#bbf7d0); border: 1.5px solid #86efac; border-radius: 24px; padding: 20px 20px 0; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 4px 20px rgba(0,177,79,0.12),0 1px 4px rgba(0,0,0,0.04); }
                .udp-profile-blob { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; }
                .udp-profile-blob-1 { width: 140px; height: 140px; background: radial-gradient(circle,rgba(0,177,79,0.15),transparent 70%); top: -40px; right: -30px; }
                .udp-profile-blob-2 { width: 90px; height: 90px; background: radial-gradient(circle,rgba(34,197,94,0.12),transparent 70%); bottom: 30px; left: -20px; }
                .udp-profile-top-row { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; }
                .udp-avatar-wrapper { position: relative; flex-shrink: 0; }
                .udp-avatar-ring { position: absolute; inset: -3px; border-radius: 50%; border: 2.5px solid transparent; background: linear-gradient(135deg,#00B14F,#4ade80,#00B14F) border-box; -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0); -webkit-mask-composite: destination-out; mask-composite: exclude; animation: ring-spin 4s linear infinite; }
                @keyframes ring-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
                .udp-avatar { position: relative; z-index: 1; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg,#00B14F,#059669); color: white; font-size: 1.45rem; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(0,177,79,0.35); letter-spacing: -0.5px; }
                .udp-avatar-status { position: absolute; bottom: 3px; right: 3px; z-index: 2; width: 12px; height: 12px; border-radius: 50%; background: #22c55e; border: 2px solid white; animation: status-pulse 2.5s ease-in-out infinite; }
                @keyframes status-pulse { 0%,100%{box-shadow:0 0 0 2px rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 5px rgba(34,197,94,0)} }
                .udp-profile-identity { position: relative; z-index: 1; }
                .udp-display-name { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .udp-email { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #475569; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .udp-email-dot { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: #00B14F; }
                .udp-profile-badges { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; }
                .udp-badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 3px 10px; font-size: 0.68rem; font-weight: 700; }
                .udp-badge-verified { background: white; color: #00B14F; border: 1.5px solid #86efac; }
                .udp-badge-scans { background: #eff6ff; color: #1d4ed8; border: 1.5px solid #bfdbfe; }
                .udp-badge-gap { background: #fef3c7; color: #b45309; border: 1.5px solid #fde68a; }
                .udp-profile-strip { position: relative; z-index: 1; display: flex; align-items: center; background: rgba(255,255,255,0.7); backdrop-filter: blur(8px); border-top: 1px solid rgba(255,255,255,0.9); border-radius: 0 0 20px 20px; margin: 0 -20px; padding: 12px 20px; }
                .udp-strip-item { flex: 1; text-align: center; display: flex; flex-direction: column; gap: 2px; }
                .udp-strip-num { font-size: 1.15rem; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1; }
                .udp-strip-num.udp-strip-warn { color: #f59e0b; }
                .udp-strip-num.udp-strip-purple { color: #7c3aed; }
                .udp-strip-label { font-size: 0.58rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
                .udp-strip-divider { width: 1px; height: 28px; background: rgba(0,0,0,0.08); margin: 0 4px; }
                .udp-signout-mini { background: rgba(255,255,255,0.8); border: 1px solid #fecaca; color: #ef4444; border-radius: 10px; padding: 7px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
                .udp-signout-mini:hover { background: #fef2f2; transform: scale(1.05); }
                .udp-signout-mini:disabled { opacity: 0.5; cursor: not-allowed; }
                .udp-tabs { display: flex; gap: 4px; background: var(--color-bg-secondary); border-radius: var(--radius-lg); padding: 4px; }
                .udp-tab { flex: 1; padding: var(--radius-sm) 4px; border: none; border-radius: var(--radius-sm); background: none; font-size: 0.72rem; font-weight: 700; color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; }
                .udp-tab.active { background: white; color: var(--color-primary); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
                .udp-tab-badge { background: #ef4444; color: white; border-radius: 999px; padding: 1px 5px; font-size: 0.62rem; font-weight: 800; }
                .udp-tab-content { display: flex; flex-direction: column; gap: var(--radius-lg); }
                .udp-stats-row { display: flex; align-items: center; background: white; border: 1px solid var(--color-border); border-radius: 16px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
                .udp-stat { flex: 1; text-align: center; display: flex; flex-direction: column; gap: 3px; }
                .udp-stat-divider { width: 1px; height: 32px; background: var(--color-border); margin: 0 2px; }
                .udp-stat-num { font-size: 1.5rem; font-weight: 800; color: var(--color-text-primary); letter-spacing: -1px; line-height: 1; }
                .udp-stat-num.udp-stat-warn { color: #f59e0b; }
                .udp-stat-num.udp-stat-green { color: var(--color-primary); }
                .udp-stat-label { font-size: 0.62rem; font-weight: 600; color: var(--color-text-light); text-transform: uppercase; }
                .udp-last-scan { display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: 0.82rem; }
                .udp-last-scan svg { color: var(--color-primary); }
                .udp-section { background: white; border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
                .udp-section-alert { border-color: #fecaca; }
                .udp-section-resolved { border-color: #bbf7d0; }
                .udp-section-alert .udp-sh-icon { color: #ef4444 !important; }
                .udp-section-alert .udp-sh-title { color: #b91c1c; }
                .udp-section-resolved .udp-sh-icon { color: #16a34a !important; }
                .udp-section-resolved .udp-sh-title { color: #15803d; }
                .udp-section-header { display: flex; align-items: center; gap: var(--radius-sm); padding: var(--radius-md) var(--radius-lg); border-bottom: 1px solid var(--color-bg-secondary); font-size: 0.82rem; font-weight: 700; color: var(--color-text-primary); }
                .udp-sh-icon { color: var(--color-primary); display: flex; }
                .udp-sh-title { flex: 1; }
                .udp-see-all { display: flex; align-items: center; gap: 2px; background: none; border: none; color: var(--color-primary); font-size: 0.75rem; font-weight: 700; cursor: pointer; padding: 0; }
                .udp-alert-row { display: flex; align-items: center; gap: var(--radius-sm); padding: var(--radius-sm) var(--radius-lg); background: #fff7ed; border: none; border-bottom: 1px solid #fef3c7; cursor: pointer; text-align: left; width: 100%; transition: background 0.15s; }
                .udp-alert-row:last-child { border-bottom: none; }
                .udp-alert-row:hover { background: #fef9c3; }
                .udp-alert-dot { width: 9px; height: 9px; border-radius: 50%; background: #ef4444; flex-shrink: 0; animation: pulse 2s infinite; }
                @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.2)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0.05)} }
                .udp-alert-hint { font-size: 0.67rem; font-weight: 700; color: #ea580c; flex-shrink: 0; white-space: nowrap; }
                .udp-scan-row { display: flex; align-items: center; gap: var(--radius-sm); padding: var(--radius-sm) var(--radius-lg); background: none; border: none; border-bottom: 1px solid var(--color-bg-secondary); cursor: pointer; text-align: left; transition: background 0.15s; width: 100%; }
                .udp-scan-row:last-child { border-bottom: none; }
                .udp-scan-row:hover { background: var(--color-bg-secondary); }
                .udp-row-resolved { background: #f0fdf4; }
                .udp-row-resolved:hover { background: #dcfce7; }
                .udp-resolved-text { color: var(--color-text-secondary) !important; text-decoration: line-through; }
                .udp-scan-info { flex: 1; min-width: 0; }
                .udp-scan-name { display: block; font-size: 0.85rem; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .udp-scan-cat { display: block; font-size: 0.72rem; color: var(--color-text-light); margin-top: 1px; }
                .udp-chevron { color: var(--color-border); flex-shrink: 0; }
                .udp-log-row { display: flex; align-items: flex-start; gap: var(--radius-sm); padding: var(--radius-sm) var(--radius-lg); border-bottom: 1px solid var(--color-bg-secondary); }
                .udp-log-row:last-child { border-bottom: none; }
                .udp-log-icon { color: var(--color-primary); flex-shrink: 0; margin-top: 2px; }
                .udp-explore-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; padding: 0 16px 16px; }
                .udp-explore-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px 12px; background: white; border: 1px solid var(--color-border); border-radius: var(--radius-lg); cursor: pointer; transition: all 0.2s; }
                .udp-explore-card:hover { border-color: var(--color-primary); transform: translateY(-2px); }
                .udp-explore-icon { color: #475569; display: flex; }
                .udp-explore-label { font-size: 0.82rem; font-weight: 700; color: var(--color-text-primary); }
                .udp-reports { display: flex; flex-direction: column; gap: var(--radius-lg); }
                .udp-report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--radius-sm); }
                .udp-report-card { background: white; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 4px; }
                .udp-report-num { font-size: 2rem; font-weight: 800; color: var(--color-text-primary); letter-spacing: -1px; }
                .udp-report-label { font-size: 0.72rem; font-weight: 600; color: var(--color-text-light); text-transform: uppercase; }
                .udp-task-banner { display: flex; align-items: center; gap: 14px; padding: 16px; background: linear-gradient(135deg,#fffbeb,#fef3c7); border: 1px solid #fcd34d; border-radius: var(--radius-lg); cursor: pointer; transition: transform 0.2s; }
                .udp-task-banner:hover { transform: translateY(-2px); }
                .udp-task-icon { font-size: 1.5rem; }
                .udp-task-content { flex: 1; }
                .udp-task-title { font-size: 0.9rem; font-weight: 800; color: #92400e; margin-bottom: 2px; }
                .udp-task-desc { font-size: 0.78rem; color: #b45309; }
                .udp-tab-actions { display: flex; justify-content: flex-end; margin-bottom: 20px; }
                .udp-add-btn { display: flex; align-items: center; gap: 6px; background: var(--gradient-primary); color: white; border: none; border-radius: var(--radius-sm); padding: var(--radius-sm) var(--radius-lg); font-size: 0.82rem; font-weight: 700; cursor: pointer; }
                .udp-inline-form { background: white; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--radius-lg); display: flex; flex-direction: column; gap: var(--radius-sm); }
                .udp-input { width: 100%; padding: var(--radius-sm) var(--radius-md); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.88rem; color: var(--color-text-primary); outline: none; background: var(--color-bg-secondary); box-sizing: border-box; font-family: inherit; }
                .udp-input:focus { border-color: var(--color-primary); background: white; }
                .udp-submit-btn { padding: var(--radius-sm); background: var(--gradient-primary); color: white; border: none; border-radius: var(--radius-sm); font-size: 0.88rem; font-weight: 700; cursor: pointer; }
                .udp-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .udp-plot-card { display: flex; align-items: center; gap: var(--radius-md); background: white; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--radius-md) var(--radius-lg); margin-bottom: var(--radius-sm); }
                .udp-plot-card:last-child { margin-bottom: 0; }
                .udp-plot-icon { background: #d1fae5; color: var(--color-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 8px; border-radius: 8px; }
                .udp-plot-info { flex: 1; min-width: 0; }
                .udp-plot-name { display: block; font-size: 0.88rem; font-weight: 700; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .udp-plot-meta { display: block; font-size: 0.72rem; color: var(--color-text-light); margin-top: 2px; }
                .udp-delete-btn { background: none; border: none; color: var(--color-border); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; transition: color 0.15s,background 0.15s; }
                .udp-delete-btn:hover { color: #ef4444; background: #fef2f2; }
                .udp-note-date { font-size: 0.7rem; font-weight: 700; color: var(--color-text-light); text-transform: uppercase; }
                .udp-note-text { margin: 6px 0 0; font-size: 0.88rem; color: var(--color-text-primary); line-height: 1.5; white-space: pre-wrap; }
                .udp-empty { display: flex; flex-direction: column; align-items: center; gap: var(--radius-sm); padding: 40px 20px; color: var(--color-text-light); text-align: center; }
                .udp-empty svg { color: var(--color-border); }
                .udp-empty p { font-size: 0.88rem; margin: 0; }
                @media (max-width: 360px) { .udp-tab { font-size: 0.64rem; padding: 7px 2px; } }
            `}</style>
        </div>
    );
};

export default UserDashboardPanel;
