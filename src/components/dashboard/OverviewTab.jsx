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
            <div className="ov-summary-grid">
                {summaryCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div 
                            key={card.id} 
                            className={`ov-summary-card ov-summary-card--${card.tone} ov-item-appear`}
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            <div className="ov-summary-icon">
                                <Icon size={18} strokeWidth={2} />
                            </div>
                            <div className="ov-summary-text">
                                <span className="ov-summary-title">{card.title}</span>
                                <span className="ov-summary-value">{card.value}</span>
                                <span className="ov-summary-meta">{card.meta}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="ov-panel ov-item-appear" style={{ animationDelay: '0.2s' }}>
                <div className="ov-panel-head">
                    <div>
                        <p className="ov-panel-kicker">{label('profile.quickAccess', 'Quick Access')}</p>
                        <h3 className="ov-panel-title">{label('profile.quickActions', 'Farm actions')}</h3>
                    </div>
                </div>

                {priorityCard && (
                    <div className={`ov-priority-card ov-priority-card--${priorityCard.tone}`}>
                        <div className="ov-priority-icon">
                            <priorityCard.icon size={18} strokeWidth={2} />
                        </div>
                        <div className="ov-priority-copy">
                            <span className="ov-priority-kicker">{priorityCard.kicker}</span>
                            <h4 className="ov-priority-title">{priorityCard.title}</h4>
                            <p className="ov-priority-desc">{priorityCard.description}</p>
                        </div>
                        <button className="ov-priority-action" onClick={priorityCard.action}>
                            {priorityCard.actionLabel}
                        </button>
                    </div>
                )}

                <div className="ov-action-grid">
                    {QUICK_ACTIONS.map((qa) => {
                        const Icon = qa.icon;
                        const isRecommended = recommendedActionIds.has(qa.id);
                        return (
                            <button
                                key={qa.id}
                                className={`ov-action-card ${isRecommended ? 'is-recommended' : ''}`}
                                onClick={() => fireAction(qa)}
                            >
                                <div
                                    className="ov-action-icon"
                                    style={{ background: qa.tone.bg, color: qa.tone.icon }}
                                >
                                    <Icon size={22} strokeWidth={1.9} />
                                </div>
                                {isRecommended && (
                                    <span className="ov-action-badge">{label('profile.recommendedBadge', 'Recommended')}</span>
                                )}
                                <span className="ov-action-title">{label(qa.labelKey, qa.fallback)}</span>
                                <span className="ov-action-meta">{label(qa.hintKey, qa.hintFallback)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="ov-focus-grid">
                <button className="ov-focus-card ov-focus-card--gap" onClick={() => navigate('/mygap')}>
                    <div className="ov-focus-head">
                        <span className="ov-focus-icon"><ShieldCheck size={18} /></span>
                        <span className="ov-focus-label">{label('home.mygapTitle', 'myGAP Guide')}</span>
                    </div>
                    <div className="ov-focus-value">{checklistPct}% {label('common.ready', 'Ready')}</div>
                    <div className="ov-focus-progress">
                        <div className="ov-focus-progress-fill" style={{ width: `${checklistPct}%` }} />
                    </div>
                </button>

                <button
                    className="ov-focus-card ov-focus-card--ai"
                    onClick={() => onGenerateInsights({ activeAlerts, harvestLogs, scopeKey: 'overview' })}
                    disabled={generatingInsights}
                >
                    <div className="ov-focus-head">
                        <span className="ov-focus-icon"><BrainCircuit size={18} /></span>
                        <span className="ov-focus-label">{label('profile.latestOutlook', 'Latest Outlook')}</span>
                    </div>
                    <div className="ov-focus-value">
                        {generatingInsights
                            ? label('common.analyzing', 'Analyzing...')
                            : (aiCardData?.summary || label('profile.openBrief', 'Open brief'))}
                    </div>
                    <div className="ov-focus-sub">
                        {generatingInsights
                            ? label('profile.reviewingFarmData', 'Reviewing logs and alerts')
                            : label('profile.latestOutlookHint', 'See the latest field outlook and recommended follow-up for your farm.')}
                    </div>
                </button>
            </div>

            {(assessingRisk || activeAlerts.length > 0 || predictiveRisk?.hasRisk) && (
                <div className={`ov-feed-card ov-feed-card--alerts ${assessingRisk ? 'is-pending' : ''}`}>
                    <SectionHeader
                        icon={<AlertTriangle size={15} color={assessingRisk ? '#ca8a04' : '#dc2626'} />}
                        title={assessingRisk
                            ? label('profile.analyzingRisk', 'Analyzing farm risk...')
                            : label('profile.urgentAlerts', 'Urgent Alerts')}
                        action={activeAlerts.length > 0 ? (
                            <button className="udp-see-all" onClick={() => navigate('/history')}>
                                {label('common.seeAll', 'See all')}
                            </button>
                        ) : null}
                    />
                    <div className="ov-feed-body">
                        {assessingRisk ? (
                            <div className="ov-empty-state">
                                <BrainCircuit size={20} />
                                <span>{label('profile.reviewingFarmData', 'Reviewing logs and alerts')}</span>
                            </div>
                        ) : activeAlerts.length > 0 ? (
                            activeAlerts.slice(0, 2).map((scan) => (
                                <button
                                    key={scan.id}
                                    className="ov-list-row"
                                    onClick={() => onSelectAlert(scan)}
                                >
                                    <div className="ov-list-icon ov-list-icon--alert">
                                        <AlertTriangle size={16} />
                                    </div>
                                    <div className="ov-list-copy">
                                        <span className="ov-list-title">{scan.disease || scan.name || label('results.disease', 'Disease')}</span>
                                        <span className="ov-list-meta">{scan.category || scan.plantType || label('results.notSpecified', 'Not specified')} · {relDate(scan.timestamp ?? scan.created_at, t)}</span>
                                    </div>
                                    <span className="ov-list-tag ov-list-tag--alert">{label('profile.actionRequired', 'Action required')}</span>
                                </button>
                            ))
                        ) : predictiveRisk?.hasRisk ? (
                            <div className="ov-risk-prompt">
                                <p className="ov-risk-copy">{predictiveRisk.warningMessage}</p>
                                <div className="ov-risk-actions">
                                    <span className="ov-list-tag ov-list-tag--alert">{predictiveRisk.suggestedAction}</span>
                                    {predictiveRisk.recommendedTreatment?.prefillAllowed !== false && predictiveRisk.recommendedTreatment && (
                                        <button
                                            className="ov-primary-inline"
                                            onClick={() => onPrefillRecommendedTreatment(
                                                predictiveRisk.warningMessage,
                                                predictiveRisk.recommendedTreatment,
                                            )}
                                        >
                                            <Sparkles size={14} />
                                            {label('profile.logSuggestedTreatment', 'Log recommended follow-up')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <div className="ov-feed-card">
                <SectionHeader
                    icon={<Leaf size={15} color="#16a34a" />}
                    title={label('profile.recentScans', 'Recent Scans')}
                    action={(
                        <button className="udp-see-all" onClick={() => navigate('/history')}>
                            {label('common.seeAll', 'See all')}
                        </button>
                    )}
                />
                <div className="ov-feed-body">
                    {recentHistory.length === 0 ? (
                        <div className="ov-empty-state">
                            <Sprout size={20} />
                            <span>{label('profile.noRecentHistory', 'No scans yet. Tap Scan to get started.')}</span>
                        </div>
                    ) : (
                        recentHistory.map((scan) => (
                            <button
                                key={scan.id}
                                className="ov-list-row"
                                onClick={() => scan?.id && navigate(`/results/${scan.id}`)}
                            >
                                <div className={`ov-list-icon ${scan.healthStatus === 'healthy' ? 'ov-list-icon--healthy' : 'ov-list-icon--danger'}`}>
                                    {scan.healthStatus === 'healthy'
                                        ? <CheckCircle2 size={16} />
                                        : <AlertTriangle size={16} />}
                                </div>
                                <div className="ov-list-copy">
                                    <span className="ov-list-title">{scan.name || scan.disease || label('results.healthy', 'Healthy')}</span>
                                    <span className="ov-list-meta">{scan.category || scan.plantType || label('results.notSpecified', 'Not specified')} · {relDate(scan.timestamp ?? scan.created_at, t)}</span>
                                </div>
                                <ChevronRight size={16} className="udp-chevron" />
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div className="ov-feed-card">
                <SectionHeader
                    icon={<Sun size={15} color="#f59e0b" />}
                    title={label('profile.weatherForecast', 'Weather & Farming')}
                />
                <div className="ov-feed-body">
                    {(forecast || []).length === 0 ? (
                        <div className="ov-empty-state">
                            <Cloud size={20} />
                            <span>{resolvedWeatherError || label('profile.weatherForecastUnavailable', 'Forecast loading...')}</span>
                        </div>
                    ) : (
                        <>
                            <div className="ov-weather-overview">
                                <div className="ov-weather-chip">
                                    <span className="ov-weather-chip-label">{label('common.today', 'Today')}</span>
                                    <strong>{primaryWeather?.temp ?? '--'}°C</strong>
                                </div>
                                <div className="ov-weather-chip">
                                    <span className="ov-weather-chip-label">{label('profile.farmingNotice', 'Farming notice')}</span>
                                    <strong>{primaryWeather?.label || label('common.good', 'Good')}</strong>
                                </div>
                            </div>
                            <div className="udp-forecast-strip">
                                {(forecast || []).slice(1, 5).map((day, index) => {
                                    const actualIndex = index + 1;
                                    const noticeData = deriveFarmingNotice(day);
                                    const noticeLabel = label(noticeData.key, 'Good');
                                    const icon = noticeData.status === 'warning'
                                        ? <AlertTriangle size={16} />
                                        : noticeData.status === 'caution'
                                            ? <Cloud size={16} />
                                            : <Sun size={16} />;
                                    return (
                                        <div
                                            key={day.date || actualIndex}
                                            className={`udp-forecast-card udp-forecast-card--${noticeData.status || 'good'}`}
                                        >
                                            <span className="udp-forecast-day">
                                                {new Date(day.date).toLocaleDateString(
                                                    label('common.dateLocale', 'en-MY'),
                                                    { weekday: 'short' },
                                                )}
                                            </span>
                                            <div className="udp-forecast-icon">{icon}</div>
                                            <span className="udp-forecast-temp">{Math.round(day.tempMax)}°C</span>
                                            <span className="udp-forecast-note">{noticeLabel}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {aiCardData && !generatingInsights && (
                <div className="ov-feed-card ov-feed-card--ai">
                    <SectionHeader
                        icon={<Sparkles size={15} color="#15803d" />}
                        title={label('profile.recommendedActionsTitle', 'Recommended Actions')}
                        action={(
                            <button
                                className="udp-see-all ov-ai-refresh"
                                onClick={() => onGenerateInsights({ activeAlerts, harvestLogs, scopeKey: 'overview' })}
                            >
                                {label('profile.refreshInsights', 'Refresh insights')}
                            </button>
                        )}
                    />
                    <div className="ov-feed-body">
                        <div className="ov-ai-summary">{aiCardData.summary}</div>
                        {aiCardData.recommendations?.length > 0 && (
                            <div className="ov-ai-list">
                                {aiCardData.recommendations.slice(0, 3).map((rec, index) => (
                                    <div key={`${rec}-${index}`} className="ov-ai-item">
                                        <Sparkles size={13} />
                                        <span>{rec}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {complianceNudges.length > 0 && (
                <div className="ov-feed-card">
                    <SectionHeader
                        icon={<CheckSquare size={15} color="#d97706" />}
                        title={label('profile.gapCompliance', 'Compliance Roadmap')}
                    />
                    <div className="ov-feed-body">
                        {complianceNudges.map((nudge) => (
                            <button
                                key={nudge.id}
                                className="ov-list-row"
                                onClick={() => {
                                    if (nudge.type !== 'note') return;
                                    setTab('notes');
                                    setAddingNote(true);
                                    setNoteForm({ ...emptyForm, activity_type: nudge.activityType });
                                }}
                            >
                                <div className="ov-list-icon ov-list-icon--warning">
                                    <Info size={16} />
                                </div>
                                <div className="ov-list-copy">
                                    <span className="ov-list-title">{nudge.title}</span>
                                    <span className="ov-list-meta">{nudge.desc}</span>
                                </div>
                                <ChevronRight size={16} className="udp-chevron" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="ov-tools-grid">
                <button className="ov-tool-card" onClick={() => navigate('/guide')}>
                    <div className="ov-tool-icon"><BookOpen size={18} /></div>
                    <div className="ov-tool-copy">
                        <span className="ov-tool-title">{label('profile.userGuide', 'User Guide')}</span>
                        <span className="ov-tool-meta">{label('profile.learnMore', 'How to use Plant')}</span>
                    </div>
                </button>

                <button className="ov-tool-card" onClick={() => navigate('/encyclopedia')}>
                    <div className="ov-tool-icon"><Database size={18} /></div>
                    <div className="ov-tool-copy">
                        <span className="ov-tool-title">{label('profile.offlineDb', 'Disease DB')}</span>
                        <span className="ov-tool-meta">{label('profile.browseOffline', 'Search pests offline')}</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default OverviewTab;


