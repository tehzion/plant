import { BarChart2, TrendingUp } from 'lucide-react';
import { Bar } from 'recharts/es6/cartesian/Bar.js';
import { BarChart } from 'recharts/es6/chart/BarChart.js';
import { CartesianGrid } from 'recharts/es6/cartesian/CartesianGrid.js';
import { Cell } from 'recharts/es6/component/Cell.js';
import { Line } from 'recharts/es6/cartesian/Line.js';
import { LineChart } from 'recharts/es6/chart/LineChart.js';
import { Pie } from 'recharts/es6/polar/Pie.js';
import { PieChart } from 'recharts/es6/chart/PieChart.js';
import { ResponsiveContainer } from 'recharts/es6/component/ResponsiveContainer.js';
import { Tooltip as RechartsTooltip } from 'recharts/es6/component/Tooltip.js';
import { XAxis } from 'recharts/es6/cartesian/XAxis.js';
import { YAxis } from 'recharts/es6/cartesian/YAxis.js';
import SectionHeader from './SectionHeader';

const ReportsCharts = ({
  label,
  stats,
  healthData,
  plots,
  selectedPlotId,
  onSelectPlot,
  totalKg,
  totalRevenue,
  totalExpenses,
  netProfit,
  yieldChartData,
  expenseData,
  harvestLogs,
  qualityData,
}) => (
  <>
    <div className="udp-section rep-chart-card" style={{ marginTop: 0 }}>
      <SectionHeader icon={<BarChart2 size={15} />} title={label('profile.healthBreakdown', 'Health Breakdown')} />
      <div className="rep-chart-body">
        {healthData.length > 0 ? (
          <div className="rep-chart-figure" style={{ height: 220, minHeight: 220 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={healthData} innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {healthData.map((entry, index) => <Cell key={`health-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="rep-chart-legend" style={{ marginTop: '0.5rem' }}>
              <span className="rep-chart-legend-item" style={{ color: '#10b981' }}>
                <span className="rep-chart-legend-dot" style={{ background: '#10b981' }} />
                {label('profile.healthy', 'Healthy')}: {stats.healthy}
              </span>
              <span className="rep-chart-legend-item" style={{ color: '#f59e0b' }}>
                <span className="rep-chart-legend-dot" style={{ background: '#f59e0b' }} />
                {label('profile.diseased', 'Diseased')}: {stats.diseases}
              </span>
            </div>
          </div>
        ) : (
          <div className="rep-chart-empty">{label('profile.noScanData', 'No scan data available')}</div>
        )}
      </div>
    </div>

    <div className="udp-section rep-chart-card">
      <SectionHeader
        icon={<TrendingUp size={15} />}
        title={label('profile.harvestSummary', 'Financial & Yield Summary')}
        action={(
          <select
            className="udp-input"
            style={{ width: 130, padding: 4, height: 26, fontSize: '0.75rem', borderRadius: 6 }}
            value={selectedPlotId}
            onChange={(event) => onSelectPlot(event.target.value)}
          >
            <option value="all">{label('profile.allPlots', 'All Plots')}</option>
            {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
          </select>
        )}
      />
      <div className="rep-chart-body">
        <div className="rep-metric-strip">
          <div className="rep-metric-chip">
            <div className="rep-metric-label">{label('profile.totalYield', 'Total Yield')}</div>
            <div className="rep-metric-value">{totalKg.toFixed(1)}kg</div>
          </div>
          <div className="rep-metric-chip">
            <div className="rep-metric-label">{label('profile.estRevenue', 'Est. Revenue')}</div>
            <div className="rep-metric-value rep-metric-value--positive">RM{totalRevenue.toFixed(0)}</div>
          </div>
          <div className="rep-metric-chip rep-metric-chip--expense">
            <div className="rep-metric-label">{label('profile.expenses', 'Expenses')}</div>
            <div className="rep-metric-value rep-metric-value--negative">-RM{totalExpenses.toFixed(0)}</div>
          </div>
        </div>

        <div className={`rep-profit-card ${netProfit >= 0 ? 'is-positive' : 'is-negative'}`}>
          <span className="rep-profit-label">{label('profile.netProfit', 'Net Profit (ROI)')}</span>
          <span className="rep-profit-value">{netProfit >= 0 ? '+' : '-'}RM{Math.abs(netProfit).toFixed(2)}</span>
        </div>

        {yieldChartData.data.length >= 2 ? (
          <div className="rep-chart-block">
            <div className="rep-chart-title">{label('profile.yieldHistoryForecast', 'Yield History & Trend Forecast')}</div>
            {yieldChartData.forecast !== null && (
              <div className="rep-forecast-banner">
                <TrendingUp size={18} color="#3b82f6" />
                <div>
                  <div className="rep-forecast-label">{label('profile.aiForecastNextMonth', 'Trend Forecast: Next Month')}</div>
                  <div className="rep-forecast-value">~{yieldChartData.forecast} kg</div>
                </div>
                <div className="rep-forecast-meta">{label('profile.basedOnHarvestTrends', 'Based on harvest trends')}</div>
              </div>
            )}
            <div className="rep-chart-figure" style={{ height: 180, minHeight: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yieldChartData.data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    formatter={(value, name) => [value ? `${value} kg` : '-', name === 'kg' ? label('profile.actual', 'Actual') : label('profile.forecast', 'Forecast')]}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="kg" name={label('profile.actual', 'Actual')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" name={label('profile.forecast', 'Forecast')} stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 5, fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="rep-chart-empty-card">
            <div className="rep-chart-title">{label('profile.yieldHistoryForecast', 'Yield History & Trend Forecast')}</div>
            <div className="rep-chart-empty-copy">
              {label('profile.yieldForecastNeedsMoreData', 'Add harvest records from at least two months to unlock a reliable trend forecast.')}
            </div>
          </div>
        )}

        {expenseData.length > 0 && (
          <div className="rep-chart-block">
            <div className="rep-chart-title">{label('profile.expenseBreakdown', 'Expense Breakdown')}</div>
            <div className="rep-chart-figure" style={{ height: 220, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={expenseData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                    {expenseData.map((entry, index) => <Cell key={`expense-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `RM${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="rep-chart-legend" style={{ marginTop: '0.25rem' }}>
              {expenseData.map((entry) => (
                <span key={entry.name} className="rep-chart-legend-item" style={{ color: entry.fill }}>
                  <span className="rep-chart-legend-dot" style={{ background: entry.fill }} />
                  {entry.label}: RM{entry.value}
                </span>
              ))}
            </div>
          </div>
        )}

        {harvestLogs.length > 0 && qualityData.length > 0 && (
          <div className="rep-chart-block">
            <div className="rep-chart-title">{label('profile.qualityBreakdown', 'Quality Breakdown')}</div>
            <div className="rep-chart-figure" style={{ height: 200, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualityData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
                    {qualityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Grade A' ? '#10b981' : entry.name === 'Grade B' ? '#3b82f6' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  </>
);

export default ReportsCharts;
