import { useMemo } from 'react';
import {
    AlertTriangle,
    BookOpen,
    BrainCircuit,
    Calendar,
    CheckCircle2,
    CheckSquare,
    ChevronRight,
    FileText,
    Info,
    Leaf,
    ShoppingBag,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';

const OverviewTab = ({
    t,
    navigate,
    alerts,
    acknowledgedIds,
    notes,
    scanHistory,
    stats,
    checklistPct,
    plots,
    assessingRisk,
    predictiveRisk,
    onPrefillRecommendedTreatment,
    onGenerateInsights,
    generatingInsights,
    aiInsights,
    recentScans,
    logs,
    onSelectAlert,
    relDate,
    SectionHeader,
}) => {
    const activeAlerts = useMemo(
        () => alerts.filter((scan) => !acknowledgedIds.includes(scan.id)),
        [acknowledgedIds, alerts],
    );
    const resolvedAlerts = useMemo(
        () => alerts.filter((scan) => acknowledgedIds.includes(scan.id)),
        [acknowledgedIds, alerts],
    );
    const harvestLogs = useMemo(
        () => notes.filter((note) => note.activity_type === 'harvest'),
        [notes],
    );

    const weekTrends = useMemo(() => {
        const now = Date.now();
        const oneWeek = 7 * 86400000;
        const twoWeeks = 14 * 86400000;

        const thisWeekScans = scanHistory.filter((scan) => {
            const timestamp = new Date(scan.timestamp ?? scan.created_at).getTime();
            return timestamp > now - oneWeek;
        });
        const lastWeekScans = scanHistory.filter((scan) => {
            const timestamp = new Date(scan.timestamp ?? scan.created_at).getTime();
            return timestamp > now - twoWeeks && timestamp <= now - oneWeek;
        });

        const thisWeekDiseases = thisWeekScans.filter((scan) => scan.healthStatus !== 'healthy').length;
        const lastWeekDiseases = lastWeekScans.filter((scan) => scan.healthStatus !== 'healthy').length;

        return {
            diseaseDelta: thisWeekDiseases - lastWeekDiseases,
            scanDelta: thisWeekScans.length - lastWeekScans.length,
            lastDiseaseCount: lastWeekDiseases,
            lastScanCount: lastWeekScans.length,
        };
    }, [scanHistory]);

    const trendData = useMemo(() => {
        const days = [];
        for (let index = 6; index >= 0; index -= 1) {
            const date = new Date();
            date.setDate(date.getDate() - index);
            days.push({
                date: date.toLocaleDateString(t('common.dateLocale') || 'en-US', { month: 'short', day: 'numeric' }),
                healthy: 0,
                diseased: 0,
                rawDate: date.toISOString().split('T')[0],
            });
        }

        alerts.forEach((scan) => {
            const scanDate = (scan.timestamp || scan.created_at || '').split('T')[0];
            const dayMatch = days.find((day) => day.rawDate === scanDate);
            if (!dayMatch) return;

            if (scan.healthStatus === 'healthy' || !scan.disease) dayMatch.healthy += 1;
            else dayMatch.diseased += 1;
        });

        return days;
    }, [alerts, t]);

    const daysSinceScan = stats.lastScan
        ? Math.floor((Date.now() - new Date(stats.lastScan)) / 86400000)
        : Infinity;

    const renderTrend = (delta, invert = false) => {
        if (delta === 0) {
            return <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{'->'} {t('profile.trendSame') || 'Same'}</span>;
        }
        const isGood = invert ? delta < 0 : delta > 0;
        return (
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isGood ? '#10b981' : '#ef4444' }}>
                {delta > 0 ? '↑' : '↓'} {Math.abs(delta)} {t('profile.vsLastWeek') || 'vs last wk'}
            </span>
        );
    };

    return (
        <>
            {daysSinceScan > 7 && (
                <div className="udp-task-banner" onClick={() => navigate('/?scan=true')}>
                    <div className="udp-task-icon">📆</div>
                    <div className="udp-task-content">
                        <div className="udp-task-title">{t('profile.weeklyScanDue') || 'Weekly Scan Due'}</div>
                        <div className="udp-task-desc">{t('profile.scanReminderDesc') || 'Keep your farm intelligence accurate with a fresh scan.'}</div>
                    </div>
                    <ChevronRight size={16} />
                </div>
            )}

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

            <div className="udp-stats-row">
                <div className="udp-stat">
                    <span className="udp-stat-num">{stats.total}</span>
                    <span className="udp-stat-label">{t('profile.totalScans') || 'Scans'}</span>
                    {weekTrends.lastScanCount > 0 && renderTrend(weekTrends.scanDelta)}
                </div>
                <div className="udp-stat-divider" />
                <div className="udp-stat">
                    <span className="udp-stat-num udp-stat-warn">{stats.diseases}</span>
                    <span className="udp-stat-label">{t('profile.diseasesFound') || 'Diseases'}</span>
                    {weekTrends.lastDiseaseCount > 0 && renderTrend(weekTrends.diseaseDelta, true)}
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

            <div className="udp-section" style={{ padding: '16px 16px 0', borderBottom: 'none' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 16px 4px' }}>{t('profile.scanTrendTitle') || 'Scan Activity Trend (Last 7 Days)'}</div>
                <div style={{ width: '100%', height: 160, minHeight: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend />
                            <ReferenceLine y={0} stroke="#e2e8f0" />
                            <Line type="monotone" dataKey="healthy" name={t('profile.healthy') || 'Healthy'} stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="diseased" name={t('profile.diseased') || 'Diseased'} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="udp-section">
                <SectionHeader
                    icon={<BrainCircuit size={15} color="#8b5cf6" />}
                    title="AI Farm Intelligence"
                    action={(
                        <button className="udp-see-all" style={{ color: '#8b5cf6', background: '#f5f3ff', padding: '4px 10px', borderRadius: '12px' }} onClick={() => onGenerateInsights(activeAlerts, harvestLogs)} disabled={generatingInsights}>
                            {generatingInsights ? 'Analyzing...' : <><Sparkles size={13} /> Ask AI</>}
                        </button>
                    )}
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
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', marginBottom: '8px', textTransform: 'uppercase' }}>{t('profile.aiRecommendations') || 'Actionable Recommendations'}</div>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#4c1d95', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {aiInsights.recommendations?.map((recommendation, index) => <li key={index}>{recommendation}</li>)}
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
                <div className="udp-section udp-section-alert">
                    <SectionHeader icon={<AlertTriangle size={15} />} title={t('profile.alerts') || `Alerts (${activeAlerts.length})`} />
                    {activeAlerts.map((scan) => (
                        <button key={scan.id} className="udp-alert-row" onClick={() => onSelectAlert(scan)}>
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

            {resolvedAlerts.length > 0 && (
                <div className="udp-section udp-section-resolved">
                    <SectionHeader icon={<CheckCircle2 size={15} />} title={t('profile.resolved') || 'Resolved'} />
                    {resolvedAlerts.map((scan) => (
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
                    {recentScans.map((scan) => {
                        const thumbnail = scan.image_url || scan.image || null;
                        return (
                            <button key={scan.id} className="udp-scan-row" onClick={() => navigate(`/results/${scan.id}`)}>
                                {thumbnail ? (
                                    <img src={thumbnail} alt={t('common.photoPreview') || 'scan'} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }} />
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

            {logs.length > 0 && (
                <div className="udp-section">
                    <SectionHeader icon={<FileText size={15} />} title={t('profile.activityLog') || 'Activity Log'} action={<button className="udp-see-all" onClick={() => navigate('/mygap')}>{t('common.seeAll') || 'See all'} <ChevronRight size={13} /></button>} />
                    {logs.map((log) => (
                        <div key={log.id} className="udp-log-row">
                            <CheckCircle2 size={14} className="udp-log-icon" />
                            <div className="udp-scan-info">
                                <span className="udp-scan-name">{log.type}</span>
                                <span className="udp-scan-cat">{log.notes?.slice(0, 60)}{log.notes?.length > 60 ? '...' : ''} · {relDate(log.timestamp ?? log.created_at, t)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="udp-section">
                <SectionHeader title={t('profile.explore') || 'Explore'} />
                <div className="udp-explore-grid">
                    <button className="udp-explore-card" onClick={() => navigate('/shop')}>
                        <div className="udp-explore-icon"><ShoppingBag size={24} /></div>
                        <span className="udp-explore-label">{t('nav.shop') || 'Shop'}</span>
                    </button>
                    <button className="udp-explore-card" onClick={() => navigate('/mygap')}>
                        <div className="udp-explore-icon"><CheckSquare size={24} /></div>
                        <span className="udp-explore-label">{t('home.mygapTitle') || 'myGAP Guide'}</span>
                    </button>
                    <button className="udp-explore-card" onClick={() => navigate('/encyclopedia')}>
                        <div className="udp-explore-icon"><Info size={24} /></div>
                        <span className="udp-explore-label">{t('home.keyInfo') || 'Crop Advisor'}</span>
                    </button>
                    <button className="udp-explore-card" onClick={() => navigate('/guide')}>
                        <div className="udp-explore-icon"><BookOpen size={24} /></div>
                        <span className="udp-explore-label">{t('settings.guide') || 'User Guide'}</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default OverviewTab;
