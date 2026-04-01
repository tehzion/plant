import { useLanguage } from '../../i18n/i18n.jsx';
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    CloudRain,
    Sun,
    ThermometerSun,
    Droplets,
} from 'lucide-react';

const STATUS = {
    good: { Icon: CheckCircle2, labelKey: 'common.good' },
    caution: { Icon: AlertTriangle, labelKey: 'common.caution' },
    warning: { Icon: XCircle, labelKey: 'common.warning' },
};

const dayLabel = (dateStr, index, t, locale) => {
    if (index === 0) return t('common.today');
    if (index === 1) return t('common.tomorrow');
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
};

const ContextIcon = ({ precip, uvIndex, tempMax, humidity }) => {
    if (precip > 8) return <CloudRain size={14} />;
    if (uvIndex > 9) return <Sun size={14} />;
    if (tempMax > 36) return <ThermometerSun size={14} />;
    if (humidity < 50) return <Droplets size={14} />;
    return <CheckCircle2 size={14} />;
};

const FarmingNotices = ({ forecast = [] }) => {
    const { t, label } = useLanguage();

    if (!forecast || forecast.length === 0) return null;

    const today = forecast[0];
    const todayStatusKey = today?.notice?.status || 'good';
    const todayStatus = STATUS[todayStatusKey] || STATUS.good;
    const TodayIcon = todayStatus.Icon;
    const resolveNotice = (day) => t(day?.notice?.key || 'weather.noticeGood');
    const dateLocale = label('common.dateLocale', 'en-MY');

    return (
        <div className="fn-wrapper">
            <div className={`fn-today-card fn-status-${todayStatusKey}`}>
                <div className="fn-today-top">
                    <div className="fn-today-icon">
                        <TodayIcon size={18} />
                    </div>
                    <span className="fn-section-title">
                        {label('home.farmingNotices', 'Farming Notices')}
                    </span>
                    <span className="fn-status-badge">
                        {t(todayStatus.labelKey)}
                    </span>
                </div>
                <p className="fn-today-msg">{resolveNotice(today)}</p>
                <div className="fn-today-meta">
                    <span>Temp {Math.round(today.tempMax)}°C</span>
                    <span>Rain {today.precip.toFixed(1)} mm</span>
                    <span>RH {today.humidity}%</span>
                    <span>UV {today.uvIndex.toFixed(0)}</span>
                </div>
            </div>

            <div className="fn-days-list app-surface app-surface--soft">
                {forecast.slice(1).map((day, i) => {
                    const statusKey = day?.notice?.status || 'good';
                    const status = STATUS[statusKey] || STATUS.good;
                    const Icon = status.Icon;

                    return (
                        <div key={day.date} className="fn-day-row">
                            <span className="fn-day-label">{dayLabel(day.date, i + 1, t, dateLocale)}</span>
                            <ContextIcon
                                precip={day.precip}
                                uvIndex={day.uvIndex}
                                tempMax={day.tempMax}
                                humidity={day.humidity}
                            />
                            <span className="fn-day-msg">{resolveNotice(day)}</span>
                            <span className={`fn-day-badge fn-day-badge-${statusKey}`}>
                                <Icon size={10} />
                                {t(status.labelKey)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FarmingNotices;
