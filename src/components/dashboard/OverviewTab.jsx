import { useMemo } from 'react';
import {
    AlertTriangle,
    BarChart2,
    BrainCircuit,
    BookOpen,
    Calendar,
    CheckCircle2,
    CheckSquare,
    ChevronRight,
    Cloud,
    Database,
    Info,
    ShieldCheck,
    Sparkles,
    Sun,
    TrendingUp,
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
}) => {
    const activeAlerts = useMemo(
        () => alerts.filter((scan) => !acknowledgedIds.includes(scan.id)),
        [acknowledgedIds, alerts],
    );
    const harvestLogs = useMemo(
        () => notes.filter((note) => note.activity_type === 'harvest'),
        [notes],
    );
    const recentHistory = useMemo(() => scanHistory.slice(0, 3), [scanHistory]);
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    const resolvedWeatherError = weatherError
        ? (() => {
            const value = t(weatherError);
            return value && value !== weatherError ? value : weatherError;
        })()
        : '';

    const aiCardData = (aiInsights?.scopeKey === 'overview' ? aiInsights : null) || (
        predictiveRisk
            ? {
                summary: predictiveRisk.warningMessage,
                recommendations: predictiveRisk.suggestedAction ? [predictiveRisk.suggestedAction] : [],
            }
            : null
    );

    return (
        <div className="udp-overview">
            <div className="udp-stats-row">
                <div className="udp-stat">
                    <span className="udp-stat-num">{stats.scannedThisMonth}</span>
                    <span className="udp-stat-label">{t('profile.scansMonth') || 'Scan/Mo'}</span>
                </div>
                <div className="udp-stat-divider" />
                <div className="udp-stat">
                    <span className={`udp-stat-num ${hasLoggedToday ? 'udp-stat-green' : 'udp-stat-warn'}`}>{streak}</span>
                    <span className="udp-stat-label">{t('profile.streak') || 'Streak'}</span>
                </div>
                <div className="udp-stat-divider" />
                <div className="udp-stat">
                    <span className="udp-stat-num">{stats.accuracy}%</span>
                    <span className="udp-stat-label">{t('profile.healthScore') || 'Health'}</span>
                </div>
            </div>

            {activeAlerts.length > 0 ? (
                <div className="udp-section udp-section-alert">
                    <SectionHeader
                        icon={<AlertTriangle size={15} color="#ef4444" />}
                        title={`${activeAlerts.length} ${t('profile.urgentAlerts') || 'Urgent Issues'}`}
                        action={<button className="udp-see-all" onClick={() => setTab('reports')}>{t('common.seeAll') || 'See all'}</button>}
                    />
                    {activeAlerts.slice(0, 2).map((scan) => (
                        <button key={scan.id} className="udp-alert-row" onClick={() => onSelectAlert(scan)}>
                            <div className="udp-alert-dot" />
                            <div className="udp-scan-info">
                                <span className="udp-scan-name">{scan.name || scan.disease}</span>
                                <span className="udp-scan-cat">{scan.category} / {relDate(scan.timestamp ?? scan.created_at, t)}</span>
                            </div>
                            <span className="udp-alert-hint">{t('profile.actionRequired') || 'Action Needed'} <ChevronRight size={14} /></span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="udp-section udp-section-resolved">
                    <SectionHeader icon={<CheckCircle2 size={15} color="#16a34a" />} title={t('profile.allClear') || 'All Plots Healthy'} />
                    <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}><ShieldCheck size={18} /></div>
                        <p style={{ fontSize: '0.8rem', color: '#15803d', margin: 0, fontWeight: 500 }}>{t('profile.noUrgentIssues') || 'No pests or diseases detected in recent scans.'}</p>
                    </div>
                </div>
            )}

            {!hasLoggedToday && (
                <div className="udp-task-banner" onClick={() => { setTab('notes'); setAddingNote(true); }}>
                    <div className="udp-task-icon udp-standard-icon"><Calendar size={24} /></div>
                    <div className="udp-task-content">
                        <div className="udp-task-title">{t('profile.logDailyTask') || 'Log a Daily Farm Task'}</div>
                        <div className="udp-task-desc">{t('profile.logDailyHint') || 'Record spray, scouting, harvest, or note to strengthen traceability.'}</div>
                    </div>
                    <ChevronRight size={18} color="#b45309" />
                </div>
            )}

            {complianceNudges.length > 0 && (
                <div className="udp-section" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <SectionHeader icon={<CheckSquare size={15} color="#f59e0b" />} title={t('profile.gapCompliance') || 'Compliance Roadmap'} />
                    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {complianceNudges.map((nudge) => (
                            <div
                                key={nudge.id}
                                style={{ padding: '10px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', cursor: 'pointer' }}
                                onClick={() => {
                                    if (nudge.type !== 'note') return;
                                    setTab('notes');
                                    setAddingNote(true);
                                    setNoteForm({ ...emptyForm, activity_type: nudge.activityType });
                                }}
                            >
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Info size={14} /> {nudge.title}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 3 }}>{nudge.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(assessingRisk || predictiveRisk?.hasRisk) && (
                <div className="udp-section" style={{ background: assessingRisk ? '#fefce8' : '#fef2f2', borderColor: assessingRisk ? '#fef08a' : '#fecaca', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
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
                                <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '0.75rem', color: '#991b1b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <Sparkles size={13} /> {predictiveRisk.suggestedAction}
                                </div>
                                {predictiveRisk.recommendedTreatment?.prefillAllowed !== false && predictiveRisk.recommendedTreatment && (
                                    <button
                                        style={{ marginTop: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)' }}
                                        onClick={() => onPrefillRecommendedTreatment(predictiveRisk.warningMessage, predictiveRisk.recommendedTreatment)}
                                    >
                                        <Sparkles size={14} /> {t('profile.logSuggestedTreatment') || 'Log Suggested Treatment'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="udp-section">
                <SectionHeader
                    icon={<BrainCircuit size={15} color="#8b5cf6" />}
                    title={t('profile.aiFarmIntelligence') || 'AI Farm Intelligence'}
                    action={(
                        <button
                            className="udp-see-all"
                            style={{ color: '#8b5cf6', background: '#f5f3ff', padding: '4px 10px', borderRadius: '12px' }}
                            onClick={() => onGenerateInsights({
                                activeAlerts,
                                harvestLogs,
                                scopeKey: 'overview',
                            })}
                            disabled={generatingInsights}
                        >
                            {generatingInsights ? (t('common.analyzing') || 'Analyzing...') : <><Sparkles size={13} /> {t('profile.askAI') || 'Ask AI'}</>}
                        </button>
                    )}
                />
                <div style={{ padding: '0 16px 16px' }}>
                    {generatingInsights ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px', color: '#8b5cf6' }}>
                            <BrainCircuit size={28} style={{ animation: 'pulse 1.5s infinite' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('profile.aiAnalyzingHint') || 'Analyzing logs & alerts...'}</span>
                        </div>
                    ) : aiCardData ? (
                        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '16px' }}>
                            <p style={{ fontSize: '0.85rem', color: '#4c1d95', margin: '0 0 12px', lineHeight: 1.5 }}>
                                <strong>{t('profile.aiSummary') || 'Summary'}:</strong> {aiCardData.summary}
                            </p>
                            {aiCardData.yieldAnalysis && (
                                <p style={{ fontSize: '0.8rem', color: '#5b21b6', margin: '0 0 12px', borderLeft: '3px solid #8b5cf6', paddingLeft: '8px' }}>
                                    {aiCardData.yieldAnalysis}
                                </p>
                            )}
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', marginBottom: '8px', textTransform: 'uppercase' }}>
                                {t('profile.aiRecommendations') || 'Actionable Recommendations'}:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#4c1d95', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {aiCardData.recommendations?.map((recommendation, index) => <li key={index}>{recommendation}</li>)}
                            </ul>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>
                            {t('profile.aiAskHint') || 'Tap "Ask AI" to get a personalized weekly agronomist report based on your farm activity.'}
                        </div>
                    )}
                </div>
            </div>

            <div className="udp-section">
                <SectionHeader icon={<TrendingUp size={15} />} title={label('profile.weatherForecast', 'Weather Forecast')} />
                <div className="udp-forecast-panel">
                    {(forecast || []).length === 0 ? (
                        <div className="udp-empty-forecast">
                            {resolvedWeatherError || label('profile.weatherForecastUnavailable', 'Forecast will appear here after weather data is loaded.')}
                        </div>
                    ) : (
                        <>
                            {resolvedWeatherError && (
                                <div
                                    style={{
                                        margin: '0 0 12px',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        background: '#fffbeb',
                                        border: '1px solid #fde68a',
                                        color: '#92400e',
                                        fontSize: '0.78rem',
                                        lineHeight: 1.45,
                                        fontWeight: 600,
                                    }}
                                >
                                    {resolvedWeatherError}
                                </div>
                            )}
                            <div className="udp-forecast-strip">
                            {(forecast || []).slice(0, 4).map((day, index) => {
                                const noticeData = deriveFarmingNotice(day);
                                const notice = {
                                    label: label(noticeData.key, 'Good'),
                                    color: noticeData.status === 'warning' ? '#ef4444' : noticeData.status === 'caution' ? '#f59e0b' : '#16a34a',
                                    bg: noticeData.status === 'warning' ? '#fef2f2' : noticeData.status === 'caution' ? '#fffbeb' : '#f0fdf4',
                                    border: noticeData.status === 'warning' ? '#fecaca' : noticeData.status === 'caution' ? '#fef3c7' : '#dcfce7',
                                    icon: noticeData.status === 'warning' ? <AlertTriangle size={16} /> : noticeData.status === 'caution' ? <Cloud size={16} /> : <Sun size={16} />,
                                };
                                return (
                                    <div key={day.date || index} className="udp-forecast-card" style={{ background: notice.bg, borderColor: notice.border }}>
                                        <span className="udp-forecast-day">
                                            {index === 0
                                                ? (t('common.today') || t('profile.today') || 'Today')
                                                : new Date(day.date).toLocaleDateString(t('common.dateLocale') || undefined, { weekday: 'short' })}
                                        </span>
                                        <div className="udp-forecast-icon" style={{ color: notice.color }}>{notice.icon}</div>
                                        <span className="udp-forecast-temp">{Math.round(day.tempMax)}&deg;C</span>
                                        <span className="udp-forecast-note" style={{ color: notice.color }}>{notice.label}</span>
                                    </div>
                                );
                            })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="udp-explore-grid">
                <div className="udp-explore-card" style={{ background: 'linear-gradient(135deg, #fff, #f0fdf4)' }} onClick={() => navigate('/mygap')}>
                    <div className="udp-explore-icon udp-standard-icon"><ShieldCheck size={24} /></div>
                    <span className="udp-explore-label">{t('home.mygapTitle') || 'myGAP Guide'}</span>
                    <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${checklistPct}%`, height: '100%', background: '#22c55e' }} />
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#15803d' }}>{checklistPct}% {t('common.ready') || 'Ready'}</span>
                </div>
                <div className="udp-explore-card" style={{ background: 'linear-gradient(135deg, #fff, #fef2f2)' }} onClick={() => setTab('reports')}>
                    <div className="udp-explore-icon udp-standard-icon"><BarChart2 size={24} /></div>
                    <span className="udp-explore-label">{label('profile.analytics', 'Analytics')}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b91c1c' }}>{plots.length} {label('profile.activePlots', 'active plots')}</span>
                </div>
            </div>

            <div className="udp-section">
                <SectionHeader icon={<Calendar size={15} />} title={label('profile.recentScans', 'Recent Scans')} action={<button className="udp-see-all" onClick={() => setTab('reports')}>{t('common.seeAll') || 'See all'}</button>} />
                {recentHistory.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>{label('profile.noRecentHistory', 'No recent scans.')}</div>
                ) : (
                    recentHistory.map((scan) => (
                        <button
                            key={scan.id}
                            className="udp-scan-row"
                            onClick={() => scan?.id && navigate(`/results/${scan.id}`)}
                        >
                            <div className="udp-scan-info">
                                <span className="udp-scan-name">{scan.name || scan.disease}</span>
                                <span className="udp-scan-cat">{scan.category} / {relDate(scan.timestamp ?? scan.created_at, t)}</span>
                            </div>
                            <ChevronRight size={16} className="udp-chevron" />
                        </button>
                    ))
                )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <button className="udp-task-banner" style={{ flex: 1, background: '#f8fafc', borderColor: '#e2e8f0' }} onClick={() => navigate('/guide')}>
                    <div className="udp-task-icon udp-standard-icon"><BookOpen size={24} /></div>
                    <div className="udp-task-content">
                        <div className="udp-task-title" style={{ color: '#334155' }}>{label('profile.userGuide', 'User Guide')}</div>
                        <div className="udp-task-desc" style={{ color: '#64748b' }}>{label('profile.learnMore', 'How to use Plant')}</div>
                    </div>
                </button>
                <button className="udp-task-banner" style={{ flex: 1, background: '#f8fafc', borderColor: '#e2e8f0' }} onClick={() => navigate('/offline-db')}>
                    <div className="udp-task-icon udp-standard-icon"><Database size={24} /></div>
                    <div className="udp-task-content">
                        <div className="udp-task-title" style={{ color: '#334155' }}>{label('profile.offlineDb', 'Disease DB')}</div>
                        <div className="udp-task-desc" style={{ color: '#64748b' }}>{label('profile.browseOffline', 'Search pests offline')}</div>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default OverviewTab;

