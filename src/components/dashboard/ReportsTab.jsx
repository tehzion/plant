import { Suspense, useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, ChevronRight, Sparkles } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import SectionHeader from './SectionHeader';
import { lazyWithRetry } from '../../utils/lazyWithRetry.js';

const QUALITY_COLORS = {
    Excellent: '#10b981',
    Good: '#3b82f6',
    Fair: '#f59e0b',
    Poor: '#ef4444',
};

const ReportsCharts = lazyWithRetry(
    () => import('./ReportsCharts.jsx'),
    'dashboard-reports-charts',
);

const REPORTS_CHARTS_FALLBACK = (
    <div style={{ minHeight: 320 }}>
        <LoadingSpinner />
    </div>
);

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
    generatingInsightsScopeKey,
    aiInsights,
    onSelectAlert,
    relDate,
    label: labelProp,
}) => {
    const label = (key, fallback) => {
        if (typeof labelProp === 'function') return labelProp(key, fallback);
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    const [selectedPlotId, setSelectedPlotId] = useState('all');
    const locale = label('common.dateLocale', 'en-MY');

    const selectedPlot = useMemo(
        () => plots.find((plot) => plot.id === selectedPlotId) || null,
        [plots, selectedPlotId],
    );

    const localizeQuality = (quality) => {
        const qualityKey = {
            Excellent: 'profile.qualityExcellent',
            Good: 'profile.qualityGood',
            Fair: 'profile.qualityFair',
            Poor: 'profile.qualityPoor',
        }[quality];
        return qualityKey ? label(qualityKey, quality) : quality;
    };

    const localizeExpenseCategory = (category) => {
        const categoryKey = {
            Fertilizer: 'profile.catFertilizer',
            Pesticide: 'profile.catPesticide',
            Labor: 'profile.catLabor',
            Equipment: 'profile.catEquipment',
            Other: 'profile.catOther',
        }[category];
        return categoryKey ? label(categoryKey, category) : category;
    };

    const healthRate = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;

    const activeAlerts = useMemo(
        () => alerts.filter((scan) => !acknowledgedIds.includes(scan.id)),
        [acknowledgedIds, alerts],
    );

    const filteredPlots = useMemo(
        () => (selectedPlotId === 'all' ? plots : plots.filter((plot) => plot.id === selectedPlotId)),
        [plots, selectedPlotId],
    );

    const filteredNotes = useMemo(
        () => (selectedPlotId === 'all' ? notes : notes.filter((note) => note.plot_id === selectedPlotId)),
        [notes, selectedPlotId],
    );

    const filteredAlerts = useMemo(() => {
        if (selectedPlotId === 'all') return activeAlerts;

        const cropNeedle = selectedPlot?.cropType?.trim().toLowerCase();
        return activeAlerts.filter((scan) => {
            if (scan.plot_id) {
                return scan.plot_id === selectedPlotId;
            }

            if (!cropNeedle) return false;

            const haystack = [
                scan.cropType,
                scan.plantType,
                scan.category,
                scan.name,
                scan.disease,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(cropNeedle);
        });
    }, [activeAlerts, selectedPlot, selectedPlotId]);

    const harvestLogs = useMemo(
        () => filteredNotes.filter((note) => note.activity_type === 'harvest'),
        [filteredNotes],
    );

    const reportScopeKey = `reports:${selectedPlotId}`;
    const scopedAiInsights = aiInsights?.scopeKey === reportScopeKey ? aiInsights : null;
    const isGeneratingScopedInsights = generatingInsights && generatingInsightsScopeKey === reportScopeKey;

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

    const expenseData = Object.keys(expenseCounts)
        .map((name) => ({
            name,
            label: localizeExpenseCategory(name),
            value: expenseCounts[name],
            fill: name === 'Fertilizer'
                ? '#10b981'
                : name === 'Pesticide'
                    ? '#f59e0b'
                    : name === 'Labor'
                        ? '#3b82f6'
                        : name === 'Equipment'
                            ? '#8b5cf6'
                            : '#64748b',
        }))
        .sort((left, right) => right.value - left.value);

    const healthData = [
        { name: label('results.healthy', 'Healthy'), value: stats.healthy, color: '#10b981' },
        { name: label('profile.diseased', 'Diseased'), value: stats.diseases, color: '#f59e0b' },
    ].filter((entry) => entry.value > 0);

    const qualityData = Object.keys(qualityCounts)
        .map((name) => ({
            name: localizeQuality(name),
            count: qualityCounts[name],
            fill: QUALITY_COLORS[name] || '#ef4444',
        }))
        .filter((entry) => entry.count > 0);

    const yieldChartData = useMemo(() => {
        const byMonth = {};
        filteredNotes
            .filter((note) => note.activity_type === 'harvest')
            .forEach((note) => {
                const date = new Date(note.created_at);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthLabel = date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
                if (!byMonth[key]) byMonth[key] = { key, month: monthLabel, kg: 0 };
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
                    <span className="udp-report-label">{label('profile.healthRate', 'Plant Health Rate')}</span>
                </div>
                <div className="udp-report-card">
                    <span className="udp-report-num udp-stat-warn">{stats.diseases}</span>
                    <span className="udp-report-label">{label('profile.diseasesFound', 'Diseases')}</span>
                </div>
                <div className="udp-report-card">
                    <span className="udp-report-num">{stats.total}</span>
                    <span className="udp-report-label">{label('profile.totalScans', 'Total Scans')}</span>
                </div>
                <div className="udp-report-card">
                    <span className="udp-report-num udp-stat-green">{checklistPct}%</span>
                    <span className="udp-report-label">{label('profile.gapCompliance', 'GAP Compliance')}</span>
                </div>
            </div>

            <Suspense fallback={REPORTS_CHARTS_FALLBACK}>
                <ReportsCharts
                    label={label}
                    stats={stats}
                    checklistPct={checklistPct}
                    healthData={healthData}
                    plots={plots}
                    selectedPlotId={selectedPlotId}
                    onSelectPlot={setSelectedPlotId}
                    totalKg={totalKg}
                    totalRevenue={totalRevenue}
                    totalExpenses={totalExpenses}
                    netProfit={netProfit}
                    yieldChartData={yieldChartData}
                    expenseData={expenseData}
                    harvestLogs={harvestLogs}
                    qualityData={qualityData}
                />
            </Suspense>

            <div className="udp-section">
                <SectionHeader
                    icon={<BrainCircuit size={15} color="#8b5cf6" />}
                    title={label('profile.aiFarmIntelligence', 'AI Farm Intelligence')}
                    action={(
                        <button
                            className="udp-see-all"
                            style={{ color: '#8b5cf6', background: '#f5f3ff', padding: '4px 10px', borderRadius: '12px' }}
                            onClick={() => onGenerateInsights({
                                activeAlerts: filteredAlerts,
                                harvestLogs,
                                notesOverride: filteredNotes,
                                plotsOverride: filteredPlots,
                                scopeKey: reportScopeKey,
                            })}
                            disabled={isGeneratingScopedInsights}
                        >
                            {isGeneratingScopedInsights ? label('common.analyzing', 'Analyzing...') : <><Sparkles size={13} /> {label('profile.askAI', 'Ask AI')}</>}
                        </button>
                    )}
                />
                <div style={{ padding: '0 16px 16px' }}>
                    {isGeneratingScopedInsights ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px', color: '#8b5cf6' }}>
                            <BrainCircuit size={28} style={{ animation: 'pulse 1.5s infinite' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label('profile.aiAnalyzingHint', 'Analyzing logs & alerts...')}</span>
                        </div>
                    ) : scopedAiInsights ? (
                        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '16px' }}>
                            <p style={{ fontSize: '0.85rem', color: '#4c1d95', margin: '0 0 12px', lineHeight: 1.5 }}>
                                <strong>{label('profile.aiSummary', 'Summary')}:</strong> {scopedAiInsights.summary}
                            </p>
                            {scopedAiInsights.yieldAnalysis && (
                                <p style={{ fontSize: '0.8rem', color: '#5b21b6', margin: '0 0 12px', borderLeft: '3px solid #8b5cf6', paddingLeft: '8px' }}>
                                    {scopedAiInsights.yieldAnalysis}
                                </p>
                            )}
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', marginBottom: '8px', textTransform: 'uppercase' }}>{label('profile.aiRecommendations', 'Actionable Recommendations')}</div>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#4c1d95', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {scopedAiInsights.recommendations?.map((recommendation, index) => <li key={index}>{recommendation}</li>)}
                            </ul>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>{label('profile.aiAskHint', 'Tap "Ask AI" to get a personalized weekly agronomist report based on your farm activity.')}</div>
                    )}
                </div>
            </div>

            {filteredAlerts.length > 0 && (
                <div className="udp-section">
                    <SectionHeader icon={<AlertTriangle size={15} />} title={label('profile.activeAlerts', 'Active Alerts (Last 7 Days)')} />
                    {filteredAlerts.map((scan) => (
                        <button key={scan.id} className="udp-alert-row" onClick={() => onSelectAlert(scan)}>
                            <span className="udp-alert-dot" />
                            <div className="udp-scan-info">
                                <span className="udp-scan-name">{scan.disease}</span>
                                <span className="udp-scan-cat">{scan.category} - {(scan.severity ?? '').toUpperCase()} - {relDate(scan.timestamp ?? scan.created_at, t)}</span>
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
