import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n';

const ComplianceCalendar = ({ events = [] }) => {
    const { t, label: translateLabel } = useLanguage();
    const label = translateLabel || ((key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    });
    const [viewDate, setViewDate] = useState(new Date());

    const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const locale = t('common.dateLocale') || (t('common.madeInMY') === 'Proudly made in MALAYSIA' ? 'en-US' : 'ms-MY');
    const monthName = viewDate.toLocaleString(locale, { month: 'long' });
    const weekDays = Array.from({ length: 7 }, (_, index) => (
        new Date(2021, 7, 1 + index).toLocaleDateString(locale, { weekday: 'short' })
    ));
    const legendItems = [
        { key: 'harvest', color: '#10b981', label: t('profile.actHarvest') || 'Harvest' },
        { key: 'spray', color: '#f59e0b', label: t('profile.actSpray') || 'Spray' },
        { key: 'scout', color: '#3b82f6', label: t('profile.actScout') || 'Scout' },
        { key: 'scan', color: '#94a3b8', label: t('profile.totalScans') || 'Scan' },
    ];

    const calendarDays = useMemo(() => {
        const days = [];
        const count = daysInMonth(month, year);
        const firstDay = (firstDayOfMonth(month, year) || 0);

        const getLocalDate = (d) => {
            if (!d) return '';
            const date = new Date(d);
            if (isNaN(date.getTime())) return '';
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        for (let i = 0; i < firstDay; i++) days.push(null);

        for (let i = 1; i <= count; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayEvents = events.filter(e => {
                const eventDate = getLocalDate(e.created_at || e.timestamp);
                return eventDate === dateStr;
            });
            days.push({ day: i, dateStr, events: dayEvents });
        }
        return days;
    }, [month, year, events]);

    const changeMonth = (offset) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const getDayColor = (dayEvents) => {
        if (dayEvents.length === 0) return 'transparent';
        const types = dayEvents.map(e => e.activity_type || e.type || 'scan');
        if (types.includes('harvest')) return '#10b981'; // Green (Priority 1)
        if (types.includes('spray')) return '#f59e0b';   // Orange (Priority 2)
        if (types.includes('scout') || types.includes('inspect')) return '#3b82f6'; // Blue (Priority 3)
        return '#94a3b8'; // Gray (Priority 4)
    };

    const getEventLabel = (event) => {
        const type = event.activity_type || event.type || 'scan';
        return legendItems.find((item) => item.key === type)?.label || type;
    };

    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    return (
        <div className="comp-cal">
            <div className="comp-cal-header">
                <h3 className="comp-cal-title" aria-live="polite">{monthName} {year}</h3>
                <div className="comp-cal-nav">
                    <button
                        type="button"
                        className="comp-cal-nav-btn"
                        onClick={() => changeMonth(-1)}
                        aria-label={label('common.previousMonth', 'Previous month')}
                        title={label('common.previousMonth', 'Previous month')}
                    >
                        <ChevronLeft size={16} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="comp-cal-nav-btn"
                        onClick={() => changeMonth(1)}
                        aria-label={label('common.nextMonth', 'Next month')}
                        title={label('common.nextMonth', 'Next month')}
                    >
                        <ChevronRight size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="comp-cal-grid" role="grid" aria-label={`${monthName} ${year}`}>
                {weekDays.map((day, index) => (
                    <div key={`${monthName}-${index}`} className="comp-cal-weekday" role="columnheader">{day}</div>
                ))}
                {calendarDays.map((d, i) => {
                    const isToday = d?.dateStr === todayStr;
                    const eventLabels = d?.events.map(getEventLabel) || [];
                    const dayLabel = d
                        ? `${d.day} ${monthName} ${year}${eventLabels.length ? `: ${eventLabels.join(', ')}` : `: ${label('mygap.noEvents', 'No recorded activities')}`}`
                        : '';
                    return (
                        <div
                            key={i}
                            className={`comp-cal-day ${isToday ? 'is-today' : ''} ${((i + 1) % 7 === 0) ? 'is-week-end' : ''}`}
                            role={d ? 'gridcell' : undefined}
                            aria-label={d ? dayLabel : undefined}
                            title={d ? dayLabel : undefined}
                            aria-hidden={d ? undefined : true}
                        >
                            {d && (
                                <>
                                    <span className={`comp-cal-day-number ${isToday ? 'is-today' : ''} ${d.events.length > 0 ? 'has-events' : 'is-muted'}`}>
                                        {d.day}
                                    </span>
                                    {d.events.length > 0 && (
                                        <div className="comp-cal-event-dot" aria-hidden="true" style={{ '--comp-dot': getDayColor(d.events) }} />
                                    )}
                                    {isToday && (
                                        <div className="comp-cal-today-dot" aria-hidden="true" />
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="comp-cal-legend">
                {legendItems.map((item) => (
                    <div key={item.key} className="comp-cal-legend-item">
                        <div className="comp-cal-legend-dot" aria-hidden="true" style={{ '--comp-dot': item.color }} />
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ComplianceCalendar;
