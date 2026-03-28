import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Info, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n';

const ComplianceCalendar = ({ events = [] }) => {
    const { t } = useLanguage();
    const [viewDate, setViewDate] = useState(new Date());

    const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const locale = t('common.dateLocale') || (t('common.madeInMY') === 'Proudly made in MALAYSIA' ? 'en-US' : 'ms-MY');
    const monthName = viewDate.toLocaleString(locale, { month: 'long' });

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

    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    return (
        <div className="comp-cal" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{monthName} {year}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => changeMonth(-1)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.background = 'white'}><ChevronLeft size={16} /></button>
                    <button onClick={() => changeMonth(1)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.background = 'white'}><ChevronRight size={16} /></button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0', background: 'white' }}>
                {['S','M','T','W','T','F','S'].map(d => (
                    <div key={d} style={{ textAlign: 'center', padding: '12px 0', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>{d}</div>
                ))}
                {calendarDays.map((d, i) => {
                    const isToday = d?.dateStr === todayStr;
                    return (
                        <div key={i} style={{ 
                            minHeight: '50px', position: 'relative', 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            borderBottom: '1px solid #f8fafc',
                            borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid #f8fafc',
                            background: isToday ? '#f0fdf4' : 'transparent'
                        }}>
                            {d && (
                                <>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        fontWeight: 700, 
                                        color: isToday ? '#10b981' : (d.events.length > 0 ? '#1e293b' : '#94a3b8'), 
                                        zIndex: 1 
                                    }}>
                                        {d.day}
                                    </span>
                                    {d.events.length > 0 && (
                                        <div style={{ 
                                            width: '4px', height: '4px', borderRadius: '50%', 
                                            background: getDayColor(d.events),
                                            marginTop: '4px'
                                        }} />
                                    )}
                                    {isToday && (
                                        <div style={{ position: 'absolute', top: '4px', right: '4px', width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} /> {t('profile.actHarvest') || 'Harvest'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} /> {t('profile.actSpray') || 'Spray'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6' }} /> {t('profile.actScout') || 'Scout'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8' }} /> {t('profile.totalScans') || 'Scan'}</div>
            </div>
        </div>
    );
};

export default ComplianceCalendar;
