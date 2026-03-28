import { useLanguage } from '../../i18n/i18n.jsx';
import { CheckCircle2, AlertTriangle, XCircle, CloudRain, Sun, ThermometerSun, Droplets } from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
    good:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircle2,  labelKey: 'common.good'    },
    caution: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', Icon: AlertTriangle, labelKey: 'common.caution' },
    warning: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: XCircle,       labelKey: 'common.warning' },
};

// ── Day label helper ──────────────────────────────────────────────────────────
const dayLabel = (dateStr, index, t) => {
    if (index === 0) return t('common.today');
    if (index === 1) return t('common.tomorrow');
    const d    = new Date(dateStr);
    return d.toLocaleDateString(t('common.dateLocale') || 'en-MY', { weekday: 'short', day: 'numeric', month: 'short' });
};

// ── Icon for notice context ───────────────────────────────────────────────────
const ContextIcon = ({ precip, uvIndex, tempMax, humidity }) => {
    if (precip > 8)    return <CloudRain      size={14} />;
    if (uvIndex > 9)   return <Sun            size={14} />;
    if (tempMax > 36)  return <ThermometerSun size={14} />;
    if (humidity < 50) return <Droplets       size={14} />;
    return <CheckCircle2 size={14} />;
};

// ── Main component ────────────────────────────────────────────────────────────
const FarmingNotices = ({ forecast = [] }) => {
    const { t } = useLanguage();

    if (!forecast || forecast.length === 0) return null;

    const today    = forecast[0];
    const todayCfg = STATUS[today.notice.status];
    const TodayIcon = todayCfg.Icon;

    return (
        <div className="fn-wrapper">
            {/* ── Today's headline notice ─────────────────────────── */}
            <div
                className="fn-today-card"
                style={{ background: todayCfg.bg, borderColor: todayCfg.border }}
            >
                <div className="fn-today-top">
                    <TodayIcon size={18} color={todayCfg.color} />
                    <span className="fn-section-title" style={{ color: todayCfg.color }}>
                        {t('home.farmingNotices') || 'Farming Notices'}
                    </span>
                    <span className="fn-status-badge" style={{ background: todayCfg.color }}>
                        {t(todayCfg.labelKey)}
                    </span>
                </div>
                <p className="fn-today-msg">{today.notice.message}</p>
                <div className="fn-today-meta">
                    <span>🌡 {Math.round(today.tempMax)}°C</span>
                    <span>💧 {today.precip.toFixed(1)} mm</span>
                    <span>☁ {today.humidity}% RH</span>
                    <span>☀ UV {today.uvIndex.toFixed(0)}</span>
                </div>
            </div>

            {/* ── Upcoming days list ──────────────────────────────── */}
            <div className="fn-days-list">
                {forecast.slice(1).map((day, i) => {
                    const cfg  = STATUS[day.notice.status];
                    const Icon = cfg.Icon;
                    return (
                        <div key={day.date} className="fn-day-row">
                            <span className="fn-day-label">{dayLabel(day.date, i + 1, t)}</span>
                            <ContextIcon
                                precip={day.precip} uvIndex={day.uvIndex}
                                tempMax={day.tempMax} humidity={day.humidity}
                            />
                            <span className="fn-day-msg">{day.notice.message}</span>
                            <span className="fn-day-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                                <Icon size={10} />
                                {t(cfg.labelKey)}
                            </span>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .fn-wrapper {
                    margin: 0 0 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                /* Today card */
                .fn-today-card {
                    border: 1.5px solid;
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .fn-today-top {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .fn-section-title {
                    font-size: 0.85rem;
                    font-weight: 800;
                    flex: 1;
                }
                .fn-status-badge {
                    color: white;
                    font-size: 0.68rem;
                    font-weight: 800;
                    padding: 3px 10px;
                    border-radius: 999px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .fn-today-msg {
                    margin: 0;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #1f2937;
                    line-height: 1.4;
                }
                .fn-today-meta {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    font-size: 0.75rem;
                    color: #6b7280;
                }

                /* Upcoming days */
                .fn-days-list {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 14px;
                    overflow: hidden;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
                }
                .fn-day-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    border-bottom: 1px solid #f3f4f6;
                    font-size: 0.8rem;
                    color: #374151;
                }
                .fn-day-row:last-child { border-bottom: none; }
                .fn-day-row svg { color: #9ca3af; flex-shrink: 0; }
                .fn-day-label {
                    width: 74px;
                    flex-shrink: 0;
                    font-weight: 700;
                    color: #374151;
                    font-size: 0.75rem;
                }
                .fn-day-msg {
                    flex: 1;
                    font-size: 0.78rem;
                    color: #4b5563;
                }
                .fn-day-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    padding: 3px 8px;
                    border-radius: 999px;
                    border: 1px solid;
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    flex-shrink: 0;
                    white-space: nowrap;
                }
            `}</style>
        </div>
    );
};

export default FarmingNotices;
