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
  checklistPct,
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
    <div className="udp-section" style={{ marginTop: 0 }}>
      <SectionHeader icon={<BarChart2 size={15} />} title={label('profile.healthBreakdown', 'Health Breakdown')} />
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
              <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                {label('profile.healthy', 'Healthy')}: {stats.healthy}
              </span>
              <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                {label('profile.diseased', 'Diseased')}: {stats.diseases}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>{label('profile.noScanData', 'No scan data available')}</div>
        )}
      </div>
    </div>

    <div className="udp-section">
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
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{label('profile.totalYield', 'Total Yield')}</div>
            <div style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>{totalKg.toFixed(1)}kg</div>
          </div>
          <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{label('profile.estRevenue', 'Est. Revenue')}</div>
            <div style={{ fontSize: '1.2rem', color: '#059669', fontWeight: 800 }}>RM{totalRevenue.toFixed(0)}</div>
          </div>
          <div style={{ flex: 1, background: '#fff1f2', padding: '12px', borderRadius: '8px', border: '1px solid #ffe4e6', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#be123c', fontWeight: 600, textTransform: 'uppercase' }}>{label('profile.expenses', 'Expenses')}</div>
            <div style={{ fontSize: '1.2rem', color: '#e11d48', fontWeight: 800 }}>-RM{totalExpenses.toFixed(0)}</div>
          </div>
        </div>

        <div style={{ width: '100%', background: netProfit >= 0 ? '#ecfdf5' : '#fef2f2', padding: '16px', borderRadius: '8px', border: `1px solid ${netProfit >= 0 ? '#a7f3d0' : '#fecaca'}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: netProfit >= 0 ? '#065f46' : '#991b1b', textTransform: 'uppercase' }}>{label('profile.netProfit', 'Net Profit (ROI)')}</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: netProfit >= 0 ? '#059669' : '#e11d48' }}>{netProfit >= 0 ? '+' : '-'}RM{Math.abs(netProfit).toFixed(2)}</span>
        </div>

        {yieldChartData.data.length >= 2 ? (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
              {label('profile.yieldHistoryForecast', 'Yield History & Trend Forecast')}
            </div>
            {yieldChartData.forecast !== null && (
              <div style={{ background: 'linear-gradient(90deg, #eff6ff, #f0fdf4)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="#3b82f6" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 700 }}>{label('profile.aiForecastNextMonth', 'Trend Forecast: Next Month')}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>~{yieldChartData.forecast} kg</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6b7280' }}>{label('profile.basedOnHarvestTrends', 'Based on harvest trends')}</div>
              </div>
            )}
            <div style={{ width: '100%', height: 180, minHeight: 180 }}>
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
          <div style={{ marginBottom: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
              {label('profile.yieldHistoryForecast', 'Yield History & Trend Forecast')}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
              {label('profile.yieldForecastNeedsMoreData', 'Add harvest records from at least two months to unlock a reliable trend forecast.')}
            </div>
          </div>
        )}

        {expenseData.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>{label('profile.expenseBreakdown', 'Expense Breakdown')}</div>
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
              {expenseData.map((entry) => (
                <span key={entry.name} style={{ color: entry.fill, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.fill, display: 'inline-block' }} />
                  {entry.label}: RM{entry.value}
                </span>
              ))}
            </div>
          </div>
        )}

        {harvestLogs.length > 0 && qualityData.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>{label('profile.qualityBreakdown', 'Quality Breakdown')}</div>
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
  </>
);

export default ReportsCharts;
