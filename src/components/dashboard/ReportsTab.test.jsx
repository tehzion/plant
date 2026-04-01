import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportsTab from './ReportsTab.jsx';

const t = (key) => ({
    'common.dateLocale': 'en-MY',
    'profile.allPlots': 'All Plots',
    'profile.viewSummary': 'View summary',
    'profile.openBrief': 'Open brief',
    'profile.farmSummaryHint': 'Farm summary hint',
    'profile.yieldHistoryForecast': 'Yield History & Trend Forecast',
    'profile.yieldForecastNeedsMoreData': 'Need more harvest data',
}[key] || key);

vi.mock('lucide-react', async () => {
    const React = await import('react');
    const Icon = ({ children, ...props }) => React.createElement('svg', props, children);
    return {
        AlertTriangle: Icon,
        Calendar: Icon,
        BarChart3: Icon,
        BarChart2: Icon,
        BrainCircuit: Icon,
        ScanLine: Icon,
        Microscope: Icon,
        FlaskConical: Icon,
        Wheat: Icon,
        MapPin: Icon,
        ShieldCheck: Icon,
        ChevronRight: Icon,
        DollarSign: Icon,
        Leaf: Icon,
        Sparkles: Icon,
        Sprout: Icon,
    };
});

vi.mock('./ReportsCharts.jsx', () => ({
    default: ({ label, plots, selectedPlotId, onSelectPlot, yieldChartData }) => (
        <div data-testid="reports-charts">
            <select value={selectedPlotId} onChange={(event) => onSelectPlot(event.target.value)}>
                <option value="all">{label('profile.allPlots', 'All Plots')}</option>
                {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
            </select>
            {yieldChartData.data.length < 2 && (
                <div>{label('profile.yieldForecastNeedsMoreData', 'Need more harvest data')}</div>
            )}
        </div>
    ),
}));

describe('ReportsTab', () => {
    it('scopes AI insight requests to the selected plot context', async () => {
        const onGenerateInsights = vi.fn();

        render(
            <ReportsTab
                t={t}
                stats={{ total: 0, healthy: 0, diseases: 0 }}
                checklistPct={0}
                alerts={[
                    { id: 'alert-a', plot_id: 'plot-a', disease: 'Leaf spot', category: 'Durian' },
                    { id: 'alert-b', plot_id: 'plot-b', disease: 'Anthracnose', category: 'Mango' },
                ]}
                acknowledgedIds={[]}
                notes={[
                    { id: 'note-a-1', plot_id: 'plot-a', activity_type: 'harvest', kg_harvested: 20, created_at: '2026-03-10T00:00:00.000Z' },
                    { id: 'note-a-2', plot_id: 'plot-a', activity_type: 'spray', created_at: '2026-03-11T00:00:00.000Z' },
                    { id: 'note-b-1', plot_id: 'plot-b', activity_type: 'harvest', kg_harvested: 40, created_at: '2026-03-12T00:00:00.000Z' },
                ]}
                plots={[
                    { id: 'plot-a', name: 'Plot A', cropType: 'Durian' },
                    { id: 'plot-b', name: 'Plot B', cropType: 'Mango' },
                ]}
                onGenerateInsights={onGenerateInsights}
                generatingInsights={false}
                generatingInsightsScopeKey={null}
                aiInsights={null}
                onSelectAlert={vi.fn()}
                relDate={() => 'Today'}
            />,
        );

        fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'plot-a' } });
        fireEvent.click(screen.getByRole('button', { name: /open brief/i }));

        expect(onGenerateInsights).toHaveBeenCalledWith(
            expect.objectContaining({
                scopeKey: 'reports:plot-a',
                notesOverride: [
                    expect.objectContaining({ id: 'note-a-1' }),
                    expect.objectContaining({ id: 'note-a-2' }),
                ],
                harvestLogs: [expect.objectContaining({ id: 'note-a-1' })],
                plotsOverride: [expect.objectContaining({ id: 'plot-a' })],
                activeAlerts: [expect.objectContaining({ id: 'alert-a' })],
            }),
        );
    });

    it('shows a localized fallback when trend data is insufficient', async () => {
        render(
            <ReportsTab
                t={t}
                stats={{ total: 0, healthy: 0, diseases: 0 }}
                checklistPct={0}
                alerts={[]}
                acknowledgedIds={[]}
                notes={[
                    { id: 'note-a-1', plot_id: 'plot-a', activity_type: 'harvest', kg_harvested: 20, created_at: '2026-03-10T00:00:00.000Z' },
                ]}
                plots={[
                    { id: 'plot-a', name: 'Plot A', cropType: 'Durian' },
                ]}
                onGenerateInsights={vi.fn()}
                generatingInsights={false}
                generatingInsightsScopeKey={null}
                aiInsights={null}
                onSelectAlert={vi.fn()}
                relDate={() => 'Today'}
            />,
        );

        expect(await screen.findByText('Need more harvest data')).toBeInTheDocument();
    });
});
