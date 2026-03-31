import React, { useMemo } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Calendar,
    MapPin,
    BrainCircuit,
    ShieldCheck,
    ScanLine,
    Sprout,
    Sun,
    Cloud,
    Sparkles,
    CheckSquare,
    Info,
    ChevronRight,
    BookOpen,
    Database,
    Leaf,
} from 'lucide-react';
import { deriveFarmingNotice } from '../../hooks/useWeather';
import SectionHeader from './SectionHeader';
import { QUICK_ACTIONS } from '../../data/config';

const OverviewTab = ({
    alerts,
    acknowledgedIds,
    notes,
    scanHistory,
    t,
    stats,
    hasLoggedToday,
    streak,
    setTab,
    setAddingNote,
    complianceNudges,
    setNoteForm,
    emptyForm,
    navigate,
    assessingRisk,
    predictiveRisk,
    forecast,
    weatherError,
    checklistPct,
    plots,
    relDate,
    onSelectAlert,
    onGenerateInsights,
    generatingInsights,
    aiInsights,
    onPrefillRecommendedTreatment,
    label: labelProp,
}) => {

    const label = (key, fallback) => {
        if (typeof labelProp === 'function') return labelProp(key, fallback);
        const value = t(key);
        return value && value !== key ? value : fallback;
    };

    const activeAlerts = useMemo(
        () => alerts.filter((scan) => !acknowledgedIds.includes(scan.id)),
        [acknowledgedIds, alerts],
    );
    const harvestLogs = useMemo(
        () => notes.filter((note) => note.activity_type === 'harvest'),
        [notes],
    );
    const recentHistory = useMemo(() => scanHistory.slice(0, 3), [scanHistory]);
    const resolvedWeatherError = weatherError ? label(weatherError, weatherError) : '';
    const summaryCards = useMemo(() => ([
        {
            id: 'status',
            icon: activeAlerts.length > 0 ? AlertTriangle : CheckCircle2,
            title: label('profile.farmStatus', 'Farm Status'),
            value: activeAlerts.length > 0
                ? `${activeAlerts.length} ${label('profile.urgentAlerts', 'urgent alerts')}`
                : label('profile.allClear', 'All clear'),
            meta: activeAlerts.length > 0
                ? label('profile.actionRequired', 'Action required')
                : label('profile.noUrgentIssues', 'No urgent disease issue'),
            tone: activeAlerts.length > 0 ? 'alert' : 'healthy',
        },
        {
            id: 'streak',
            icon: Calendar,
            title: label('profile.todayLog', "Today's Log"),
            value: hasLoggedToday
                ? label('profile.logged', 'Logged today')
                : label('profile.notYet', 'Not logged'),
            meta: `${streak} ${label('profile.streak', 'day streak')}`,
            tone: hasLoggedToday ? 'healthy' : 'warning',
        },
    ]), [activeAlerts.length, hasLoggedToday, label, streak]);

    const primaryWeather = useMemo(() => {
        const firstDay = (forecast || [])[0];
        if (!firstDay) return null;
        const notice = deriveFarmingNotice(firstDay);
        return {
            temp: Math.round(firstDay.tempMax),
            label: label(notice.key, 'Good'),
            status: notice.status,
        };
    }, [forecast, label]);

    const aiCardData = (aiInsights?.scopeKey === 'overview' ? aiInsights : null) || (
        predictiveRisk?.hasRisk
            ? {
                summary: predictiveRisk.warningMessage,
                recommendations: predictiveRisk.suggestedAction ? [predictiveRisk.suggestedAction] : [],
            }
            : null
    );

    const recommendedActionIds = useMemo(() => {
        const recommended = [];

        if (activeAlerts.length > 0) {
            recommended.push('scout', 'spray');
        } else if (!hasLoggedToday) {
            recommended.push('daily-log');
        } else if (plots.length === 0) {
            recommended.push('plots');
        } else if (predictiveRisk?.hasRisk) {
            recommended.push('scout');
        } else {
            recommended.push('scan');
        }

        if (predictiveRisk?.hasRisk && !recommended.includes('reports')) {
            recommended.push('reports');
        }

        return new Set(recommended.slice(0, 2));
    }, [activeAlerts.length, hasLoggedToday, plots.length, predictiveRisk?.hasRisk]);

    const priorityCard = useMemo(() => {
        if (activeAlerts.length > 0) {
            const topAlert = activeAlerts[0];
            return {
                icon: AlertTriangle,
                tone: 'alert',
                kicker: label('profile.topPriority', 'Top Priority'),
                title: label('profile.reviewUrgentAlert', 'Review urgent alert'),
                description: `${topAlert?.disease || topAlert?.name || label('results.disease', 'Disease')} - ${label('profile.actionRequired', 'Action required now')}`,
                actionLabel: label('profile.reviewNow', 'Review now'),
                action: () => onSelectAlert(topAlert),
            };
        }

        if (!hasLoggedToday) {
            return {
                icon: Calendar,
                tone: 'warning',
                kicker: label('profile.todayFocus', 'Today Focus'),
                title: label('profile.logDailyTask', 'Log a daily farm task'),
                description: label('profile.logDailyHint', 'Record scouting, spray, or harvest to keep your farm timeline updated.'),
                actionLabel: label('profile.tabNotes', 'Daily Log'),
                action: () => {
                    setTab('notes');
                    setAddingNote(true);
                },
            };
        }

        if (plots.length === 0) {
            return {
                icon: MapPin,
                tone: 'neutral',
                kicker: label('profile.setupNext', 'Next Setup'),
                title: label('profile.addFirstPlot', 'Add your first plot'),
                description: label('profile.addFirstPlotHint', 'Set up a plot so reports, notes, and insights are easier to organize.'),
                actionLabel: label('profile.tabPlots', 'Plots'),
                action: () => setTab('plots'),
            };
        }

        if (predictiveRisk?.hasRisk) {
            return {
                icon: BrainCircuit,
                tone: 'ai',
                kicker: label('profile.riskWatch', 'Risk Watch'),
                title: label('profile.riskActionRequired', 'Action required: imminent risk detected'),
                description: predictiveRisk.warningMessage,
                actionLabel: label('profile.logSuggestedTreatment', 'Log recommended follow-up'),
                action: () => {
                    if (predictiveRisk.recommendedTreatment?.prefillAllowed !== false && predictiveRisk.recommendedTreatment) {
                        onPrefillRecommendedTreatment(predictiveRisk.warningMessage, predictiveRisk.recommendedTreatment);
                        return;
                    }
                    setTab('reports');
                },
            };
        }

        return {
            icon: BrainCircuit,
            tone: 'healthy',
            kicker: label('profile.farmBrief', 'Farm Brief'),
            title: label('profile.reviewFarmBrief', 'Review farm outlook'),
            description: label('profile.farmBriefHint', 'See the latest field outlook from your recent logs, alerts, and harvest activity.'),
            actionLabel: label('profile.openBrief', 'Open brief'),
            action: () => onGenerateInsights({ activeAlerts, harvestLogs, scopeKey: 'overview' }),
        };
    }, [
        activeAlerts,
        harvestLogs,
        hasLoggedToday,
        label,
        onGenerateInsights,
        onPrefillRecommendedTreatment,
        onSelectAlert,
        plots.length,
        predictiveRisk,
        setAddingNote,
        setTab,
    ]);

    const fireAction = (qa) => {
        qa.action(
            navigate,
            setTab,
            setAddingNote,
            (type) => setNoteForm({ ...emptyForm, activity_type: type }),
        );
    };

    return (
        <div className="ov-shell">
            {/* Shelf 1: Immediate Duties (Utility Icons) */}
            <div className="udp-category-header">
                <span className="udp-category-title">{label('profile.immediateDuties', 'Immediate Duties')}</span>
                {recommendedActionIds.size > 0 && (
                    <span className="udp-insight-tag" style={{ background: '#fef3c7', color: '#b45309', marginLeft: '8px', textTransform: 'none', fontSize: '0.6rem' }}>
                        {recommendedActionIds.size} {label('profile.actionsRequired', 'actions required')}
                    </span>
                )}
            </div>
            <div className="udp-shelf-container">
                {QUICK_ACTIONS.filter(qa => {
                    const isRecommended = recommendedActionIds.has(qa.id);
                    if (qa.id === 'plots') return plots.length === 0 || isRecommended;
                    return ['scan', 'scout', 'spray', 'harvest', 'daily-log'].includes(qa.id);
                }).sort((a, b) => {
                    const aRec = recommendedActionIds.has(a.id) ? 1 : 0;
                    const bRec = recommendedActionIds.has(b.id) ? 1 : 0;
                    return bRec - aRec;
                }).map((qa) => {
                    const Icon = qa.icon;
                    const isRecommended = recommendedActionIds.has(qa.id);
                    return (
                        <button key={qa.id} className="udp-utility-card" onClick={() => fireAction(qa)}>
                            <div 
                                className={`udp-utility-icon-box ${isRecommended ? 'pulse-border' : ''}`} 
                                style={{ 
                                    background: qa.tone.bg,
                                    border: isRecommended ? `2px solid ${qa.tone.icon}` : '1px solid #e2e8f0',
                                    color: qa.tone.icon
                                }}
                            >
                                <Icon size={24} />
                                {isRecommended && (
                                    <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', background: qa.tone.icon }} />
                                )}
                            </div>
                            <span className="udp-utility-label" style={{ fontWeight: isRecommended ? '850' : '700' }}>
                                {label(qa.labelKey, qa.fallback)}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Shelf 2: Farm Insights (Banner Cards) */}
            <div className="udp-category-header">
                <span className="udp-category-title">{label('profile.farmInsights', 'Farm Insights')}</span>
            </div>
            <div className="udp-shelf-container" style={{ paddingBottom: '24px' }}>
                <div className="udp-insight-card udp-insight-card--ai">
                    <span className="udp-insight-tag" style={{ color: '#15803d' }}>{label('profile.intelligence', 'AI Intelligence')}</span>
                    <h4 className="udp-profile-highlight-title" style={{ fontSize: '1rem' }}>
                         {generatingInsights ? label('common.analyzing', 'Analyzing...') : (aiCardData?.summary || label('profile.seasonalOutlook', 'Seasonal Outlook'))}
                    </h4>
                    <p className="udp-profile-highlight-sub" style={{ fontSize: '0.78rem' }}>
                        {generatingInsights ? label('profile.reviewingData', 'Checking logs...') : label('profile.farmBriefHint', 'See the latest field outlook and follow-up.')}
                    </p>
                    <button 
                        className="udp-category-action" 
                        style={{ padding: '8px 0', justifyContent: 'flex-start' }}
                        onClick={() => onGenerateInsights({ activeAlerts, harvestLogs, scopeKey: 'overview' })}
                    >
                        {label('profile.openBrief', 'Open Brief')} <ChevronRight size={14} />
                    </button>
                </div>

                <div className="udp-insight-card">
                    <span className="udp-insight-tag" style={{ background: '#fef3c7', color: '#b45309' }}>{label('home.mygapTitle', 'myGAP')}</span>
                    <h4 className="udp-profile-highlight-title" style={{ fontSize: '1rem' }}>
                        {checklistPct}% {label('common.ready', 'Ready for Certification')}
                    </h4>
                    <div className="ov-focus-progress" style={{ marginTop: '4px' }}>
                        <div className="ov-focus-progress-fill" style={{ width: `${checklistPct}%` }} />
                    </div>
                    <button className="udp-category-action" style={{ padding: '8px 0', justifyContent: 'flex-start' }} onClick={() => navigate('/mygap')}>
                        {label('profile.viewChecklist', 'View Checklist')} <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Shelf 3: Live Stats (Numerical Pills) */}
            <div className="udp-category-header">
                <span className="udp-category-title">{label('profile.liveStats', 'Live Stats')}</span>
            </div>
            <div className="udp-shelf-container" style={{ paddingBottom: '24px' }}>
                <div className="udp-stat-pill">
                    <span className="udp-stat-pill-label">{label('profile.healthy', 'Healthy')}</span>
                    <span className="udp-stat-pill-value" style={{ color: '#10b981' }}>{stats.healthy}</span>
                </div>
                <div className="udp-stat-pill">
                    <span className="udp-stat-pill-label">{label('profile.diseased', 'Issues')}</span>
                    <span className="udp-stat-pill-value" style={{ color: '#ef4444' }}>{stats.diseases}</span>
                </div>
                <div className="udp-stat-pill">
                    <span className="udp-stat-pill-label">{label('profile.plots', 'Plots')}</span>
                    <span className="udp-stat-pill-value">{plots.length}</span>
                </div>
                <div className="udp-stat-pill">
                    <span className="udp-stat-pill-label">{label('profile.totalLog', 'Logs')}</span>
                    <span className="udp-stat-pill-value" style={{ color: '#3b82f6' }}>{notes.length}</span>
                </div>
            </div>

            {/* Shelf 4: Recent Activity (Image Cards) */}
            <div className="udp-category-header">
                <span className="udp-category-title">{label('profile.recentActivity', 'Recent Activity')}</span>
                <button className="udp-category-action" onClick={() => navigate('/history')}>
                    {label('common.seeAll', 'See all')}
                </button>
            </div>
            <div className="udp-shelf-container" style={{ paddingBottom: '32px' }}>
                {recentHistory.length === 0 ? (
                    <div className="udp-insight-card" style={{ flex: '0 0 100%', alignItems: 'center', justifyContent: 'center', minHeight: '120px', borderStyle: 'dashed' }}>
                        <Sprout size={24} color="#94a3b8" />
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{label('profile.noActivityYet', 'No recent field activity')}</span>
                    </div>
                ) : (
                    recentHistory.map((scan) => (
                        <button key={scan.id} className="udp-activity-card" onClick={() => scan?.id && navigate(`/results/${scan.id}`)}>
                            <div className="udp-activity-img-wrapper">
                                {scan.photo_url || scan.photo_base64 ? (
                                    <img src={scan.photo_url || scan.photo_base64} alt="" className="udp-activity-img" />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                                        <Leaf size={32} color="#cbd5e1" />
                                    </div>
                                )}
                            </div>
                            <div className="udp-activity-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {scan.healthStatus === 'healthy' ? <CheckCircle2 size={13} color="#10b981" /> : <AlertTriangle size={13} color="#ef4444" />}
                                    <span className="ov-list-title" style={{ fontSize: '0.85rem', fontWeight: '800' }}>{scan.disease || scan.name || 'Healthy'}</span>
                                </div>
                                <span className="ov-list-meta" style={{ fontSize: '0.72rem' }}>{relDate(scan.timestamp ?? scan.created_at, t)}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Management Utilities (Bottom Grid) */}
            <div className="ov-tools-grid" style={{ marginTop: '8px' }}>
                <button className="ov-tool-card" onClick={() => navigate('/guide')} style={{ borderRadius: '20px' }}>
                    <div className="ov-tool-icon" style={{ background: '#f0fdf4' }}><BookOpen size={18} color="#16a34a" /></div>
                    <div className="ov-tool-copy">
                        <span className="ov-tool-title">{label('profile.userGuide', 'User Guide')}</span>
                        <span className="ov-tool-meta">{label('profile.learnMore', 'Help Center')}</span>
                    </div>
                </button>
                <button className="ov-tool-card" onClick={() => navigate('/encyclopedia')} style={{ borderRadius: '20px' }}>
                    <div className="ov-tool-icon" style={{ background: '#eff6ff' }}><Database size={18} color="#1d4ed8" /></div>
                    <div className="ov-tool-copy">
                        <span className="ov-tool-title">{label('profile.offlineDb', 'Disease DB')}</span>
                        <span className="ov-tool-meta">{label('profile.browseOffline', 'Browse Pests')}</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default OverviewTab;


