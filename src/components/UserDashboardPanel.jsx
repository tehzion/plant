import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../hooks/useLocation';
import {
    getScanHistory, getChecklistState, getLogbook,
    getDailyNotes, saveDailyNote, getPlots, savePlot, deletePlot
} from '../utils/localStorage';
import {
    ScanLine, ClipboardList, BookOpen, LogOut,
    ShieldCheck, ChevronRight, Calendar, TrendingUp,
    AlertTriangle, BarChart2, MapPin, FileText, Plus, Search, Wand2,
    Trash2, X, CheckCircle2, Leaf, BrainCircuit, Sparkles, Send, CheckSquare,
    ShoppingBag, Info
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import AlertDetailModal from './AlertDetailModal';
import { generateInsights, parseNaturalLog, predictFarmRisk } from '../utils/aiFarmService';
import { supabase } from '../lib/supabase';

// ─── Helper: friendly relative date ──────────────────────────────────────────
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
    other:     { bg: '#f3f4f6', color: '#6b7280' },
};

const EMPTY_FORM = {
    activity_type: 'note', plot_id: '', note: '',
    chemical_name: '', chemical_qty: '', application_timing: 'AM',
    temperature_am: '', humidity: '',
    growth_stage: 'Vegetative', pest_notes: '', disease_incidence: '',
    disease_name_observed: '', scout_severity: 'Low',
    expense_amount: '', expense_category: 'Fertilizer',
    photo_base64: '',
};

