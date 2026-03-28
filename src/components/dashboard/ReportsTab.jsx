import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart2, BrainCircuit, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import SectionHeader from './SectionHeader';

const QUALITY_COLORS = {
    Excellent: '#10b981',
    Good: '#3b82f6',
    Fair: '#f59e0b',
    Poor: '#ef4444',
};

const ReportsTab = ({
    t,
    stats,
    checklistPct,
    alerts,
    acknowledgedIds,
    notes,
    plots,
    onGenerateInsights,
    generatingInsights,
    aiInsights,
    onSelectAlert,
    relDate,
}) => {
    const [selectedPlotId, setSelectedPlotId] = useState('all');
    const locale = t('common.dateLocale') || 'en-MY';
    const localizeQuality = (quality) => {
        const qualityKey = {
            Excellent: 'profile.qualityExcellent',
            Good: 'profile.qualityGood',
            Fair: 'profile.qualityFair',
            Poor: 'profile.qualityPoor',
        }[quality];
        return qualityKey ? (t(qualityKey) || quality) : quality;
    };
    const localizeExpenseCategory = (category) => {
        const categoryKey = {
            Fertilizer: 'profile.catFertilizer',
            Pesticide: 'profile.catPesticide',
            Labor: 'profile.catLabor',
            Equipment: 'profile.catEquipment',
            Other: 'profile.catOther',
        }[category];
        return categoryKey ? (t(categoryKey) || category) : category;
    };

    const healthRate = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;
    const activeAlerts = useMemo(
        () => alerts.filter((scan) => !acknowledgedIds.includes(scan.id)),
        [acknowledgedIds, alerts],
    );
    const filteredNotes = useMemo(
        () => (selectedPlotId === 'all' ? notes : notes.filter((note) => note.plot_id === selectedPlotId)),
        [notes, selectedPlotId],
    );
    const harvestLogs = useMemo(
        () => filteredNotes.filter((note) => note.activity_type === 'harvest'),
        [filteredNotes],
    );

    const totalKg = harvestLogs.reduce((sum, note) => sum + (Number(note.kg_harvested) || 0), 0);
    const totalRevenue = harvestLogs.reduce((sum, note) => sum + ((Number(note.kg_harvested) || 0) * (Number(note.price_per_kg) || 0)), 0);
    const totalExpenses = filteredNotes.reduce((sum, note) => sum + (Number(note.expense_amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const qualityCounts = { Excellent: 0, Good: 0, Fair: 0, Poor: 0 };
    harvestLogs.forEach((note) => {
        if (note.quality_grade && qualityCounts[note.quality_grade] !== undefined) {
            qualityCounts[note.quality_grade] += 1;
        }
    });

    const expenseCounts = {};
    filteredNotes.forEach((note) => {
        if (!note.expense_amount) return;
        const category = note.expense_category || 'Other';
        expenseCounts[category] = (expenseCounts[category] || 0) + Number(note.expense_amount);
    });

    const expenseData = Object.keys(expenseCounts).map((name) => ({
        name,
        label: localizeExpenseCategory(name),
        value: expenseCounts[name],
        fill: name === 'Fertilizer' ? '#10b981' : name === 'Pesticide' ? '#f59e0b' : name === 'Labor' ? '#3b82f6' : name === 'Equipment' ? '#8b5cf6' : '#64748b',
    })).sort((left, right) => right.value - left.value);

    const healthData = [
        { name: t('results.healthy') || 'Healthy', value: stats.healthy, color: '#10b981' },
        { name: t('profile.diseased') || 'Diseased', value: stats.diseases, color: '#f59e0b' },
    ].filter((entry) => entry.value > 0);

    const qualityData = Object.keys(qualityCounts).map((name) => ({
        name: localizeQuality(name),
        count: qualityCounts[name],
        fill: QUALITY_COLORS[name] || '#ef4444',
    })).filter((entry) => entry.count > 0);

    const yieldChartData = useMemo(() => {
        const byMonth = {};
        filteredNotes.filter((note) => note.activity_type === 'harvest').forEach((note) => {
            const date = new Date(note.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
            if (!byMonth[key]) byMonth[key] = { key, month: label, kg: 0 };
            byMonth[key].kg += Number(note.kg_harvested) || 0;
        });

        const sorted = Object.values(byMonth).sort((left, right) => left.key.localeCompare(right.key));
        if (sorted.length < 2) {
            return {
                data: sorted.map(({ key, ...entry }) => entry),
                forecast: null,
            };
        }

        const count = sorted.length;
        const sumX = sorted.reduce((sum, _item, index) => sum + index, 0);
        const sumY = sorted.reduce((sum, item) => sum + item.kg, 0);
        const sumXY = sorted.reduce((sum, item, index) => sum + (index * item.kg), 0);
        const sumX2 = sorted.reduce((sum, _item, index) => sum + (index * index), 0);
        const slope = (count * sumXY - sumX * sumY) / (count * sumX2 - sumX * sumX) || 0;
        const intercept = (sumY - slope * sumX) / count;
        const forecastKg = Math.max(0, Math.round(slope * count + intercept));

        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);

        return {
            data: [
                ...sorted.map(({ key, ...entry }) => entry),
                { month: nextDate.toLocaleDateString(locale, { month: 'short', year: '2-digit' }), kg: null, forecast: forecastKg },
            ],
            forecast: forecastKg,
        };
    }, [filteredNotes, locale]);

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
                                        {healthData.map((entry, index) => <Cell key={`health-${index}`} fill={entry.color} />)}
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
                    action={(
                        <select className="udp-input" style={{ width: 130, padding: 4, height: 26, fontSize: '0.75rem', borderRadius: 6 }} value={selectedPlotId} onChange={(event) => setSelectedPlotId(event.target.value)}>
                            <option value="all">{t('profile.allPlots') || 'All Plots'}</option>
                            {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
                        </select>
                    )}
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
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: netProfit >= 0 ? '#059669' : '#e11d48' }}>{netProfit >= 0 ? '+' : '-'}RM{Math.abs(netProfit).toFixed(2)}</span>
                    </div>

                    {yieldChartData.data.length >= 2 && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>📈 {t('profile.yieldHistoryForecast') || 'Yield History & AI Forecast'}</div>
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
                                        <RechartsTooltip formatter={(value, name) => [value ? `${value} kg` : '-', name === 'kg' ? (t('profile.actual') || 'Actual') : (t('profile.forecast') || 'Forecast')]} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="kg" name={t('profile.actual') || 'Actual'} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                                        <Line type="monotone" dataKey="forecast" name={t('profile.forecast') || 'Forecast'} stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 5, fill: '#3b82f6' }} />
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
                                            {expenseData.map((entry, index) => <Cell key={`expense-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                        <RechartsTooltip formatter={(value) => `RM${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: 600, marginTop: '4px' }}>
                                {expenseData.map((entry) => <span key={entry.name} style={{ color: entry.fill }}>● {entry.label}: RM{entry.value}</span>)}
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

            <div className="udp-section">
                <SectionHeader
                    icon={<BrainCircuit size={15} color="#8b5cf6" />}
                    title={t('profile.aiFarmIntelligence') || 'AI Farm Intelligence'}
                    action={<button className="udp-see-all" style={{ color: '#8b5cf6', background: '#f5f3ff', padding: '4px 10px', borderRadius: '12px' }} onClick={() => onGenerateInsights(activeAlerts, harvestLogs)} disabled={generatingInsights}>{generatingInsights ? (t('common.analyzing') || 'Analyzing...') : <><Sparkles size={13} /> {t('profile.askAI') || 'Ask AI'}</>}</button>}
                />
                <div style={{ padding: '0 16px 16px' }}>
                    {generatingInsights ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px', color: '#8b5cf6' }}>
                            <BrainCircuit size={28} style={{ animation: 'pulse 1.5s infinite' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('profile.aiAnalyzingHint') || 'Analyzing logs & alerts...'}</span>
                        </div>
                    ) : aiInsights ? (
                        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '16px' }}>
                            <p style={{ fontSize: '0.85rem', color: '#4c1d95', margin: '0 0 12px', lineHeight: 1.5 }}><strong>{t('profile.aiSummary') || 'Summary'}:</strong> {aiInsights.summary}</p>
                            {aiInsights.yieldAnalysis && <p style={{ fontSize: '0.8rem', color: '#5b21b6', margin: '0 0 12px', borderLeft: '3px solid #8b5cf6', paddingLeft: '8px' }}>{aiInsights.yieldAnalysis}</p>}
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', marginBottom: '8px', textTransform: 'uppercase' }}>{t('profile.aiRecommendations') || 'Actionable Recommendations'}</div>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#4c1d95', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {aiInsights.recommendations?.map((recommendation, index) => <li key={index}>{recommendation}</li>)}
                            </ul>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>{t('profile.aiAskHint') || 'Tap "Ask AI" to get a personalized weekly agronomist report based on your farm activity.'}</div>
                    )}
                </div>
            </div>

            {activeAlerts.length > 0 && (
                <div className="udp-section">
                    <SectionHeader icon={<AlertTriangle size={15} />} title={t('profile.activeAlerts') || 'Active Alerts (Last 7 Days)'} />
                    {activeAlerts.map((scan) => (
                        <button key={scan.id} className="udp-alert-row" onClick={() => onSelectAlert(scan)}>
                            <span className="udp-alert-dot" />
                            <div className="udp-scan-info">
                                <span className="udp-scan-name">{scan.disease}</span>
                                <span className="udp-scan-cat">{scan.category} · {(scan.severity ?? '').toUpperCase()} · {relDate(scan.timestamp ?? scan.created_at, t)}</span>
                            </div>
                            <ChevronRight size={13} className="udp-chevron" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReportsTab;
