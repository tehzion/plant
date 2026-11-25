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
    ClipboardList,
} from 'lucide-react';
import { deriveFarmingNotice } from '../../hooks/useWeather';
import SectionHeader from './SectionHeader';

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

    const recommendedActivityTypes = useMemo(() => {
        const mapped = [];
        if (recommendedActionIds.has('daily-log')) mapped.push('note');
        if (recommendedActionIds.has('scout')) mapped.push('scout');
        if (recommendedActionIds.has('spray')) mapped.push('spray');
        if (recommendedActionIds.has('harvest')) mapped.push('harvest');
        return new Set(mapped);
    }, [recommendedActionIds]);

    const openActivityLog = () => {
        setNoteForm({ ...emptyForm });
        setAddingNote(true);
        setTab('notes');
    };

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

    return (
        <div className="ov-shell">
            {/* One next step, then one way to log. The activity type is chosen
                inside the log form, so eight shortcut buttons are not needed here. */}
            {(() => {
                const PriorityIcon = priorityCard.icon;
                return (
                    <div className={`ov-priority-card ov-priority-card--${priorityCard.tone}`}>
                        <div className="ov-priority-icon"><PriorityIcon size={22} aria-hidden="true" /></div>
                        <div className="ov-priority-copy">
                            <span className="ov-priority-kicker">{priorityCard.kicker}</span>
                            <h2 className="ov-priority-title">{priorityCard.title}</h2>
                            {priorityCard.description && <p className="ov-priority-desc">{priorityCard.description}</p>}
                        </div>
                        <button type="button" className="ov-priority-action" onClick={priorityCard.action}>
                            {priorityCard.actionLabel}
                        </button>
                    </div>
                );
            })()}
            <button type="button" className="btn btn-primary ov-log-activity" onClick={openActivityLog}>
                <ClipboardList size={18} aria-hidden="true" />
                {label('home.addActivity', 'Log activity')}
                {recommendedActivityTypes.size > 0 && (
                    <span className="udp-insight-tag udp-insight-tag--warning udp-insight-tag--compact">
                        {recommendedActivityTypes.size} {label('profile.actionsRequired', 'actions required')}
                    </span>
                )}
            </button>

            {/* Shelf 2: Farm Insights (Banner Cards) */}
            <div className="udp-category-header">
                <span className="udp-category-title">{label('profile.farmInsights', 'Farm Insights')}</span>
            </div>
            <div className="udp-shelf-container udp-shelf-container--tight">
                <div className="udp-insight-card udp-insight-card--ai">
                    <span className="udp-insight-tag udp-insight-tag--brand">{label('profile.intelligence', 'AI Intelligence')}</span>
                    <h4 className="udp-profile-highlight-title udp-profile-highlight-title--compact">
                         {generatingInsights ? label('common.analyzing', 'Analyzing...') : (aiCardData?.summary || label('profile.seasonalOutlook', 'Seasonal Outlook'))}
                    </h4>
                    <p className="udp-profile-highlight-sub udp-profile-highlight-sub--compact">
                        {generatingInsights ? label('profile.reviewingData', 'Checking logs...') : label('profile.farmBriefHint', 'See the latest field outlook and follow-up.')}
                    </p>
                    <button 
                        className="udp-category-action udp-category-action--inline"
                        onClick={() => onGenerateInsights({ activeAlerts, harvestLogs, scopeKey: 'overview' })}
                    >
                        {label('profile.openBrief', 'Open Brief')} <ChevronRight size={14} />
                    </button>
                </div>

                <div className="udp-insight-card">
                    <span className="udp-insight-tag udp-insight-tag--warning">{label('home.mygapTitle', 'myGAP')}</span>
                    <h4 className="udp-profile-highlight-title udp-profile-highlight-title--compact">
                        {checklistPct}% {label('common.ready', 'Ready for Certification')}
                    </h4>
                    <div className="ov-focus-progress ov-focus-progress--spaced">
                        <div className="ov-focus-progress-fill" style={{ width: `${checklistPct}%` }} />
                    </div>
                    <button className="udp-category-action udp-category-action--inline" onClick={() => navigate('/mygap')}>
                        {label('profile.viewChecklist', 'View Checklist')} <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Shelf 3: Live Stats (Numerical Pills) */}
            <div className="udp-category-header">
                <span className="udp-category-title">{label('profile.liveStats', 'Live Stats')}</span>
            </div>
            <div className="udp-shelf-container udp-shelf-container--tight">
                <div className="udp-stat-pill">
                    <span className="udp-stat-pill-label">{label('profile.healthy', 'Healthy')}</span>
                    <span className="udp-stat-pill-value udp-stat-pill-value--healthy">{stats.healthy}</span>
                </div>
                <div className="udp-stat-pill">
                    <span className="udp-stat-pill-label">{label('profile.diseased', 'Issues')}</span>
                    <span className="udp-stat-pill-value udp-stat-pill-value--alert">{stats.diseases}</span>
                </div>
                <div className="udp-stat-pill">
                    <span className="udp-stat-pill-label">{label('profile.plots', 'Plots')}</span>
                    <span className="udp-stat-pill-value">{plots.length}</span>
                </div>
                <div className="udp-stat-pill">
                    <span className="udp-stat-pill-label">{label('profile.totalLog', 'Logs')}</span>
                    <span className="udp-stat-pill-value udp-stat-pill-value--info">{notes.length}</span>
                </div>
            </div>

            {/* Management Utilities (Bottom Grid) */}
            <div className="ov-tools-grid ov-tools-grid--spaced">
                <button className="ov-tool-card ov-tool-card--rounded" onClick={() => navigate('/guide')}>
                    <div className="ov-tool-icon ov-tool-icon--guide"><BookOpen size={18} color="var(--color-primary)" /></div>
                    <div className="ov-tool-copy">
                        <span className="ov-tool-title">{label('profile.userGuide', 'User Guide')}</span>
                        <span className="ov-tool-meta">{label('profile.learnMore', 'Help Center')}</span>
                    </div>
                </button>
                <button className="ov-tool-card ov-tool-card--rounded" onClick={() => navigate('/encyclopedia')}>
                    <div className="ov-tool-icon ov-tool-icon--encyclopedia"><Database size={18} color="var(--color-primary)" /></div>
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