const UserDashboardPanel = () => {
    const { user, signOut } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Derived Activity Types with translations
    const ACTIVITY_TYPES = useMemo(() => ACTIVITY_TYPES_CFG.map(a => ({
        ...a,
        label: t(`profile.${a.key}`) || a.label
    })), [t]);

    // ── State ──────────────────────────────────────────────────────────────────
    const [stats, setStats]               = useState({ total: 0, healthy: 0, diseases: 0, lastScan: null });
    const [scanHistory, setScanHistory]   = useState([]);
    const [checklistPct, setChecklistPct] = useState(0);
    const [recentScans, setRecentScans]   = useState([]);
    const [alerts, setAlerts]             = useState([]);
    const [logs, setLogs]                 = useState([]);
    const [plots, setPlots]               = useState([]);
    const [notes, setNotes]               = useState([]);
    const [signingOut, setSigningOut]     = useState(false);

    // Alert modal state
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [acknowledgedIds, setAcknowledgedIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('plant_ack_alerts') || '[]'); }
        catch { return []; }
    });

    // Daily note form
    const [noteForm,    setNoteForm]    = useState(EMPTY_FORM);
    const [addingNote,  setAddingNote]  = useState(false);
    const [savingNote,  setSavingNote]  = useState(false);

    // Plot form
    const [addingPlot, setAddingPlot] = useState(false);
    const [plotForm, setPlotForm]     = useState({ name: '', cropType: '', area: '', unit: 'acres', soil_ph: '', npk_n: '', npk_p: '', npk_k: '' });
    const [savingPlot, setSavingPlot] = useState(false);
    const [showSoilFields, setShowSoilFields] = useState(false);

    // AI States
    const [aiInsights, setAiInsights] = useState(null);
    const [generatingInsights, setGeneratingInsights] = useState(false);
    const [enhancing, setEnhancing] = useState(false);
    const [enhanceText, setEnhanceText] = useState('');
    const [assessingRisk, setAssessingRisk] = useState(false);
    const [predictiveRisk, setPredictiveRisk] = useState(null);

    // Hooks
    const { getLocation } = useLocation();

    // Tabs
    const [tab, setTab] = useState('overview');

    // ── Derived profile info ───────────────────────────────────────────────────
    const email       = user?.email ?? '';
    const displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

    // ── Load all data ──────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            const [history, checklist, logbook, dailyNotes, farmPlots] = await Promise.all([
                Promise.resolve(getScanHistory(user?.id ?? null)),
                Promise.resolve(getChecklistState(user?.id ?? null)),
                Promise.resolve(getLogbook(user?.id ?? null)),
                Promise.resolve(getDailyNotes(user?.id ?? null)),
                Promise.resolve(getPlots(user?.id ?? null)),
            ]);

            const total    = history.length;
            const healthy  = history.filter(s => s.healthStatus === 'healthy').length;
            const diseases = total - healthy;
            const lastScan = history[0]?.timestamp ?? history[0]?.created_at ?? null;

            setStats({ total, healthy, diseases, lastScan });
            setScanHistory(history);
            setRecentScans(history.slice(0, 3));

            // Alerts: disease scans within last 7 days with severe/critical severity
            const cutoff = Date.now() - 7 * 86400000;
            const alertScans = history.filter(s => {
                const ts  = new Date(s.timestamp ?? s.created_at).getTime();
                const sev = (s.severity ?? '').toLowerCase();
                return ts > cutoff && s.healthStatus !== 'healthy'
                    && (sev === 'severe' || sev === 'critical' || sev === 'sederhana');
            });

            // Scout auto-alerts
            const scoutAlerts = dailyNotes.filter(n => {
                const ts = new Date(n.created_at).getTime();
                return ts > cutoff && n.activity_type === 'scout' &&
                       (n.disease_incidence > 10 || n.scout_severity === 'High' || n.scout_severity === 'Moderate');
            }).map(n => ({
                id: n.id,
                disease: n.disease_name_observed || 'Field Observation',
                category: n.pest_notes ? `Scout / ${n.pest_notes.slice(0, 15)}...` : 'Field Scout',
                severity: n.scout_severity || 'High',
                timestamp: n.created_at,
                healthStatus: 'disease',
                result_json: { treatment: ['Verify field observation', 'Plan targeted response based on scouting data', 'Log secondary detailed scan if necessary'] }
            }));

            const allAlerts = [...alertScans, ...scoutAlerts].sort((a,b) => new Date(b.timestamp ?? b.created_at).getTime() - new Date(a.timestamp ?? a.created_at).getTime());
            setAlerts(allAlerts.slice(0, 5));

            const keys = Object.values(checklist);
            setChecklistPct(keys.length > 0 ? Math.round((keys.filter(Boolean).length / 8) * 100) : 0);
            setLogs(logbook.slice(0, 5));
            setNotes(dailyNotes);
            setPlots(farmPlots);

            // Risk Assessment
            const activeUnack = allAlerts.filter(s => !acknowledgedIds.includes(s.id));
            if (activeUnack.length > 0 && farmPlots.length > 0 && !predictiveRisk) {
                const lang = localStorage.getItem('appLanguage') || 'en';
                setAssessingRisk(true);
                getLocation().then((loc) => {
                    return predictFarmRisk(farmPlots, dailyNotes.slice(0, 30), activeUnack, loc, lang);
                }).then(res => {
                    setPredictiveRisk(res);
                    if (res?.hasRisk && typeof window !== 'undefined' && 'Notification' in window) {
                        if (Notification.permission === 'granted') {
                            new Notification('Plant Farm AI Alert', { body: res.warningMessage });
                        } else if (Notification.permission !== 'denied') {
                            Notification.requestPermission().then(perm => {
                                if (perm === 'granted') new Notification('Plant Farm AI Alert', { body: res.warningMessage });
                            });
                        }
                    }
                })
                  .catch(e => console.error('Risk error:', e))
                  .finally(() => setAssessingRisk(false));
            }
        };
        load();
    }, [user?.id]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleSignOut = async () => {
        setSigningOut(true);
        try { await signOut(); navigate('/'); } catch { setSigningOut(false); }
    };

    const handleGenerateInsights = async (activeAlerts, harvestLogs) => {
        if (generatingInsights) return;
        setGeneratingInsights(true);
        try {
            const lang = localStorage.getItem('appLanguage') || 'en';
            // PRIORITIZE: notes (Actual Daily Activities) over logs (Scan History) for better advice
            const recentLogs = notes.slice(0, 15);
            
            if (recentLogs.length === 0 && activeAlerts.length === 0 && harvestLogs.length === 0 && plots.length === 0) {
                setAiInsights({
                    summary: lang === 'zh' ? '欢迎使用 AI 农艺师！添加您的第一个地块或日志以获取个性化建议。' :
                             lang === 'ms' ? 'Selamat datang ke AI Agronomia! Tambah petak atau log pertama anda untuk saranan peribadi.' :
                                             'Welcome to your AI Agronomist! Add your first farm plot or daily log to start receiving personalized recommendations and risk alerts.',
                    yieldAnalysis: null,
                    recommendations: [
                        lang === 'zh' ? '添加新的地块并记录土壤 pH 和 NPK 数据。' : lang === 'ms' ? 'Tambah petak baru dan rekod data tanah pH / NPK.' : 'Add a new farm plot and record soil pH and NPK data.',
                        lang === 'zh' ? '使用农场日志记录施肥、喷药和采收记录。' : lang === 'ms' ? 'Gunakan log untuk merekod aktiviti baja, racun dan tuaian.' : 'Use the daily log to record fertilizing, spraying, and harvesting.',
                        lang === 'zh' ? '进行每周扫描以发现作物的健康问题并获取治疗建议。' : lang === 'ms' ? 'Buat imbasan mingguan untuk mengesan kesihatan tanaman dan mendapatkan strategi rawatan.' : 'Perform weekly scans to detect crop health issues early and receive treatment strategies.'
                    ]
                });
                return;
            }

            const data = await generateInsights(recentLogs, activeAlerts, harvestLogs, plots, checklistPct, lang);
            setAiInsights(data);
        } catch (error) {
            console.error('Failed to generate insights:', error);
            alert(t('error.aiGenerationFailed') || 'Failed to generate AI insights. Please check connection.');
        } finally {
            setGeneratingInsights(false);
        }
    };

    /**
     * AI Auto-Enhance: 
     * Uses the current note or explicit input to refine/populate the form.
     */
    const handleAutoEnhance = async (textToUse = '') => {
        const text = textToUse || enhanceText || noteForm.note;
        if (!text || text.trim().length < 3) return;
        
        setEnhancing(true);
        console.log(`✨ Auto-Enhance triggering with: "${text}"`);
        console.log(`📍 API URL: ${import.meta.env.VITE_API_URL || 'http://localhost:3002'}`);

        try {
            const lang = localStorage.getItem('appLanguage') || 'en';
            const parsed = await parseNaturalLog(text, lang);
            console.log('✅ Auto-Enhance Result:', parsed);
            
            if (!parsed || Object.keys(parsed).length === 0) {
                throw new Error('AI returned empty or invalid data');
            }

            // Map type or keep current if AI didn't find one
            let finalType = noteForm.activity_type;
            if (parsed.type) {
                const typeMap = {
                    'spray': 'spray', 'racun': 'spray', 'pesticide': 'spray',
                    'fertilize': 'fertilize', 'baja': 'fertilize',
                    'harvest': 'harvest', 'tuai': 'harvest',
                    'prune': 'prune', 'pangkas': 'prune',
                    'inspect': 'inspect', 'scout': 'scout', 'note': 'note'
                };
                finalType = typeMap[parsed.type.toLowerCase()] || finalType;
            }

            // Find plot if mentioned
            let plotId = null;
            if (parsed.plotId) {
                const found = plots.find(p => 
                    p.name.toLowerCase().includes(parsed.plotId.toLowerCase()) || 
                    parsed.plotId.toLowerCase().includes(p.name.toLowerCase())
                );
                if (found) plotId = found.id;
            }

            setNoteForm(f => ({
                ...f,
                activity_type: finalType,
                plot_id: plotId || f.plot_id,
                chemical_name: parsed.chemicalName || f.chemical_name,
                chemical_qty: parsed.quantity || f.chemical_qty,
                kg_harvested: parsed.kg_harvested || f.kg_harvested,
                price_per_kg: parsed.price_per_kg || f.price_per_kg,
                buyer_name: parsed.buyer_name || f.buyer_name,
                temperature_am: parsed.temperature || f.temperature_am,
                humidity: parsed.humidity || f.humidity,
                disease_name_observed: parsed.disease_name || f.disease_name_observed,
                scout_severity: parsed.severity ? String(parsed.severity).toLowerCase() : f.scout_severity,
                expense_amount: parsed.expense_amount || f.expense_amount,
                expense_category: parsed.expense_category || f.expense_category,
                note: parsed.notes || text, // Use professional AI note or keep original
            }));
            
            setEnhanceText('');
        } catch (error) {
            console.error('❌ Auto-Enhance failed:', error);
            alert(t('error.aiEnhanceFailed') || 'AI Enhancement failed. Please check backend connection.');
        } finally {
            setEnhancing(false);
        }
    };

    const handleAcknowledge = (scanId) => {
        const next = [...acknowledgedIds, scanId];
        setAcknowledgedIds(next);
        try { localStorage.setItem('plant_ack_alerts', JSON.stringify(next)); } catch {}
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteForm.note.trim() && !noteForm.chemical_name.trim()) return;
        setSavingNote(true);

        // Handle photo upload if one was taken
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
                    } else { photoUrl = noteForm.photo_base64; } // fallback to inline
                } catch { photoUrl = noteForm.photo_base64; }
            } else {
                photoUrl = noteForm.photo_base64; // Guest mode: store inline
            }
        }

        const saved = await saveDailyNote({
            ...noteForm,
            plot_id:       noteForm.plot_id        || null,
            chemical_name: noteForm.chemical_name   || null,
            chemical_qty:  noteForm.chemical_qty    || null,
            application_timing: noteForm.application_timing  || null,
            temperature_am: noteForm.temperature_am !== '' ? Number(noteForm.temperature_am) : null,
            humidity:       noteForm.humidity       !== '' ? Number(noteForm.humidity)       : null,
            growth_stage:   noteForm.growth_stage   || null,
            pest_notes:     noteForm.pest_notes     || null,
            disease_incidence: noteForm.disease_incidence !== '' ? Number(noteForm.disease_incidence) : null,
            disease_name_observed: noteForm.disease_name_observed || null,
            scout_severity: noteForm.scout_severity || null,
            expense_amount: noteForm.expense_amount !== '' ? Number(noteForm.expense_amount) : null,
            expense_category: noteForm.expense_category || null,
            photo_url: photoUrl,
        }, user?.id ?? null);
        if (saved) {
            setNotes(prev => [saved, ...prev]);
            setNoteForm(EMPTY_FORM);
            setAddingNote(false);
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
            npk_n:   plotForm.npk_n   !== '' ? parseFloat(plotForm.npk_n)   : null,
            npk_p:   plotForm.npk_p   !== '' ? parseFloat(plotForm.npk_p)   : null,
            npk_k:   plotForm.npk_k   !== '' ? parseFloat(plotForm.npk_k)   : null,
        }, user?.id ?? null);
        if (saved) {
            setPlots(prev => [saved, ...prev]);
            setPlotForm({ name: '', cropType: '', area: '', unit: 'acres', soil_ph: '', npk_n: '', npk_p: '', npk_k: '' });
            setShowSoilFields(false);
            setAddingPlot(false);
        }
        setSavingPlot(false);
    };

    const handleDeletePlot = async (id) => {
        if (!window.confirm('Remove this plot?')) return;
        const ok = await deletePlot(id, user?.id ?? null);
        if (ok) setPlots(prev => prev.filter(p => p.id !== id));
    };

    // ── Section header helper ──────────────────────────────────────────────────
    const SectionHeader = ({ icon, title, action }) => (
        <div className="udp-section-header">
            {icon && <span className="udp-sh-icon">{icon}</span>}
            <span className="udp-sh-title">{title}</span>
            {action && <span className="udp-sh-action">{action}</span>}
        </div>
    );

    // ── Overview Tab ──────────────────────────────────────────────────────────
    const OverviewTab = () => {
        const activeAlerts   = alerts.filter(s => !acknowledgedIds.includes(s.id));
        const resolvedAlerts = alerts.filter(s =>  acknowledgedIds.includes(s.id));
        const harvestLogs    = notes.filter(n => n.activity_type === 'harvest');

        // ── T1: Week-over-Week Trend Calculation ──────────────────────────────
        const weekTrends = useMemo(() => {
            const now       = Date.now();
            const oneWeek   = 7  * 86400000;
            const twoWeeks  = 14 * 86400000;

            const thisWeekScans = scanHistory.filter(s => {
                const ts = new Date(s.timestamp ?? s.created_at).getTime();
                return ts > now - oneWeek;
            });
            const lastWeekScans = scanHistory.filter(s => {
                const ts = new Date(s.timestamp ?? s.created_at).getTime();
                return ts > now - twoWeeks && ts <= now - oneWeek;
            });

            const thisD  = thisWeekScans.filter(s => s.healthStatus !== 'healthy').length;
            const lastD  = lastWeekScans.filter(s => s.healthStatus !== 'healthy').length;
            const thisT  = thisWeekScans.length;
            const lastT  = lastWeekScans.length;

            const diseaseDelta = thisD - lastD;
            const scanDelta    = thisT - lastT;

            return { diseaseDelta, scanDelta, thisD, lastD, thisT, lastT };
        }, [scanHistory]);

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
                const d = new Date();
                d.setDate(d.getDate() - i);
                days.push({
                    date: d.toLocaleDateString(t('common.dateLocale') || 'en-US', { month: 'short', day: 'numeric' }),
                    healthy: 0,
                    diseased: 0,
                    rawDate: d.toISOString().split('T')[0]
                });
            }
            alerts.forEach(scan => {
                // Ensure recent scans track correctly (some are healthy, some are diseases)
                const scanDate = (scan.timestamp || scan.created_at || '').split('T')[0];
                const dayMatch = days.find(d => d.rawDate === scanDate);
                if (dayMatch) {
                    if (scan.healthStatus === 'healthy' || !scan.disease) dayMatch.healthy++;
                    else dayMatch.diseased++;
                }
            });
            return days;
        }, [alerts, t]);

        return (
            <>
                {/* AI Predictive Risk Banner */}
                {(assessingRisk || predictiveRisk?.hasRisk) && (
                    <div className="udp-section" style={{ background: assessingRisk ? '#fefce8' : '#fef2f2', borderColor: assessingRisk ? '#fef08a' : '#fecaca', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                        {assessingRisk ? (
                            <BrainCircuit size={20} style={{ color: '#ca8a04', animation: 'pulse 1.5s infinite', marginTop: 2 }} className="udp-sh-icon" />
                        ) : (
                            <AlertTriangle size={20} style={{ color: '#dc2626', marginTop: 2 }} className="udp-sh-icon" />
                        )}
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 4px', fontSize: '0.9rem', color: assessingRisk ? '#854d0e' : '#991b1b', fontWeight: 800 }}>
                                {assessingRisk ? (t('profile.analyzingRisk') || 'Analyzing Farm Risk Profile...') : (t('profile.riskActionRequired') || 'Action Required: Imminent Risk Detected')}
                            </h3>
                            {!assessingRisk && predictiveRisk && (
                                <>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.4 }}>
                                        {predictiveRisk.warningMessage}
                                    </p>
                                    <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '0.75rem', color: '#991b1b', fontWeight: 700, display: 'inline-block' }}>
                                        💡 {predictiveRisk.suggestedAction}
                                    </div>
                                    {predictiveRisk.recommendedTreatment && (
                                        <button
                                            style={{ marginTop: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)' }}
                                            onClick={() => {
                                                const rec = predictiveRisk.recommendedTreatment;
                                                const validTypes = ['note', 'scout', 'spray', 'fertilize', 'prune', 'inspect', 'harvest', 'other'];
                                                const act = validTypes.includes(rec.activity) ? rec.activity : 'spray';
                                                
                                                setNoteForm(f => ({
                                                    ...EMPTY_FORM,
                                                    activity_type: act,
                                                    chemical_name: (rec.chemical && rec.chemical !== 'null' && rec.chemical !== 'None') ? rec.chemical : '',
                                                    note: `${t('profile.aiAutoPopulated') || '[System AI] Auto-populated response for:'}\n${predictiveRisk.warningMessage}`
                                                }));
                                                setAddingNote(true);
                                                
                                                setTimeout(() => {
                                                    const formEl = document.querySelector('.udp-tab-actions');
                                                    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 150);
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

                {/* T1: Stats row with trend indicators */}
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
                        <span>{t('profile.lastScan') || 'Last scan'}: <strong>{relDate(stats.lastScan)}</strong></span>
                    </div>
                )}

                <div className="udp-section" style={{ padding: '16px 16px 0', borderBottom: 'none' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 16px 4px' }}>{t('profile.scanTrendTitle') || 'Scan Activity Trend (Last 7 Days)'}</div>
                    <div style={{ width: '100%', height: 160, minHeight: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="healthy" name={t('profile.healthy') || "Healthy"} stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="diseased" name={t('profile.diseased') || "Diseased"} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Agronomist Card (Dashboard version) */}
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
                                {generatingInsights ? 'Analyzing...' : <><Sparkles size={13} /> Ask AI</>}
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
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', marginBottom: '8px', textTransform: 'uppercase' }}>{t('profile.aiRecommendations') || 'Actionable Recommendations'}:</div>
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#4c1d95', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {aiInsights.recommendations?.map((rec, i) => (
                                        <li key={i}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>
                                {t('profile.aiAskHint') || 'Tap "Ask AI" to get a personalized weekly agronomist report based on your farm activity.'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Active alerts — tap to respond */}
                {activeAlerts.length > 0 && (
                    <div className="udp-section udp-section-alert">
                        <SectionHeader
                            icon={<AlertTriangle size={15} />}
                            title={t('profile.alerts') || `Alerts (${activeAlerts.length})`}
                        />
                        {activeAlerts.map(scan => (
                            <button key={scan.id} className="udp-alert-row" onClick={() => setSelectedAlert(scan)}>
                                <span className="udp-alert-dot" />
                                <div className="udp-scan-info">
                                    <span className="udp-scan-name">{scan.disease}</span>
                                    <span className="udp-scan-cat">{scan.category} · {(t(`profile.severity${scan.severity}`) || (scan.severity ?? '').toUpperCase())} · {relDate(scan.timestamp ?? scan.created_at, t)}</span>
                                </div>
                                <span className="udp-alert-hint">{t('profile.tapToRespond') || 'Tap to respond'}</span>
                                <ChevronRight size={13} className="udp-chevron" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Resolved alerts */}
                {resolvedAlerts.length > 0 && (
                    <div className="udp-section udp-section-resolved">
                        <SectionHeader
                            icon={<CheckCircle2 size={15} />}
                            title={t('profile.resolved') || 'Resolved'}
                        />
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

                {/* T2: Recent scans with visual thumbnails */}
                {recentScans.length > 0 && (
                    <div className="udp-section">
                        <SectionHeader
                            icon={<TrendingUp size={15} />}
                            title={t('profile.recentActivity') || 'Recent Scans'}
                            action={<button className="udp-see-all" onClick={() => navigate('/history')}>{t('common.seeAll') || 'See all'} <ChevronRight size={13} /></button>}
                        />
                        {recentScans.map(scan => {
                            const thumbSrc = scan.image_url || scan.image || null;
                            return (
                                <button key={scan.id} className="udp-scan-row" onClick={() => navigate(`/results/${scan.id}`)}>
                                    {/* Thumbnail */}
                                    {thumbSrc ? (
                                        <img
                                            src={thumbSrc}
                                            alt={t('common.photoPreview') || "scan"}
                                            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }}
                                        />
                                    ) : (
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: scan.healthStatus === 'healthy' ? '#d1fae5' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Leaf size={18} color={scan.healthStatus === 'healthy' ? '#059669' : '#d97706'} />
                                        </div>
                                    )}
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

                {/* Activity log */}
                {logs.length > 0 && (
                    <div className="udp-section">
                        <SectionHeader
                            icon={<FileText size={15} />}
                            title={t('profile.activityLog') || 'Activity Log'}
                            action={<button className="udp-see-all" onClick={() => navigate('/mygap')}>{t('common.seeAll') || 'See all'} <ChevronRight size={13} /></button>}
                        />
                        {logs.map(log => (
                            <div key={log.id} className="udp-log-row">
                                <CheckCircle2 size={14} className="udp-log-icon" />
                                <div className="udp-scan-info">
                                    <span className="udp-scan-name">{log.type}</span>
                                    <span className="udp-scan-cat">{log.notes?.slice(0, 60)}{log.notes?.length > 60 ? '…' : ''} · {relDate(log.timestamp ?? log.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* T3: Smart Quick Actions */}
                <div className="udp-section">
                    <SectionHeader title={t('profile.quickActions') || 'Quick Actions'} />
                    <div className="udp-actions-grid">
                        {(() => {
                            const daysSinceScan = stats.lastScan
                                ? Math.floor((Date.now() - new Date(stats.lastScan)) / 86400000)
                                : Infinity;
                            const hasUnackedAlerts = activeAlerts.length > 0;
                            let primaryAction;
                            if (hasUnackedAlerts) {
                                primaryAction = {
                                    icon: <AlertTriangle size={22} />,
                                    label: t('profile.logTreatment') || 'Log Treatment',
                                    color: 'scan-icon',
                                    style: { background: 'rgba(220, 38, 38, 0.1)', border: '1.5px solid #fca5a5' },
                                    iconStyle: { background: '#fee2e2', color: '#dc2626' },
                                    to: null,
                                    action: () => { setTab('log'); setAddingNote(true); }
                                };
                            } else if (daysSinceScan > 7) {
                                primaryAction = {
                                    icon: <ScanLine size={22} />,
                                    label: `📅 ${t('profile.weeklyScanDue') || 'Weekly Scan Due'}`,
                                    color: 'scan-icon',
                                    style: { background: 'rgba(245, 158, 11, 0.1)', border: '1.5px solid #fcd34d' },
                                    iconStyle: { background: '#fef3c7', color: '#d97706' },
                                    to: '/?scan=true',
                                    action: null
                                };
                            } else {
                                primaryAction = { icon: <ScanLine size={22} />, label: t('home.newScan') || 'New Scan', color: 'scan-icon', style: {}, iconStyle: {}, to: '/?scan=true', action: null };
                            }

                            const standardActions = [
                                { icon: <ShoppingBag size={22} />, label: t('nav.shop') || 'Shop', color: 'shop-icon', to: '/shop', action: null },
                                { icon: <CheckSquare size={22} />, label: t('home.mygapTitle') || 'myGAP Guide', color: 'mygap-icon', to: '/mygap', action: null },
                                { icon: <Info size={22} />, label: t('home.keyInfo') || 'Crop Advisor', color: 'guide-icon', to: '/key-info', action: null },
                                { icon: <BookOpen size={22} />, label: t('settings.guide') || 'User Guide', color: 'book-icon', to: '/guide', action: null },
                            ];

                            return [primaryAction, ...standardActions].map((a, i) => (
                                <button
                                    key={i}
                                    className="udp-action-btn"
                                    style={a.style}
                                    onClick={() => a.action ? a.action() : navigate(a.to)}
                                >
                                    <div className={`udp-action-icon ${a.color}`} style={a.iconStyle}>{a.icon}</div>
                                    <span>{a.label}</span>
                                </button>
                            ));
                        })()}
                    </div>
                </div>
            </>
        );
    };

    // ── Reports Tab ───────────────────────────────────────────────────────────
    const ReportsTab = () => {
        const [selectedPlotId, setSelectedPlotId] = useState('all');

        const healthRate = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;
        const activeAlerts = alerts.filter(s => !acknowledgedIds.includes(s.id));

        const filteredNotes = selectedPlotId === 'all' ? notes : notes.filter(n => n.plot_id === selectedPlotId);

        const harvestLogs = filteredNotes.filter(n => n.activity_type === 'harvest');
        const totalKg = harvestLogs.reduce((sum, n) => sum + (Number(n.kg_harvested) || 0), 0);
        const totalRevenue = harvestLogs.reduce((sum, n) => {
            const kg = Number(n.kg_harvested) || 0;
            const price = Number(n.price_per_kg) || 0;
            return sum + (kg * price);
        }, 0);

        const totalExpenses = filteredNotes.reduce((sum, n) => sum + (Number(n.expense_amount) || 0), 0);
        const netProfit = totalRevenue - totalExpenses;

        const qualityCounts = { Excellent: 0, Good: 0, Fair: 0, Poor: 0 };
        harvestLogs.forEach(n => {
            if (n.quality_grade && qualityCounts[n.quality_grade] !== undefined) {
                qualityCounts[n.quality_grade]++;
            }
        });

        const expenseCounts = {};
        filteredNotes.forEach(n => {
            if (n.expense_amount) {
                const cat = n.expense_category || 'Other';
                expenseCounts[cat] = (expenseCounts[cat] || 0) + Number(n.expense_amount);
            }
        });

        const expenseData = Object.keys(expenseCounts).map(k => ({
            name: k,
            value: expenseCounts[k],
            fill: k === 'Fertilizer' ? '#10b981' : k === 'Pesticide' ? '#f59e0b' : k === 'Labor' ? '#3b82f6' : k === 'Equipment' ? '#8b5cf6' : '#64748b'
        })).sort((a,b) => b.value - a.value);

        const healthData = [
            { name: t('results.healthy') || 'Healthy', value: stats.healthy, color: '#10b981' },
            { name: t('profile.diseased') || 'Diseased', value: stats.diseases, color: '#f59e0b' }
        ].filter(d => d.value > 0);

        const qualityData = Object.keys(qualityCounts).map(k => ({
            name: k, 
            count: qualityCounts[k], 
            fill: k === 'Excellent' ? '#10b981' : k === 'Good' ? '#3b82f6' : k === 'Fair' ? '#f59e0b' : '#ef4444'
        })).filter(d => d.count > 0);

        // ── T5: Yield Forecast (Linear Regression on monthly harvest) ─────────────
        const yieldChartData = useMemo(() => {
            const byMonth = {};
            const allHarvest = notes.filter(n => n.activity_type === 'harvest');
            allHarvest.forEach(n => {
                const d = new Date(n.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                if (!byMonth[key]) byMonth[key] = { month: label, kg: 0 };
                byMonth[key].kg += Number(n.kg_harvested) || 0;
            });
            const sorted = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
            if (sorted.length < 2) return { data: sorted, forecast: null };

            // Simple linear regression on index vs kg
            const n = sorted.length;
            const sumX  = sorted.reduce((s, _, i) => s + i, 0);
            const sumY  = sorted.reduce((s, d) => s + d.kg, 0);
            const sumXY = sorted.reduce((s, d, i) => s + i * d.kg, 0);
            const sumX2 = sorted.reduce((s, _, i) => s + i * i, 0);
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
            const intercept = (sumY - slope * sumX) / n;
            const forecastKg = Math.max(0, Math.round(slope * n + intercept));

            const nextDate = new Date();
            nextDate.setMonth(nextDate.getMonth() + 1);
            const nextLabel = nextDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            const dataWithForecast = [
                ...sorted,
                { month: nextLabel, kg: null, forecast: forecastKg }
            ];
            return { data: dataWithForecast, forecast: forecastKg };
        }, [notes]);

        return (
            <div className="udp-reports">
                <div className="udp-report-grid">
                    <div className="udp-report-card">
                        <span className="udp-report-num udp-stat-green">{healthRate}%</span>
                        <span className="udp-report-label">{t('profile.healthRate') || 'Plant Health Rate'}</span>
                    </div>
                    <div className="udp-report-card">
                        <span className="udp-report-num udp-stat-warn">{stats.diseases}</span>
                        <span className="udp-report-label">{t('profile.diseasesFound') || 'Diseases'}</span>
                    </div>
                    <div className="udp-report-card">
                        <span className="udp-report-num">{stats.total}</span>
                        <span className="udp-report-label">{t('profile.totalScans') || 'Total Scans'}</span>
                    </div>
                    <div className="udp-report-card">
                        <span className="udp-report-num udp-stat-green">{checklistPct}%</span>
                        <span className="udp-report-label">{t('profile.gapCompliance') || 'GAP Compliance'}</span>
                    </div>
                </div>

                <div className="udp-section" style={{ marginTop: 0 }}>
                    <SectionHeader icon={<BarChart2 size={15} />} title={t('profile.healthBreakdown') || 'Health Breakdown'} />
                    <div style={{ padding: '0 16px 16px' }}>
                        {healthData.length > 0 ? (
                            <div style={{ width: '100%', height: 180, minHeight: 180 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={healthData} innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {healthData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <span style={{ color: '#10b981' }}>● {t('profile.healthy') || 'Healthy'}: {stats.healthy}</span>
                                    <span style={{ color: '#f59e0b' }}>● {t('profile.diseased') || 'Diseased'}: {stats.diseases}</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>{t('profile.noScanData') || 'No scan data available'}</div>
                        )}
                    </div>
                </div>

                <div className="udp-section">
                    <SectionHeader 
                        icon={<TrendingUp size={15} />} 
                        title={t('profile.harvestSummary') || 'Financial & Yield Summary'} 
                        action={
                            <select 
                                className="udp-input" 
                                style={{ width: 130, padding: 4, height: 26, fontSize: '0.75rem', borderRadius: 6 }} 
                                value={selectedPlotId} 
                                onChange={e => setSelectedPlotId(e.target.value)}
                            >
                                <option value="all">All Plots</option>
                                {plots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        }
                    />
                    <div style={{ padding: '0 16px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('profile.totalYield') || 'Total Yield'}</div>
                                <div style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>{totalKg.toFixed(1)}kg</div>
                            </div>
                            <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('profile.estRevenue') || 'Est. Revenue'}</div>
                                <div style={{ fontSize: '1.2rem', color: '#059669', fontWeight: 800 }}>RM{totalRevenue.toFixed(0)}</div>
                            </div>
                            <div style={{ flex: 1, background: '#fff1f2', padding: '12px', borderRadius: '8px', border: '1px solid #ffe4e6', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#be123c', fontWeight: 600, textTransform: 'uppercase' }}>{t('profile.expenses') || 'Expenses'}</div>
                                <div style={{ fontSize: '1.2rem', color: '#e11d48', fontWeight: 800 }}>-RM{totalExpenses.toFixed(0)}</div>
                            </div>
                        </div>

                        <div style={{ width: '100%', background: netProfit >= 0 ? '#ecfdf5' : '#fef2f2', padding: '16px', borderRadius: '8px', border: `1px solid ${netProfit >= 0 ? '#a7f3d0' : '#fecaca'}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: netProfit >= 0 ? '#065f46' : '#991b1b', textTransform: 'uppercase' }}>{t('profile.netProfit') || 'Net Profit (ROI)'}</span>
                            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: netProfit >= 0 ? '#059669' : '#e11d48' }}>
                                {netProfit >= 0 ? '+' : '-'}RM{Math.abs(netProfit).toFixed(2)}
                            </span>
                        </div>

                        {/* T5: Yield Forecast Chart */}
                        {yieldChartData.data.length >= 2 && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                                    📈 {t('profile.yieldHistoryForecast') || 'Yield History & AI Forecast'}
                                </div>
                                {yieldChartData.forecast !== null && (
                                    <div style={{ background: 'linear-gradient(90deg, #eff6ff, #f0fdf4)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '1.1rem' }}>📊</span>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 700 }}>{t('profile.aiForecastNextMonth') || 'AI Forecast: Next Month'}</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>~{yieldChartData.forecast} kg</div>
                                        </div>
                                        <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6b7280' }}>{t('profile.basedOnHarvestTrends') || 'Based on harvest trends'}</div>
                                    </div>
                                )}
                                <div style={{ width: '100%', height: 180, minHeight: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={yieldChartData.data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip formatter={(v, name) => [v ? `${v} kg` : '-', name === 'kg' ? (t('profile.actual') || 'Actual') : (t('profile.forecast') || 'Forecast')]} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Line type="monotone" dataKey="kg" name={t('profile.actual') || "Actual"} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                                            <Line type="monotone" dataKey="forecast" name={t('profile.forecast') || "Forecast"} stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 5, fill: '#3b82f6' }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {expenseData.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>{t('profile.expenseBreakdown') || 'Expense Breakdown'}</div>
                                <div style={{ width: '100%', height: 160, minHeight: 160 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={expenseData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                                                {expenseData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(value) => `RM${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: 600, marginTop: '4px' }}>
                                    {expenseData.map(d => (
                                        <span key={d.name} style={{ color: d.fill }}>● {t(`profile.act${d.name}`) || d.name}: RM{d.value}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {harvestLogs.length > 0 && qualityData.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>{t('profile.qualityBreakdown') || 'Quality Breakdown'}</div>
                                <div style={{ width: '100%', height: 160, minHeight: 160 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={qualityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Agronomist Card */}
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
                                {generatingInsights ? 'Analyzing...' : <><Sparkles size={13} /> Ask AI</>}
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
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', marginBottom: '8px', textTransform: 'uppercase' }}>{t('profile.aiRecommendations') || 'Actionable Recommendations'}:</div>
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#4c1d95', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {aiInsights.recommendations?.map((rec, i) => (
                                        <li key={i}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>
                                {t('profile.aiAskHint') || 'Tap "Ask AI" to get a personalized weekly agronomist report based on your farm activity.'}
                            </div>
                        )}
                    </div>
                </div>

                {activeAlerts.length > 0 && (
                    <div className="udp-section">
                        <SectionHeader icon={<AlertTriangle size={15} />} title={t('profile.activeAlerts') || 'Active Alerts (Last 7 Days)'} />
                        {activeAlerts.map(scan => (
                            <button key={scan.id} className="udp-alert-row" onClick={() => setSelectedAlert(scan)}>
                                <span className="udp-alert-dot" />
                                <div className="udp-scan-info">
                                    <span className="udp-scan-name">{scan.disease}</span>
                                    <span className="udp-scan-cat">{scan.category} · {(scan.severity ?? '').toUpperCase()} · {relDate(scan.timestamp ?? scan.created_at)}</span>
                                </div>
                                <ChevronRight size={13} className="udp-chevron" />
                            </button>
                        ))}
                    </div>
                )}
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
                    <div>
                        <label className="udp-form-label">{t('profile.plotName') || 'Plot / Farm Name'} <span className="udp-form-required">*</span></label>
                        <input className="udp-input" placeholder={t('form.plotNamePlaceholder') || "e.g. Block A or Durian Grove"} value={plotForm.name} onChange={e => setPlotForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>

                    <div>
                        <label className="udp-form-label">{t('profile.cropType') || 'Crop Type'}</label>
                        <input className="udp-input" placeholder={t('form.cropTypePlaceholder') || "e.g. Durian (Musang King)"} value={plotForm.cropType} onChange={e => setPlotForm(p => ({ ...p, cropType: e.target.value }))} />
                    </div>

                    <div className="udp-form-grid">
                        <div>
                            <label className="udp-form-label">{t('profile.area') || 'Land Area'}</label>
                            <input className="udp-input" type="number" min="0" step="0.1" placeholder={t('form.areaPlaceholder') || "e.g. 5.0"} value={plotForm.area} onChange={e => setPlotForm(p => ({ ...p, area: e.target.value }))} />
                        </div>
                        <div>
                            <label className="udp-form-label">{t('profile.unit') || 'Unit'}</label>
                            <select className="udp-input" value={plotForm.unit} onChange={e => setPlotForm(p => ({ ...p, unit: e.target.value }))}>
                                <option value="acres">{t('profile.acres') || 'acres'}</option>
                                <option value="hectares">{t('profile.hectares') || 'hectares'}</option>
                            </select>
                        </div>
                    </div>

                    {/* Advanced Soil Data Section */}
                    <div style={{ marginTop: '8px' }}>
                        <button
                            type="button"
                            className="udp-soil-toggle"
                            onClick={() => setShowSoilFields(v => !v)}
                            style={{ 
                                width: '100%',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: '#f8fafc', 
                                border: '1.5px solid #e2e8f0', 
                                borderRadius: '10px', 
                                padding: '10px 14px', 
                                fontSize: '0.8rem', 
                                color: '#475569', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Database size={14} color="#64748b" />
                                {t('profile.advancedSoilData') || 'Advanced Soil Data'} (pH / NPK)
                            </span>
                            {showSoilFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        
                        {showSoilFields && (
                            <div className="udp-form-grid" style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <label className="udp-form-label">{t('profile.phLevel') || 'pH Level'}</label>
                                    <input className="udp-input" type="number" min="0" max="14" step="0.1" placeholder={t('form.phPlaceholder') || "e.g. 6.5"} value={plotForm.soil_ph} onChange={e => setPlotForm(p => ({ ...p, soil_ph: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="udp-form-label">{t('profile.nKgHa') || 'N (kg/ha)'}</label>
                                    <input className="udp-input" type="number" min="0" step="0.1" placeholder={t('form.nPlaceholder') || "Nitrogen"} value={plotForm.npk_n} onChange={e => setPlotForm(p => ({ ...p, npk_n: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="udp-form-label">{t('profile.pKgHa') || 'P (kg/ha)'}</label>
                                    <input className="udp-input" type="number" min="0" step="0.1" placeholder={t('form.pPlaceholder') || "Phosphorus"} value={plotForm.npk_p} onChange={e => setPlotForm(p => ({ ...p, npk_p: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="udp-form-label">{t('profile.kKgHa') || 'K (kg/ha)'}</label>
                                    <input className="udp-input" type="number" min="0" step="0.1" placeholder={t('form.kPlaceholder') || "Potassium"} value={plotForm.npk_k} onChange={e => setPlotForm(p => ({ ...p, npk_k: e.target.value }))} />
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="udp-submit-btn" disabled={savingPlot} style={{ marginTop: '16px' }}>
                        {savingPlot ? '…' : (t('common.save') || 'Save Plot')}
                    </button>
                </form>
            )}

            {plots.length === 0 && !addingPlot && (
                <div className="udp-empty">
                    <MapPin size={32} />
                    <p>{t('profile.noPlots') || 'No plots yet. Add your first farm or plot.'}</p>
                </div>
            )}

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
                    {/* T6: Soil data pills */}
                    {(plot.soil_ph != null || plot.npk_n != null) && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 4 }}>
                            {plot.soil_ph != null && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: plot.soil_ph < 5.5 || plot.soil_ph > 7.5 ? '#fef3c7' : '#d1fae5', color: plot.soil_ph < 5.5 || plot.soil_ph > 7.5 ? '#d97706' : '#065f46', padding: '2px 8px', borderRadius: 20 }}>
                                    pH {plot.soil_ph} {plot.soil_ph < 5.5 ? (t('profile.acidic') || 'Acidic') : plot.soil_ph > 7.5 ? (t('profile.alkaline') || 'Alkaline') : (t('profile.optimal') || 'Optimal')}
                                </span>
                            )}
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
            {/* Action bar */}
            <div className="udp-tab-actions">
                <button className="udp-add-btn" onClick={() => setAddingNote(v => !v)}>
                    {addingNote ? <X size={16} /> : <Plus size={16} />}
                    {addingNote ? (t('common.cancel') || 'Cancel') : (t('profile.addNote') || 'Add Log Entry')}
                </button>
            </div>

            {/* Structured form */}
            {addingNote && (
                <form className="udp-inline-form" onSubmit={handleAddNote}>
                    {/* Premium AI "Magic" Input */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', 
                        border: '1.5px solid #ddd6fe', 
                        borderRadius: '12px', 
                        padding: '12px 16px', 
                        marginBottom: '20px',
                        boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.1)',
                        display: 'flex', 
                        gap: '12px', 
                        alignItems: 'center' 
                    }}>
                        <div style={{ 
                            background: 'white', 
                            padding: '8px', 
                            borderRadius: '10px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            <Sparkles size={18} color="#8b5cf6" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <input 
                                className="udp-input" 
                                style={{ border: 'none', background: 'transparent', padding: '4px', boxShadow: 'none', fontSize: '0.9rem', fontWeight: 500 }} 
                                placeholder={t('form.nlPlaceholder') || "Type naturally... e.g. 'Sprayed 20L Mancozeb'"}
                                value={enhanceText}
                                onChange={e => setEnhanceText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAutoEnhance(); } }}
                            />
                        </div>
                        <button 
                            type="button" 
                            onClick={() => handleAutoEnhance()}
                            disabled={enhancing || !enhanceText.trim()}
                            style={{ 
                                background: '#8b5cf6', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '8px', 
                                padding: '8px 16px', 
                                fontSize: '0.8rem', 
                                fontWeight: 700, 
                                cursor: 'pointer', 
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)'
                            }}
                        >
                            {enhancing ? '...' : <><Sparkles size={14} />{t('form.autoEnhance') || 'Auto-enhance'}</>}
                        </button>
                    </div>

                    {/* Activity type */}
                    <div>
                        <label className="udp-form-label">{t('profile.activityType') || 'Activity Type'}</label>
                        <div className="udp-activity-grid">
                            {ACTIVITY_TYPES.map(a => (
                                <button
                                    key={a.value}
                                    type="button"
                                    className={`udp-activity-chip ${noteForm.activity_type === a.value ? 'active' : ''}`}
                                    onClick={() => setNoteForm(f => ({ ...f, activity_type: a.value }))}
                                >
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Plot selector */}
                    {plots.length > 0 && (
                        <div>
                            <label className="udp-form-label">{t('profile.plot') || 'Plot / Farm'}</label>
                            <select
                                className="udp-input"
                                value={noteForm.plot_id}
                                onChange={e => setNoteForm(f => ({ ...f, plot_id: e.target.value }))}
                            >
                                <option value="">{t('profile.selectPlot') || 'Select plot (optional)'}</option>
                                {plots.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Chemical fields — only shown for Spray / Fertilize */}
                    {showChemical && (
                        <>
                            <div>
                                <label className="udp-form-label">{t('profile.chemicalName') || 'Pesticide / Fertilizer Name'} <span className="udp-form-required">*</span></label>
                                <input
                                    className="udp-input"
                                    placeholder={t('profile.chemicalNamePlaceholder') || 'e.g. Mancozeb 80% WP'}
                                    value={noteForm.chemical_name}
                                    onChange={e => setNoteForm(f => ({ ...f, chemical_name: e.target.value }))}
                                />
                            </div>
                            <div className="udp-form-row">
                                <div style={{ flex: 1 }}>
                                    <label className="udp-form-label">{t('profile.quantity') || 'Quantity Applied'}</label>
                                    <input
                                        className="udp-input"
                                        placeholder={t('profile.qtyPlaceholder') || 'e.g. 200ml / 15L'}
                                        value={noteForm.chemical_qty}
                                        onChange={e => setNoteForm(f => ({ ...f, chemical_qty: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="udp-form-label">{t('profile.timing') || 'Timing'}</label>
                                    <div className="udp-timing-toggle">
                                        {['AM', 'PM', 'Both'].map(v => (
                                            <button
                                                key={v} type="button"
                                                className={`udp-timing-btn ${noteForm.application_timing === v ? 'active' : ''}`}
                                                onClick={() => setNoteForm(f => ({ ...f, application_timing: v }))}
                                            >{t(`profile.timing${v}`) || v}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Scout fields — only shown for Scout */}
                    {noteForm.activity_type === 'scout' && (
                        <>
                            <div>
                                <label className="udp-form-label">{t('profile.growthStage') || 'Growth Stage'}</label>
                                <select className="udp-input" value={noteForm.growth_stage} onChange={e => setNoteForm(f => ({ ...f, growth_stage: e.target.value }))}>
                                    <option value="Seedling">{t('profile.stageSeedling') || 'Seedling'}</option>
                                    <option value="Vegetative">{t('profile.stageVegetative') || 'Vegetative'}</option>
                                    <option value="Flowering">{t('profile.stageFlowering') || 'Flowering'}</option>
                                    <option value="Fruiting">{t('profile.stageFruiting') || 'Fruiting'}</option>
                                    <option value="Harvest">{t('profile.stageHarvest') || 'Harvest'}</option>
                                </select>
                            </div>
                            <div className="udp-form-row">
                                <div style={{ flex: 1 }}>
                                    <label className="udp-form-label">{t('profile.diseaseIncidence') || 'Disease Incidence (%)'}</label>
                                    <input className="udp-input" type="number" min="0" max="100" placeholder={t('form.incidencePlaceholder') || "e.g. 15"} value={noteForm.disease_incidence} onChange={e => setNoteForm(f => ({ ...f, disease_incidence: e.target.value }))} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="udp-form-label">{t('profile.scoutSeverity') || 'Severity'}</label>
                                    <select className="udp-input" value={noteForm.scout_severity} onChange={e => setNoteForm(f => ({ ...f, scout_severity: e.target.value }))}>
                                        <option value="Low">Low</option>
                                        <option value="Moderate">Moderate</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="udp-form-label">{t('profile.diseaseNameObserved') || 'Disease / Pest Name'} <span className="udp-form-required">*</span></label>
                                <input className="udp-input" placeholder={t('form.diseasePlaceholder') || 'e.g. Aphids or Powdery Mildew'} value={noteForm.disease_name_observed} onChange={e => setNoteForm(f => ({ ...f, disease_name_observed: e.target.value }))} />
                            </div>
                            <div>
                                <label className="udp-form-label">{t('profile.pestNotes') || 'Pest Count / Observations'}</label>
                                <input className="udp-input" placeholder={t('form.pestPlaceholder') || 'e.g. ~10 aphids per leaf'} value={noteForm.pest_notes} onChange={e => setNoteForm(f => ({ ...f, pest_notes: e.target.value }))} />
                            </div>
                        </>
                    )}

                    {/* Harvest fields — only shown for Harvest */}
                    {noteForm.activity_type === 'harvest' && (
                        <>
                            <div className="udp-form-row">
                                <div style={{ flex: 1 }}>
                                    <label className="udp-form-label">{t('profile.kgHarvested') || 'Yield (kg)'} <span className="udp-form-required">*</span></label>
                                    <input className="udp-input" type="number" min="0" step="0.1" placeholder={t('form.kgPlaceholder') || 'e.g. 50'} value={noteForm.kg_harvested} onChange={e => setNoteForm(f => ({ ...f, kg_harvested: e.target.value }))} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="udp-form-label">{t('profile.qualityGrade') || 'Quality Grade'}</label>
                                    <select className="udp-input" value={noteForm.quality_grade} onChange={e => setNoteForm(f => ({ ...f, quality_grade: e.target.value }))}>
                                        <option value="Excellent">{t('profile.qualityExcellent') || 'Excellent'}</option>
                                        <option value="Good">{t('profile.qualityGood') || 'Good'}</option>
                                        <option value="Fair">{t('profile.qualityFair') || 'Fair'}</option>
                                        <option value="Poor">{t('profile.qualityPoor') || 'Poor'}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="udp-form-row">
                                <div style={{ flex: 1 }}>
                                    <label className="udp-form-label">{t('profile.pricePerKg') || 'Price per kg (RM)'}</label>
                                    <input className="udp-input" type="number" min="0" step="0.01" placeholder={t('form.pricePlaceholder') || 'e.g. 8.50'} value={noteForm.price_per_kg} onChange={e => setNoteForm(f => ({ ...f, price_per_kg: e.target.value }))} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="udp-form-label">{t('profile.buyerName') || 'Buyer Name'}</label>
                                    <input className="udp-input" placeholder={t('form.buyerPlaceholder') || 'e.g. Ah Chong'} value={noteForm.buyer_name} onChange={e => setNoteForm(f => ({ ...f, buyer_name: e.target.value }))} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Environmental conditions */}
                    <div className="udp-form-grid">
                        <div>
                            <label className="udp-form-label">{t('profile.tempAM') || 'Temperature (°C)'}</label>
                            <input
                                type="number" min="0" max="50" step="0.1"
                                className="udp-input"
                                placeholder={t('form.tempPlaceholder') || "e.g. 28"}
                                value={noteForm.temperature_am}
                                onChange={e => setNoteForm(f => ({ ...f, temperature_am: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="udp-form-label">{t('profile.humidity') || 'Humidity (%)'}</label>
                            <input
                                type="number" min="0" max="100"
                                className="udp-input"
                                placeholder={t('form.humPlaceholder') || "e.g. 75"}
                                value={noteForm.humidity}
                                onChange={e => setNoteForm(f => ({ ...f, humidity: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Notes free text */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label className="udp-form-label" style={{ marginBottom: 0 }}>{t('profile.notes') || 'Notes / Remarks'}</label>
                            <button
                                type="button"
                                onClick={() => handleAutoEnhance()}
                                disabled={enhancing || !noteForm.note.trim()}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#8b5cf6',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    transition: 'background 0.2s'
                                }}
                                className="udp-enhance-btn"
                            >
                                <Sparkles size={12} />
                                {enhancing ? '...' : (t('form.magicEnhance') || 'Magic Enhance')}
                            </button>
                        </div>
                        <textarea
                            className="udp-input"
                            rows={3}
                            placeholder={t('profile.notePlaceholder') || 'Additional observations for today…'}
                            value={noteForm.note}
                            onChange={e => setNoteForm(f => ({ ...f, note: e.target.value }))}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>

                    {/* Expenses Section */}
                    <div className="udp-form-grid">
                        <div>
                            <label className="udp-form-label">{t('profile.expenseCategory') || 'Expense Category'}</label>
                            <select
                                className="udp-input"
                                value={noteForm.expense_category}
                                onChange={e => setNoteForm(f => ({ ...f, expense_category: e.target.value }))}
                            >
                                <option value="Fertilizer">{t('profile.catFertilizer') || 'Fertilizer'}</option>
                                <option value="Pesticide">{t('profile.catPesticide') || 'Pesticide'}</option>
                                <option value="Labor">{t('profile.catLabor') || 'Labor'}</option>
                                <option value="Equipment">{t('profile.catEquipment') || 'Equipment'}</option>
                                <option value="Other">{t('profile.catOther') || 'Other'}</option>
                            </select>
                        </div>
                        <div>
                            <label className="udp-form-label">{t('profile.expense') || 'Cost (RM)'}</label>
                            <input
                                className="udp-input"
                                type="number" min="0" step="0.01"
                                placeholder={t('form.expensePlaceholder') || "e.g. 50"}
                                value={noteForm.expense_amount}
                                onChange={e => setNoteForm(f => ({ ...f, expense_amount: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Photo Attachment */}
                    <div>
                        <label className="udp-form-label">{t('profile.photoAttachment') || 'Photo Attachment'} <span style={{ fontWeight: 400, opacity: 0.6 }}>{t('profile.photoOptional') || '(Optional)'}</span></label>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <label style={{ 
                                flex: 1, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: 10, 
                                background: '#f8fafc', 
                                border: '2px dashed #cbd5e1', 
                                borderRadius: '12px', 
                                padding: '16px', 
                                cursor: 'pointer', 
                                fontSize: '0.85rem', 
                                color: '#475569', 
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }} className="udp-photo-upload-label">
                                <Plus size={18} />
                                {noteForm.photo_base64 ? (t('profile.changePhoto') || 'Change Photo') : (t('profile.takeUploadPhoto') || 'Take / Upload Photo')}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = ev => setNoteForm(f => ({ ...f, photo_base64: ev.target.result }));
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                            {noteForm.photo_base64 && (
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <img src={noteForm.photo_base64} alt="preview" style={{ width: 70, height: 70, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                    <button
                                        type="button"
                                        onClick={() => setNoteForm(f => ({ ...f, photo_base64: '' }))}
                                        style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                    >✕</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <button type="submit" className="udp-submit-btn" disabled={savingNote}>
                        {savingNote ? '…' : (t('common.save') || 'Save Entry')}
                    </button>
                </form>
            )}

            {/* Empty state */}
            {notes.length === 0 && !addingNote && (
                <div className="udp-empty">
                    <FileText size={32} />
                    <p>{t('profile.noNotes') || 'No daily log entries yet. Record your farm activities here.'}</p>
                </div>
            )}

            {/* Log list */}
            {notes.map(note => {
                const badgeCfg = ACTIVITY_BADGE_COLOR[note.activity_type] ?? ACTIVITY_BADGE_COLOR.note;
                const typeLabel = ACTIVITY_TYPES.find(a => a.value === note.activity_type)?.label ?? '📝 Note';
                const plotName = plots.find(p => p.id === note.plot_id)?.name;
                return (
                    <div key={note.id} className="udp-note-card">
                        <div className="udp-note-top">
                            <span className="udp-note-badge" style={{ background: badgeCfg.bg, color: badgeCfg.color }}>{typeLabel}</span>
                            {plotName && <span className="udp-note-plot">📍 {plotName}</span>}
                            <span className="udp-note-date">{relDate(note.created_at, t)}</span>
                        </div>
                        {note.chemical_name && (
                            <div className="udp-note-chem">
                                🧪 <strong>{note.chemical_name}</strong>
                                {note.chemical_qty && <> · {note.chemical_qty}</>}
                                {note.application_timing && <> · {note.application_timing}</>}
                            </div>
                        )}
                        {note.activity_type === 'scout' && (
                            <div className="udp-note-chem">
                                🔍 <strong>{note.disease_name_observed || 'Field Check'}</strong>
                                {note.growth_stage && <> · {note.growth_stage}</>}
                                {note.disease_incidence != null && <> · {note.disease_incidence}% Incidence</>}
                                <br/>
                                <span style={{ color: note.scout_severity === 'High' ? '#ef4444' : (note.scout_severity === 'Moderate' ? '#f59e0b' : '#374151'), fontSize: '0.75rem', fontWeight: 600 }}>
                                    Severity: {note.scout_severity || 'Low'}
                                </span>
                            </div>
                        )}
                        {note.activity_type === 'harvest' && (
                            <div className="udp-note-chem">
                                🍎 <strong>{note.kg_harvested} kg</strong> ({t(`profile.quality${note.quality_grade}`) || note.quality_grade || 'Unrated'})
                                {note.price_per_kg != null && <> · RM{Number(note.price_per_kg).toFixed(2)}/kg</>}
                                {note.buyer_name && <> · {t('profile.soldTo') || 'Sold to'}: {note.buyer_name}</>}
                                {(note.kg_harvested != null && note.price_per_kg != null) && (
                                    <div style={{ color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                                        💰 {t('profile.estRevenue') || 'Est. Revenue'}: +RM{(note.kg_harvested * note.price_per_kg).toFixed(2)}
                                    </div>
                                )}
                            </div>
                        )}
                        {(note.expense_amount != null && note.expense_amount !== '') && (
                            <div className="udp-note-chem" style={{ color: '#dc2626', fontWeight: 600 }}>
                                💸 Expense: -RM{Number(note.expense_amount).toFixed(2)} {note.expense_category && <span style={{ color: '#ef4444', fontWeight: 400, marginLeft: '4px' }}>({note.expense_category})</span>}
                            </div>
                        )}
                        {(note.temperature_am != null || note.humidity != null) && (
                            <div className="udp-note-env">
                                {note.temperature_am != null && <span>🌡 {note.temperature_am}°C</span>}
                                {note.humidity != null && <span>💧 {note.humidity}% RH</span>}
                            </div>
                        )}
                        {note.pest_notes && <p className="udp-note-text" style={{ fontStyle: 'italic', color: '#6b7280' }}>↳ {note.pest_notes}</p>}
                        {note.note && <p className="udp-note-text">{note.note}</p>}
                        {/* T4: Photo thumbnail in feed */}
                        {note.photo_url && (
                            <img
                                src={note.photo_url}
                                alt="Field photo"
                                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginTop: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                                onClick={() => window.open(note.photo_url, '_blank')}
                            />
                        )}
                    </div>
                );
            })}

            <style>{`
                .udp-form-label {
                    display: block; font-size: 0.78rem; font-weight: 600;
                    color: #475569; margin-bottom: 6px;
                }
                .udp-form-required { color: #ef4444; }
                .udp-form-row { display: flex; gap: 12px; align-items: flex-start; }
                .udp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

                /* Activity chips */
                .udp-activity-grid {
                    display: flex; flex-wrap: wrap; gap: 8px;
                }
                .udp-activity-chip {
                    padding: 8px 16px; border-radius: 999px;
                    border: 1.5px solid #e2e8f0; background: white;
                    font-size: 0.8rem; font-weight: 500; color: #64748b;
                    cursor: pointer; transition: all 0.2s;
                }
                .udp-activity-chip.active {
                    border-color: #00B14F;
                    background: #00B14F;
                    color: white;
                    box-shadow: 0 4px 6px rgba(0, 177, 79, 0.2);
                }
                .udp-activity-chip:hover:not(.active) { border-color: #cbd5e1; background: #f8fafc; }

                /* Timing toggle */
                .udp-timing-toggle {
                    display: flex; border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden;
                }
                .udp-timing-btn {
                    flex: 1; padding: 10px 12px;
                    border: none; border-right: 1px solid #e2e8f0;
                    background: white; font-size: 0.8rem; font-weight: 600;
                    color: #64748b; cursor: pointer; transition: all 0.15s;
                    white-space: nowrap;
                }
                .udp-timing-btn:last-child { border-right: none; }
                .udp-timing-btn.active { background: #f1f8f1; color: #008C3E; }

                /* Photo upload hover */
                .udp-photo-upload-label:hover {
                    border-color: #94a3b8 !important;
                    background: #f1f5f9 !important;
                }

                /* Note cards */
                .udp-note-card {
                    background: white; border: 1px solid #e2e8f0; border-radius: 12px;
                    padding: 16px; margin-bottom: 12px;
                    display: flex; flex-direction: column; gap: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .udp-note-card:last-child { margin-bottom: 0; }
                .udp-note-top {
                    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
                }
                .udp-note-badge {
                    display: inline-block; padding: 2px 10px; border-radius: 999px;
                    font-size: 0.72rem; font-weight: 700;
                }
                .udp-note-plot { font-size: 0.75rem; color: #64748b; font-weight: 500; }
                .udp-note-date {
                    margin-left: auto; font-size: 0.72rem; font-weight: 600;
                    color: #94a3b8; text-transform: uppercase; white-space: nowrap;
                }
                .udp-note-chem {
                    font-size: 0.85rem; color: #1e293b; line-height: 1.4;
                }
                .udp-note-chem strong { color: #0f172a; }
                .udp-note-env {
                    display: flex; gap: 12px;
                    font-size: 0.78rem; color: #64748b;
                }
                .udp-note-text {
                    margin: 6px 0 0; font-size: 0.9rem; color: #334155;
                    line-height: 1.6; white-space: pre-wrap;
                }
            `}</style>
        </div>
    );

    // ── Tabs config ───────────────────────────────────────────────────────────
    const TABS = [
        { id: 'overview', label: t('profile.tabOverview') || 'Overview' },
        { id: 'reports',  label: t('profile.tabReports')  || 'Reports'  },
        { id: 'plots',    label: t('profile.tabPlots')    || 'Plots'    },
        { id: 'notes',    label: t('profile.tabNotes')    || 'Daily Log'},
    ];

    const activeAlertCount = alerts.filter(s => !acknowledgedIds.includes(s.id)).length;

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="udp-container">

            {/* Profile Card — Enhanced */}
            <div className="udp-profile-card">
                {/* Decorative background blobs */}
                <div className="udp-profile-blob udp-profile-blob-1" />
                <div className="udp-profile-blob udp-profile-blob-2" />

                {/* Top row: avatar + sign-out */}
                <div className="udp-profile-top-row">
                    <div className="udp-avatar-wrapper">
                        <div className="udp-avatar-ring" />
                        <div className="udp-avatar">{initials}</div>
                        <span className="udp-avatar-status" title="Online" />
                    </div>
                    <button className="udp-signout-mini" onClick={handleSignOut} disabled={signingOut} title="Sign out">
                        <LogOut size={15} />
                    </button>
                </div>

                {/* Name + email */}
                <div className="udp-profile-identity">
                    <h2 className="udp-display-name">{displayName}</h2>
                    <p className="udp-email">
                        <span className="udp-email-dot" />
                        {email}
                    </p>
                </div>

                {/* Badge row */}
                <div className="udp-profile-badges">
                    <span className="udp-badge udp-badge-verified">
                        <ShieldCheck size={11} />
                        {t('profile.verifiedFarmer') || 'Verified Farmer'}
                    </span>
                    {stats.total > 0 && (
                        <span className="udp-badge udp-badge-scans">
                            <ScanLine size={11} />
                            {stats.total} {t('profile.totalScans') || 'Scans'}
                        </span>
                    )}
                    {checklistPct >= 50 && (
                        <span className="udp-badge udp-badge-gap">
                            <ShieldCheck size={11} />
                            GAP {checklistPct}%
                        </span>
                    )}
                </div>

                {/* Mini stat strip */}
                <div className="udp-profile-strip">
                    <div className="udp-strip-item">
                        <span className="udp-strip-num">{stats.healthy}</span>
                        <span className="udp-strip-label">{t('profile.healthy') || 'Healthy'}</span>
                    </div>
                    <div className="udp-strip-divider" />
                    <div className="udp-strip-item">
                        <span className="udp-strip-num udp-strip-warn">{stats.diseases}</span>
                        <span className="udp-strip-label">{t('profile.diseased') || 'Issues'}</span>
                    </div>
                    <div className="udp-strip-divider" />
                    <div className="udp-strip-item">
                        <span className="udp-strip-num">{plots.length}</span>
                        <span className="udp-strip-label">{t('profile.plots') || 'Plots'}</span>
                    </div>
                    <div className="udp-strip-divider" />
                    <div className="udp-strip-item">
                        <span className="udp-strip-num udp-strip-purple">{notes.length}</span>
                        <span className="udp-strip-label">{t('profile.tabNotes') || 'Logs'}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="udp-tabs">
                {TABS.map(t2 => (
                    <button key={t2.id} className={`udp-tab ${tab === t2.id ? 'active' : ''}`} onClick={() => setTab(t2.id)}>
                        {t2.label}
                        {t2.id === 'overview' && activeAlertCount > 0 && (
                            <span className="udp-tab-badge">{activeAlertCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="udp-tab-content">
                {tab === 'overview' && <OverviewTab />}
                {tab === 'reports'  && <ReportsTab />}
                {tab === 'plots'    && <PlotsTab />}
                {tab === 'notes'    && <NotesTab />}
            </div>

            {/* Alert detail modal */}
            {selectedAlert && (
                <AlertDetailModal
                    scan={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                    onAcknowledge={handleAcknowledge}
                />
            )}

            {/* Styles */}
            <style>{`
                .udp-container {
                    max-width: 480px;
                    margin: 0 auto;
                    padding: 16px 16px 60px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                /* ── Enhanced Profile Card ─────────────────────────────────── */
                .udp-profile-card {
                    position: relative; overflow: hidden;
                    background: linear-gradient(145deg, #f0fdf4 0%, #dcfce7 55%, #bbf7d0 100%);
                    border: 1.5px solid #86efac; border-radius: 24px;
                    padding: 20px 20px 0 20px;
                    display: flex; flex-direction: column; gap: 14px;
                    box-shadow: 0 4px 20px rgba(0,177,79,0.12), 0 1px 4px rgba(0,0,0,0.04);
                }

                /* Decorative blobs */
                .udp-profile-blob {
                    position: absolute; border-radius: 50%;
                    pointer-events: none; z-index: 0;
                }
                .udp-profile-blob-1 {
                    width: 140px; height: 140px;
                    background: radial-gradient(circle, rgba(0,177,79,0.15) 0%, transparent 70%);
                    top: -40px; right: -30px;
                }
                .udp-profile-blob-2 {
                    width: 90px; height: 90px;
                    background: radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%);
                    bottom: 30px; left: -20px;
                }

                /* Top row */
                .udp-profile-top-row {
                    position: relative; z-index: 1;
                    display: flex; align-items: flex-start; justify-content: space-between;
                }

                /* Avatar wrapper + ring + status */
                .udp-avatar-wrapper { position: relative; flex-shrink: 0; }
                .udp-avatar-ring {
                    position: absolute; inset: -3px; border-radius: 50%;
                    border: 2.5px solid transparent;
                    background: linear-gradient(135deg, #00B14F, #4ade80, #00B14F) border-box;
                    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: destination-out;
                    mask-composite: exclude;
                    animation: ring-spin 4s linear infinite;
                }
                @keyframes ring-spin {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .udp-avatar {
                    position: relative; z-index: 1;
                    width: 60px; height: 60px; border-radius: 50%;
                    background: linear-gradient(135deg, #00B14F 0%, #059669 100%);
                    color: white; font-size: 1.45rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 6px 16px rgba(0,177,79,0.35);
                    letter-spacing: -0.5px;
                }
                .udp-avatar-status {
                    position: absolute; bottom: 3px; right: 3px; z-index: 2;
                    width: 12px; height: 12px; border-radius: 50%;
                    background: #22c55e;
                    border: 2px solid white;
                    box-shadow: 0 0 0 2px rgba(34,197,94,0.3);
                    animation: status-pulse 2.5s ease-in-out infinite;
                }
                @keyframes status-pulse {
                    0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.3); }
                    50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0.0); }
                }

                /* Identity */
                .udp-profile-identity { position: relative; z-index: 1; }
                .udp-display-name {
                    font-size: 1.2rem; font-weight: 800; color: #0f172a;
                    margin: 0 0 4px; letter-spacing: -0.3px;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .udp-email {
                    display: flex; align-items: center; gap: 6px;
                    font-size: 0.78rem; color: #475569; margin: 0;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .udp-email-dot {
                    flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%;
                    background: #00B14F;
                }

                /* Badge row */
                .udp-profile-badges {
                    position: relative; z-index: 1;
                    display: flex; flex-wrap: wrap; gap: 6px;
                }
                .udp-badge {
                    display: inline-flex; align-items: center; gap: 4px;
                    border-radius: 999px; padding: 3px 10px;
                    font-size: 0.68rem; font-weight: 700;
                }
                .udp-badge-verified {
                    background: white; color: #00B14F;
                    border: 1.5px solid #86efac;
                    box-shadow: 0 1px 4px rgba(0,177,79,0.12);
                }
                .udp-badge-scans {
                    background: #eff6ff; color: #1d4ed8;
                    border: 1.5px solid #bfdbfe;
                }
                .udp-badge-gap {
                    background: #fef3c7; color: #b45309;
                    border: 1.5px solid #fde68a;
                }

                /* Mini stat strip */
                .udp-profile-strip {
                    position: relative; z-index: 1;
                    display: flex; align-items: center;
                    background: rgba(255,255,255,0.7);
                    backdrop-filter: blur(8px);
                    border-top: 1px solid rgba(255,255,255,0.9);
                    border-radius: 0 0 20px 20px;
                    margin: 0 -20px; padding: 12px 20px;
                }
                .udp-strip-item {
                    flex: 1; text-align: center;
                    display: flex; flex-direction: column; gap: 2px;
                }
                .udp-strip-num {
                    font-size: 1.15rem; font-weight: 800;
                    color: #0f172a; letter-spacing: -0.5px; line-height: 1;
                }
                .udp-strip-num.udp-strip-warn   { color: #f59e0b; }
                .udp-strip-num.udp-strip-purple { color: #7c3aed; }
                .udp-strip-label {
                    font-size: 0.58rem; font-weight: 700;
                    color: #64748b; text-transform: uppercase; letter-spacing: 0.4px;
                }
                .udp-strip-divider {
                    width: 1px; height: 28px;
                    background: rgba(0,0,0,0.08); margin: 0 4px;
                }

                /* Sign-out button */
                .udp-signout-mini {
                    background: rgba(255,255,255,0.8); border: 1px solid #fecaca; color: #ef4444;
                    border-radius: 10px; padding: 7px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.15s; backdrop-filter: blur(4px);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                }
                .udp-signout-mini:hover { background: #fef2f2; border-color: #f87171; transform: scale(1.05); }
                .udp-signout-mini:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Tabs */
                .udp-tabs {
                    display: flex; gap: 4px;
                    background: var(--color-bg-secondary); border-radius: var(--radius-lg); padding: 4px;
                }
                .udp-tab {
                    flex: 1; padding: var(--radius-sm) 4px;
                    border: none; border-radius: var(--radius-sm); background: none;
                    font-size: 0.72rem; font-weight: 700; color: var(--color-text-secondary);
                    cursor: pointer; transition: all 0.2s;
                    display: flex; align-items: center; justify-content: center; gap: 4px;
                    white-space: nowrap;
                }
                .udp-tab.active { background: white; color: var(--color-primary); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
                .udp-tab-badge {
                    background: #ef4444; color: white; border-radius: 999px;
                    padding: 1px 5px; font-size: 0.62rem; font-weight: 800; line-height: 1.4;
                }
                .udp-tab-content { display: flex; flex-direction: column; gap: var(--radius-lg); }

                /* Stats */
                .udp-stats-row {
                    display: flex; align-items: center;
                    background: white; border: 1px solid var(--color-border); border-radius: 16px;
                    padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
                }
                .udp-stat { flex: 1; text-align: center; display: flex; flex-direction: column; gap: 3px; }
                .udp-stat-divider { width: 1px; height: 32px; background: var(--color-border); margin: 0 2px; }
                .udp-stat-num { font-size: 1.5rem; font-weight: 800; color: var(--color-text-primary); letter-spacing: -1px; line-height: 1; }
                .udp-stat-num.udp-stat-warn  { color: #f59e0b; }
                .udp-stat-num.udp-stat-green { color: var(--color-primary); }
                .udp-stat-label { font-size: 0.62rem; font-weight: 600; color: var(--color-text-light); text-transform: uppercase; }

                .udp-last-scan { display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: 0.82rem; padding: 0 2px; }
                .udp-last-scan svg { color: var(--color-primary); }

                /* Sections */
                .udp-section {
                    background: white; border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); overflow: hidden;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
                }
                .udp-section-alert    { border-color: #fecaca; }
                .udp-section-resolved { border-color: #bbf7d0; }
                .udp-section-alert    .udp-sh-icon  { color: #ef4444 !important; }
                .udp-section-alert    .udp-sh-title { color: #b91c1c; }
                .udp-section-resolved .udp-sh-icon  { color: #16a34a !important; }
                .udp-section-resolved .udp-sh-title { color: #15803d; }

                .udp-section-header {
                    display: flex; align-items: center; gap: var(--radius-sm);
                    padding: var(--radius-md) var(--radius-lg); border-bottom: 1px solid var(--color-bg-secondary);
                    font-size: 0.82rem; font-weight: 700; color: var(--color-text-primary);
                }
                .udp-sh-icon  { color: var(--color-primary); display: flex; }
                .udp-sh-title { flex: 1; }
                .udp-see-all {
                    display: flex; align-items: center; gap: 2px;
                    background: none; border: none; color: var(--color-primary);
                    font-size: 0.75rem; font-weight: 700; cursor: pointer; padding: 0;
                }

                /* Alert rows */
                .udp-alert-row {
                    display: flex; align-items: center; gap: var(--radius-sm);
                    padding: var(--radius-sm) var(--radius-lg); background: #fff7ed;
                    border: none; border-bottom: 1px solid #fef3c7;
                    cursor: pointer; text-align: left; width: 100%;
                    transition: background 0.15s;
                }
                .udp-alert-row:last-child { border-bottom: none; }
                .udp-alert-row:hover { background: #fef9c3; }
                .udp-alert-dot {
                    width: 9px; height: 9px; border-radius: 50%;
                    background: #ef4444; flex-shrink: 0;
                    box-shadow: 0 0 0 3px rgba(239,68,68,0.2);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.2); }
                    50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0.05); }
                }
                .udp-alert-hint {
                    font-size: 0.67rem; font-weight: 700; color: #ea580c;
                    flex-shrink: 0; white-space: nowrap;
                }

                /* Scan rows */
                .udp-scan-row {
                    display: flex; align-items: center; gap: var(--radius-sm);
                    padding: var(--radius-sm) var(--radius-lg); background: none;
                    border: none; border-bottom: 1px solid var(--color-bg-secondary);
                    cursor: pointer; text-align: left; transition: background 0.15s; width: 100%;
                }
                .udp-scan-row:last-child { border-bottom: none; }
                .udp-scan-row:hover { background: var(--color-bg-secondary); }
                .udp-row-resolved { background: #f0fdf4; }
                .udp-row-resolved:hover { background: #dcfce7; }
                .udp-resolved-text { color: var(--color-text-secondary) !important; text-decoration: line-through; }
                .udp-scan-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
                .udp-scan-dot.healthy { background: #22c55e; }
                .udp-scan-dot.disease { background: #f59e0b; }
                .udp-scan-info { flex: 1; min-width: 0; }
                .udp-scan-name { display: block; font-size: 0.85rem; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .udp-scan-cat  { display: block; font-size: 0.72rem; color: var(--color-text-light); margin-top: 1px; }
                .udp-chevron   { color: var(--color-border); flex-shrink: 0; }

                /* Log rows */
                .udp-log-row { display: flex; align-items: flex-start; gap: var(--radius-sm); padding: var(--radius-sm) var(--radius-lg); border-bottom: 1px solid var(--color-bg-secondary); }
                .udp-log-row:last-child { border-bottom: none; }
                .udp-log-icon { color: var(--color-primary); flex-shrink: 0; margin-top: 2px; }

                /* Quick actions */
                .udp-actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
                .udp-action-btn {
                    display: flex; flex-direction: column; align-items: center; gap: 7px;
                    padding: var(--radius-lg) 6px; background: none; border: none; cursor: pointer;
                    transition: background 0.15s; font-size: 0.68rem; font-weight: 700; color: var(--color-text-primary);
                }
                .udp-action-btn:hover { background: var(--color-bg-secondary); }
                .udp-action-icon {
                    width: 42px; height: 42px; border-radius: 13px;
                    display: flex; align-items: center; justify-content: center; color: white;
                }
                .udp-action-icon.scan-icon    { background: linear-gradient(135deg,#22c55e,#16a34a); }
                .udp-action-icon.logs-icon    { background: linear-gradient(135deg,#60a5fa,#3b82f6); }
                .udp-action-icon.mygap-icon   { background: linear-gradient(135deg,#a78bfa,#7c3aed); }
                .udp-action-icon.shop-icon    { background: linear-gradient(135deg,#fb7185,#e11d48); }
                .udp-action-icon.guide-icon   { background: linear-gradient(135deg,#fbbf24,#d97706); }
                .udp-action-icon.book-icon    { background: linear-gradient(135deg,#38bdf8,#0284c7); }

                /* Reports */
                .udp-reports { display: flex; flex-direction: column; gap: var(--radius-lg); }
                .udp-report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--radius-sm); }
                .udp-report-card {
                    background: white; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px;
                    display: flex; flex-direction: column; gap: 4px;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
                }
                .udp-report-num   { font-size: 2rem; font-weight: 800; color: var(--color-text-primary); letter-spacing: -1px; }
                .udp-report-label { font-size: 0.72rem; font-weight: 600; color: var(--color-text-light); text-transform: uppercase; }
                .udp-bar-row    { display: flex; align-items: center; gap: var(--radius-sm); margin-bottom: var(--radius-sm); }
                .udp-bar-row:last-child { margin-bottom: 0; }
                .udp-bar-label  { font-size: 0.78rem; font-weight: 600; color: var(--color-text-secondary); width: 64px; flex-shrink: 0; }
                .udp-bar-track  { flex: 1; height: var(--radius-sm); background: var(--color-bg-secondary); border-radius: 99px; overflow: hidden; }
                .udp-bar-fill   { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
                .udp-bar-green  { background: var(--gradient-primary); }
                .udp-bar-amber  { background: #f59e0b; }
                .udp-bar-pct    { font-size: 0.78rem; font-weight: 700; color: var(--color-text-primary); width: 24px; text-align: right; }

                /* Forms */
                .udp-tab-actions { display: flex; justify-content: flex-end; }
                .udp-add-btn {
                    display: flex; align-items: center; gap: 6px;
                    background: var(--gradient-primary); color: white;
                    border: none; border-radius: var(--radius-sm); padding: var(--radius-sm) var(--radius-lg);
                    font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: background 0.2s;
                }
                .udp-add-btn:hover { background: var(--color-primary-dark); }
                .udp-inline-form {
                    background: white; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--radius-lg);
                    display: flex; flex-direction: column; gap: var(--radius-sm);
                    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
                }
                .udp-input {
                    width: 100%; padding: var(--radius-sm) var(--radius-md);
                    border: 1px solid var(--color-border); border-radius: var(--radius-sm);
                    font-size: 0.88rem; color: var(--color-text-primary); outline: none;
                    background: var(--color-bg-secondary); box-sizing: border-box;
                    font-family: inherit;
                }
                .udp-input:focus { border-color: var(--color-primary); background: white; }
                .udp-submit-btn {
                    padding: var(--radius-sm); background: var(--gradient-primary); color: white;
                    border: none; border-radius: var(--radius-sm); font-size: 0.88rem;
                    font-weight: 700; cursor: pointer; transition: background 0.2s;
                }
                .udp-submit-btn:hover { background: var(--color-primary-dark); }
                .udp-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                /* Plot cards */
                .udp-plot-card {
                    display: flex; align-items: center; gap: var(--radius-md);
                    background: white; border: 1px solid var(--color-border); border-radius: var(--radius-md);
                    padding: var(--radius-md) var(--radius-lg); margin-bottom: var(--radius-sm);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
                }
                .udp-plot-card:last-child { margin-bottom: 0; }
                .udp-plot-icon {
                    width: 3var(--radius-sm); height: 3var(--radius-sm); border-radius: var(--radius-sm);
                    background: #d1fae5; color: var(--color-primary);
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .udp-plot-info { flex: 1; min-width: 0; }
                .udp-plot-name { display: block; font-size: 0.88rem; font-weight: 700; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .udp-plot-meta { display: block; font-size: 0.72rem; color: var(--color-text-light); margin-top: 2px; }
                .udp-delete-btn {
                    background: none; border: none; color: var(--color-border); cursor: pointer; padding: 4px;
                    border-radius: 6px; display: flex; transition: color 0.15s, background 0.15s;
                }
                .udp-delete-btn:hover { color: #ef4444; background: #fef2f2; }

                /* Note cards */
                .udp-note-card {
                    background: white; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--radius-lg); margin-bottom: var(--radius-sm);
                }
                .udp-note-card:last-child { margin-bottom: 0; }
                .udp-note-date { font-size: 0.7rem; font-weight: 700; color: var(--color-text-light); text-transform: uppercase; }
                .udp-note-text { margin: 6px 0 0; font-size: 0.88rem; color: var(--color-text-primary); line-height: 1.5; white-space: pre-wrap; }

                /* Empty */
                .udp-empty {
                    display: flex; flex-direction: column; align-items: center; gap: var(--radius-sm);
                    padding: 40px 20px; color: var(--color-text-light); text-align: center;
                }
                .udp-empty svg { color: var(--color-border); }
                .udp-empty p { font-size: 0.88rem; margin: 0; }

                @media (max-width: 360px) {
                    .udp-tab { font-size: 0.64rem; padding: 7px 2px; }
                }
            `}</style>
        </div>
    );
};

export default UserDashboardPanel;
