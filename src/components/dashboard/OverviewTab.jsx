import { useMemo } from 'react';
import {
    AlertTriangle,
    BarChart2,
    BookOpen,
    BrainCircuit,
    Calendar,
    CheckCircle2,
    CheckSquare,
    ChevronRight,
    Cloud,
    Database,
    FlaskConical,
    Info,
    Leaf,
    MapPin,
    Microscope,
    ScanLine,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Sprout,
    Sun,
    Wheat,
} from 'lucide-react';
import { deriveFarmingNotice } from '../../hooks/useWeather';
import SectionHeader from './SectionHeader';

const QUICK_ACTIONS = [
    {
        id: 'scan',
        icon: ScanLine,
        labelKey: 'home.newScan',
        fallback: 'Scan',
        hintKey: 'profile.quickScanHint',
        hintFallback: 'New diagnosis',
        tone: { icon: '#00B14F', bg: '#ecfdf3' },
        action: (nav) => nav('/?scan=true'),
    },
    {
        id: 'daily-log',
        icon: Calendar,
        labelKey: 'profile.tabNotes',
        fallback: 'Daily Log',
        hintKey: 'profile.quickLogHint',
        hintFallback: 'Record activity',
        tone: { icon: '#0284c7', bg: '#eff6ff' },
        action: (_, setTab, setAddingNote) => {
            setTab('notes');
            setAddingNote(true);
        },
    },
    {
        id: 'scout',
        icon: Microscope,
        labelKey: 'profile.actScout',
        fallback: 'Scout',
        hintKey: 'profile.quickScoutHint',
        hintFallback: 'Field check',
        tone: { icon: '#0f766e', bg: '#ecfeff' },
        action: (_, setTab, setAddingNote, setType) => {
            setTab('notes');
            setAddingNote(true);
            setType('scout');
        },
    },
    {
        id: 'spray',
        icon: FlaskConical,
        labelKey: 'profile.actSpray',
        fallback: 'Spray',
        hintKey: 'profile.quickSprayHint',
        hintFallback: 'Treatment log',
        tone: { icon: '#d97706', bg: '#fff7ed' },
        action: (_, setTab, setAddingNote, setType) => {
            setTab('notes');
            setAddingNote(true);
            setType('spray');
        },
    },
    {
        id: 'harvest',
        icon: Wheat,
        labelKey: 'profile.actHarvest',
        fallback: 'Harvest',
        hintKey: 'profile.quickHarvestHint',
        hintFallback: 'Yield update',
        tone: { icon: '#a16207', bg: '#fefce8' },
        action: (_, setTab, setAddingNote, setType) => {
            setTab('notes');
            setAddingNote(true);
            setType('harvest');
        },
    },
    {
        id: 'plots',
        icon: MapPin,
        labelKey: 'profile.tabPlots',
        fallback: 'Plots',
        hintKey: 'profile.quickPlotsHint',
        hintFallback: 'Field map',
        tone: { icon: '#dc2626', bg: '#fef2f2' },
        action: (_, setTab) => setTab('plots'),
    },
    {
        id: 'reports',
        icon: BarChart2,
        labelKey: 'profile.tabReports',
        fallback: 'Reports',
        hintKey: 'profile.quickReportsHint',
        hintFallback: 'Farm stats',
        tone: { icon: '#475569', bg: '#f8fafc' },
        action: (_, setTab) => setTab('reports'),
    },
    {
        id: 'shop',
        icon: ShoppingBag,
        labelKey: 'nav.shop',
        fallback: 'Shop',
        hintKey: 'profile.quickShopHint',
        hintFallback: 'Catalog',
        tone: { icon: '#be185d', bg: '#fdf2f8' },
        action: (_, setTab) => setTab('products'),
    },
];

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
        {
            id: 'health',
            icon: BarChart2,
            title: label('profile.healthScore', 'Health Score'),
            value: `${stats?.accuracy ?? 0}%`,
            meta: `${stats?.scannedThisMonth ?? 0} ${label('profile.scansMonth', 'scans this month')}`,
            tone: 'neutral',
        },
    ]), [activeAlerts.length, hasLoggedToday, label, plots.length, stats?.accuracy, streak]);

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

    const prioritizedQuickActions = useMemo(() => {
        const priority = {
            scan: 50,
            'daily-log': 40,
            scout: 35,
            spray: 30,
            harvest: 20,
            plots: 20,
            reports: 15,
            shop: 10,
        };

        if (activeAlerts.length > 0) {
            priority.scout += 50;
            priority.spray += 45;
            priority.reports += 40;
        }

        if (!hasLoggedToday) {
            priority['daily-log'] += 60;
        }

        if (plots.length === 0) {
            priority.plots += 55;
        }

        if (predictiveRisk?.hasRisk) {
            priority.scout += 25;
            priority.spray += 20;
        }

        return [...QUICK_ACTIONS].sort((a, b) => (priority[b.id] || 0) - (priority[a.id] || 0));
    }, [activeAlerts.length, hasLoggedToday, plots.length, predictiveRisk?.hasRisk]);

    const priorityCard = useMemo(() => {
        if (activeAlerts.length > 0) {
            const topAlert = activeAlerts[0];
            return {
                icon: AlertTriangle,
                tone: 'alert',
                kicker: label('profile.topPriority', 'Top Priority'),
                title: label('profile.reviewUrgentAlert', 'Review urgent alert'),
                description: `${topAlert?.disease || topAlert?.name || label('results.disease', 'Disease')} · ${label('profile.actionRequired', 'Action required now')}`,
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
                actionLabel: label('profile.logSuggestedTreatment', 'Log suggested treatment'),
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
            kicker: label('profile.summaryPrompt', 'Summary Prompt'),
            title: label('profile.reviewFarmSummary', 'Review farm summary'),
            description: label('profile.farmSummaryHint', 'Get a quick farm summary from recent logs, alerts, and harvest activity.'),
            actionLabel: label('profile.viewSummary', 'View summary'),
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
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.id} className={`ov-summary-card ov-summary-card--${card.tone}`}>
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

            <div className="ov-panel">
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
                    {prioritizedQuickActions.map((qa) => {
                        const Icon = qa.icon;
                        return (
                            <button key={qa.id} className="ov-action-card" onClick={() => fireAction(qa)}>
                                <div
                                    className="ov-action-icon"
                                    style={{ background: qa.tone.bg, color: qa.tone.icon }}
                                >
                                    <Icon size={22} strokeWidth={1.9} />
                                </div>
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
                        <span className="ov-focus-label">{label('profile.farmInsights', 'Farm Insights')}</span>
                    </div>
                    <div className="ov-focus-value">
                        {generatingInsights
                            ? label('common.analyzing', 'Analyzing...')
                            : (aiCardData?.summary || label('profile.viewSummary', 'View summary'))}
                    </div>
                    <div className="ov-focus-sub">
                        {generatingInsights
                            ? label('profile.reviewingFarmData', 'Reviewing logs and alerts')
                            : label('profile.farmSummaryHint', 'Get a quick farm summary from your recent activity')}
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
                            <button className="udp-see-all" onClick={() => setTab('reports')}>
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
                                            {label('profile.logSuggestedTreatment', 'Log Suggested Treatment')}
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
                        <button className="udp-see-all" onClick={() => setTab('reports')}>
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
                                {(forecast || []).slice(0, 4).map((day, index) => {
                                    const noticeData = deriveFarmingNotice(day);
                                    const noticeLabel = label(noticeData.key, 'Good');
                                    const icon = noticeData.status === 'warning'
                                        ? <AlertTriangle size={16} />
                                        : noticeData.status === 'caution'
                                            ? <Cloud size={16} />
                                            : <Sun size={16} />;
                                    return (
                                        <div
                                            key={day.date || index}
                                            className={`udp-forecast-card udp-forecast-card--${noticeData.status || 'good'}`}
                                        >
                                            <span className="udp-forecast-day">
                                                {index === 0
                                                    ? label('common.today', 'Today')
                                                    : new Date(day.date).toLocaleDateString(
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
                        title={label('profile.farmInsights', 'Farm Insights')}
                        action={(
                            <button
                                className="udp-see-all ov-ai-refresh"
                                onClick={() => onGenerateInsights({ activeAlerts, harvestLogs, scopeKey: 'overview' })}
                            >
                                {label('profile.refreshSummary', 'Refresh summary')}
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

                <button className="ov-tool-card" onClick={() => navigate('/offline-db')}>
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


